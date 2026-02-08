"""
Node test endpoint for ComplianceFlow.

Provides a single-node execution endpoint for the I/O test pane,
reusing the WorkflowExecutionEngine's node dispatch logic.
"""

import asyncio
import time
import uuid
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from loguru import logger

from app.models.workflow import (
    Workflow,
    WorkflowNode,
    NodeType,
    ExecutionContext,
)
from app.services.executor import WorkflowExecutionEngine


router = APIRouter()


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class NodeTestRequest(BaseModel):
    """Request body for testing a single node."""
    config: Dict[str, Any] = {}
    input: Any = None


class NodeTestResponse(BaseModel):
    """Response from a single-node test execution."""
    success: bool
    output: Any = None
    error: Optional[str] = None
    duration_ms: float = 0


# ---------------------------------------------------------------------------
# Valid node types (from NodeType enum values)
# ---------------------------------------------------------------------------

VALID_NODE_TYPES = {member.value for member in NodeType}


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post("/nodes/{node_type}/test", response_model=NodeTestResponse)
async def test_node(node_type: str, body: NodeTestRequest) -> NodeTestResponse:
    """
    Execute a single node in isolation for testing.

    Args:
        node_type: The node type string (e.g. "llmNode", "piiFilterNode")
        body: Configuration and sample input data

    Returns:
        NodeTestResponse with success flag, output, error, and duration
    """
    # Validate node type
    if node_type not in VALID_NODE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown node type: {node_type}. Valid types: {sorted(VALID_NODE_TYPES)}",
        )

    node_id = "test-node"
    execution_id = str(uuid.uuid4())

    # Build a minimal single-node workflow so we can reuse the engine
    node = WorkflowNode(
        id=node_id,
        type=node_type,
        position={"x": 0, "y": 0},
        data=body.config,
    )
    workflow = Workflow(
        id=f"test-{execution_id}",
        name="Single Node Test",
        nodes=[node],
        edges=[],
    )

    # Create engine (no event callback needed for test)
    engine = WorkflowExecutionEngine(workflow, event_callback=None, on_error="stop")

    # Set up execution context with the provided input
    engine.execution_context = ExecutionContext(
        execution_id=execution_id,
        workflow_id=workflow.id,
        initial_data=body.input if isinstance(body.input, dict) else {},
    )
    # Pre-seed node_data so _gather_input_data can find upstream data.
    # For single-node test, we inject input under a synthetic upstream key
    # that _gather_input_data won't find (no edges), so we override the method.
    input_data = {}
    if isinstance(body.input, dict):
        input_data = body.input
    elif body.input is not None:
        input_data = {"data": body.input}

    start = time.perf_counter()

    try:
        # Execute the node's handler directly via the dispatch in _execute_node.
        # Instead of calling _execute_node (which relies on graph input gathering),
        # we replicate the dispatch with our provided input_data.
        output_data = await _dispatch_node(engine, node, input_data)

        duration_ms = round((time.perf_counter() - start) * 1000, 2)
        return NodeTestResponse(
            success=True,
            output=output_data,
            error=None,
            duration_ms=duration_ms,
        )

    except asyncio.TimeoutError:
        duration_ms = round((time.perf_counter() - start) * 1000, 2)
        return NodeTestResponse(
            success=False,
            output=None,
            error="Node execution timed out (30s limit)",
            duration_ms=duration_ms,
        )
    except Exception as e:
        duration_ms = round((time.perf_counter() - start) * 1000, 2)
        logger.warning(f"Node test failed for {node_type}: {e}")
        return NodeTestResponse(
            success=False,
            output=None,
            error=str(e),
            duration_ms=duration_ms,
        )


async def _dispatch_node(
    engine: WorkflowExecutionEngine,
    node: WorkflowNode,
    input_data: Dict[str, Any],
) -> Any:
    """
    Dispatch a single node to its executor method with a 30s timeout.

    Reuses the engine's _execute_*_node methods directly.
    """
    dispatch = {
        NodeType.TRIGGER: engine._execute_trigger_node,
        NodeType.DATABASE: engine._execute_database_node,
        NodeType.LLM: engine._execute_llm_node,
        NodeType.PII_FILTER: engine._execute_pii_filter_node,
        NodeType.OUTPUT: engine._execute_output_node,
        NodeType.SPREADSHEET: engine._execute_spreadsheet_node,
        NodeType.EMAIL_INBOX: engine._execute_email_inbox_node,
        NodeType.WEB_SEARCH: engine._execute_websearch_node,
        NodeType.PERSONALITY: engine._execute_personality_node,
        NodeType.AUDIT: engine._execute_audit_node,
        NodeType.CODE_REVIEW: engine._execute_code_review_node,
        NodeType.MCP_CONTEXT: engine._execute_mcp_context_node,
        NodeType.CONDITIONAL: engine._execute_conditional_node,
        NodeType.APPROVAL_GATE: engine._execute_approval_gate_node,
        NodeType.COMPLIANCE_DASHBOARD: engine._execute_compliance_dashboard_node,
        NodeType.MODEL_REGISTRY: engine._execute_model_registry_node,
        NodeType.EVIDENCE_COLLECTION: engine._execute_evidence_collection_node,
        NodeType.BIAS_TESTING: engine._execute_bias_testing_node,
        NodeType.EXPLAINABILITY: engine._execute_explainability_node,
        NodeType.RED_TEAMING: engine._execute_red_teaming_node,
        NodeType.DRIFT_DETECTION: engine._execute_drift_detection_node,
        NodeType.NOTIFICATION: engine._execute_notification_node,
        NodeType.ENCRYPTION: engine._execute_encryption_node,
        NodeType.WEBHOOK_GATEWAY: engine._execute_webhook_gateway_node,
        NodeType.SUB_WORKFLOW: engine._execute_sub_workflow_node,
        NodeType.PHI_CLASSIFICATION: engine._execute_phi_classification_node,
        NodeType.FAIR_LENDING: engine._execute_fair_lending_node,
        NodeType.CLAIMS_AUDIT: engine._execute_claims_audit_node,
        NodeType.CONSENT_MANAGEMENT: engine._execute_consent_management_node,
        NodeType.SLACK_COMPLIANCE: engine._execute_slack_compliance_node,
        NodeType.MICROSOFT_TEAMS_DORA: engine._execute_microsoft_teams_dora_node,
        NodeType.DATABASE_CREATOR: engine._execute_database_creator_node,
        NodeType.LOCAL_FOLDER_STORAGE: engine._execute_local_folder_storage_node,
        NodeType.CLOUD_DOCUMENT: engine._execute_cloud_document_node,
        NodeType.JIRA_COMPLIANCE: engine._execute_jira_compliance_node,
        NodeType.SAP_ERP: engine._execute_sap_erp_node,
    }

    handler = dispatch.get(NodeType(node.type))

    if handler is None:
        # Passthrough for frontend-only nodes (docker container, document)
        if NodeType(node.type) in (NodeType.DOCKER_CONTAINER, NodeType.DOCUMENT):
            return {"passthrough": True, **input_data}
        raise ValueError(f"No handler for node type: {node.type}")

    # 30-second timeout
    return await asyncio.wait_for(handler(node, input_data), timeout=30.0)
