"""
Workflow API endpoints for ComplianceFlow.

Provides REST API for workflow execution and management.
"""

from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query, WebSocket
from fastapi.responses import JSONResponse
import json
import logging

from app.models.workflow import (
    Workflow,
    ExecutionResult,
    WorkflowNode,
    WorkflowEdge,
    NodeType,
)
from app.services.executor import WorkflowExecutionEngine, execute_workflow

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/workflows", tags=["workflows"])

# In-memory workflow storage (replace with database in production)
WORKFLOWS: Dict[str, Workflow] = {}


# ============================================================================
# Workflow Management Endpoints
# ============================================================================


@router.post("", response_model=Workflow)
async def create_workflow(workflow: Workflow) -> Workflow:
    """
    Create a new workflow.

    Args:
        workflow: Workflow definition with nodes and edges

    Returns:
        Created workflow

    Raises:
        HTTPException: If workflow is invalid
    """
    try:
        # Validate workflow structure
        engine = WorkflowExecutionEngine(workflow)
        # Try topological sort to ensure no cycles
        _ = engine.topological_sort()

        # Store workflow
        WORKFLOWS[workflow.id] = workflow
        logger.info(f"Created workflow {workflow.id}: {workflow.name}")

        return workflow

    except ValueError as e:
        logger.error(f"Invalid workflow: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating workflow: {e}")
        raise HTTPException(status_code=500, detail="Failed to create workflow")


@router.get("/{workflow_id}", response_model=Workflow)
async def get_workflow(workflow_id: str) -> Workflow:
    """
    Get a workflow by ID.

    Args:
        workflow_id: Workflow identifier

    Returns:
        Workflow definition

    Raises:
        HTTPException: If workflow not found
    """
    if workflow_id not in WORKFLOWS:
        raise HTTPException(status_code=404, detail="Workflow not found")

    return WORKFLOWS[workflow_id]


@router.get("", response_model=list[Workflow])
async def list_workflows(skip: int = Query(0, ge=0), limit: int = Query(10, ge=1, le=100)) -> list[Workflow]:
    """
    List all workflows.

    Args:
        skip: Number of workflows to skip
        limit: Maximum number of workflows to return

    Returns:
        List of workflows
    """
    workflows = list(WORKFLOWS.values())
    return workflows[skip : skip + limit]


@router.delete("/{workflow_id}")
async def delete_workflow(workflow_id: str) -> Dict[str, str]:
    """
    Delete a workflow.

    Args:
        workflow_id: Workflow identifier

    Returns:
        Confirmation message

    Raises:
        HTTPException: If workflow not found
    """
    if workflow_id not in WORKFLOWS:
        raise HTTPException(status_code=404, detail="Workflow not found")

    del WORKFLOWS[workflow_id]
    logger.info(f"Deleted workflow {workflow_id}")

    return {"message": f"Workflow {workflow_id} deleted"}


# ============================================================================
# Workflow Execution Endpoints
# ============================================================================


@router.post("/{workflow_id}/execute", response_model=ExecutionResult)
async def execute_workflow_endpoint(
    workflow_id: str,
    initial_data: Optional[Dict[str, Any]] = None,
    parallel: bool = Query(False, description="Execute nodes in parallel groups"),
    on_error: str = Query("stop", description="Error handling: 'stop' or 'continue'"),
) -> ExecutionResult:
    """
    Execute a workflow.

    Args:
        workflow_id: Workflow to execute
        initial_data: Initial input data for workflow
        parallel: If True, execute parallel node groups concurrently
        on_error: "stop" to halt on error, "continue" to skip failed nodes

    Returns:
        ExecutionResult with logs and final output

    Raises:
        HTTPException: If workflow not found or execution fails
    """
    if workflow_id not in WORKFLOWS:
        raise HTTPException(status_code=404, detail="Workflow not found")

    workflow = WORKFLOWS[workflow_id]

    try:
        result = await execute_workflow(
            workflow, initial_data=initial_data or {}, parallel=parallel, on_error=on_error
        )

        logger.info(f"Workflow {workflow_id} execution completed: {result.status}")
        return result

    except ValueError as e:
        logger.error(f"Invalid workflow execution request: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Workflow execution failed: {e}")
        raise HTTPException(status_code=500, detail="Workflow execution failed")


@router.get("/{workflow_id}/validate")
async def validate_workflow(workflow_id: str) -> Dict[str, Any]:
    """
    Validate a workflow structure.

    Args:
        workflow_id: Workflow to validate

    Returns:
        Validation result with execution order and parallel groups

    Raises:
        HTTPException: If workflow not found or invalid
    """
    if workflow_id not in WORKFLOWS:
        raise HTTPException(status_code=404, detail="Workflow not found")

    workflow = WORKFLOWS[workflow_id]

    try:
        engine = WorkflowExecutionEngine(workflow)
        execution_order = engine.topological_sort()
        parallel_groups = engine.get_parallel_groups()

        return {
            "valid": True,
            "execution_order": execution_order,
            "parallel_groups": parallel_groups,
            "node_count": len(workflow.nodes),
            "edge_count": len(workflow.edges),
        }

    except ValueError as e:
        logger.error(f"Workflow validation failed: {e}")
        raise HTTPException(
            status_code=400, detail={"valid": False, "error": str(e)}
        )
    except Exception as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=500, detail="Validation failed")


# ============================================================================
# WebSocket Endpoint for Real-Time Events
# ============================================================================


@router.websocket("/{workflow_id}/execute-stream")
async def execute_workflow_stream(
    websocket: WebSocket, workflow_id: str, parallel: bool = False
) -> None:
    """
    Execute a workflow with real-time event streaming via WebSocket.

    Args:
        websocket: WebSocket connection
        workflow_id: Workflow to execute
        parallel: If True, execute parallel node groups concurrently

    Connection Flow:
    1. Client connects to WebSocket
    2. Client sends initial_data as JSON
    3. Server executes workflow, sending events as JSON
    4. Connection closes when execution completes
    """
    await websocket.accept()

    if workflow_id not in WORKFLOWS:
        await websocket.send_json(
            {"type": "error", "message": "Workflow not found"}
        )
        await websocket.close(code=4004)
        return

    try:
        # Receive initial data from client
        message = await websocket.receive_text()
        initial_data = json.loads(message) if message else {}

        workflow = WORKFLOWS[workflow_id]

        # Callback to send events via WebSocket
        async def emit_event(event):
            try:
                await websocket.send_json({
                    "type": "event",
                    "event": event.model_dump(mode="json"),
                })
            except Exception as e:
                logger.error(f"Error sending event: {e}")

        # Execute workflow with event streaming
        result = await execute_workflow(
            workflow,
            initial_data=initial_data,
            parallel=parallel,
            event_callback=emit_event,
            on_error="continue",
        )

        # Send final result
        await websocket.send_json(
            {
                "type": "result",
                "result": result.model_dump(mode="json"),
            }
        )

        logger.info(f"WebSocket execution completed for {workflow_id}")

    except json.JSONDecodeError:
        await websocket.send_json(
            {"type": "error", "message": "Invalid JSON in initial data"}
        )
    except Exception as e:
        logger.error(f"WebSocket execution error: {e}")
        try:
            await websocket.send_json(
                {"type": "error", "message": str(e)}
            )
        except Exception:
            pass
    finally:
        await websocket.close()


# ============================================================================
# Utility Endpoints
# ============================================================================


@router.post("/{workflow_id}/test")
async def test_workflow(
    workflow_id: str,
    initial_data: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Test a workflow without full execution (validation only).

    Args:
        workflow_id: Workflow to test
        initial_data: Sample input data to validate

    Returns:
        Test results
    """
    if workflow_id not in WORKFLOWS:
        raise HTTPException(status_code=404, detail="Workflow not found")

    workflow = WORKFLOWS[workflow_id]

    try:
        engine = WorkflowExecutionEngine(workflow)

        # Validate structure
        execution_order = engine.topological_sort()
        parallel_groups = engine.get_parallel_groups()

        # Validate that all nodes have valid configurations
        validation_errors = []
        for node in workflow.nodes:
            try:
                # Try to instantiate the node data model
                node_type = node.type
                if node_type == NodeType.TRIGGER:
                    from app.models.workflow import TriggerNodeData
                    _ = TriggerNodeData(**node.data)
                elif node_type == NodeType.DATABASE:
                    from app.models.workflow import DatabaseNodeData
                    _ = DatabaseNodeData(**node.data)
                elif node_type == NodeType.LLM:
                    from app.models.workflow import LLMNodeData
                    _ = LLMNodeData(**node.data)
                elif node_type == NodeType.PII_FILTER:
                    from app.models.workflow import PIIFilterNodeData
                    _ = PIIFilterNodeData(**node.data)
                elif node_type == NodeType.OUTPUT:
                    from app.models.workflow import OutputNodeData
                    _ = OutputNodeData(**node.data)
            except Exception as e:
                validation_errors.append(
                    {
                        "node_id": node.id,
                        "error": str(e),
                    }
                )

        return {
            "valid": len(validation_errors) == 0,
            "execution_order": execution_order,
            "parallel_groups": parallel_groups,
            "validation_errors": validation_errors,
            "initial_data_keys": list((initial_data or {}).keys()),
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Test failed: {e}")
        raise HTTPException(status_code=500, detail="Test execution failed")


@router.get("/{workflow_id}/graph")
async def get_workflow_graph(workflow_id: str) -> Dict[str, Any]:
    """
    Get workflow as graph representation.

    Args:
        workflow_id: Workflow identifier

    Returns:
        Graph with nodes and edges suitable for visualization
    """
    if workflow_id not in WORKFLOWS:
        raise HTTPException(status_code=404, detail="Workflow not found")

    workflow = WORKFLOWS[workflow_id]

    return {
        "id": workflow.id,
        "name": workflow.name,
        "nodes": [
            {
                "id": node.id,
                "type": node.type,
                "label": node.label or node.id,
                "position": node.position,
            }
            for node in workflow.nodes
        ],
        "edges": [
            {
                "id": edge.id,
                "source": edge.source,
                "target": edge.target,
                "label": edge.label or "",
            }
            for edge in workflow.edges
        ],
    }
