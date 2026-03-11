"""
Node test endpoint for ComplianceFlow.

Provides a single-node execution endpoint for the I/O test pane,
reusing the WorkflowExecutionEngine's node dispatch logic.
"""

import asyncio
import time
import uuid
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ValidationError
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


ErrorType = Literal["config_error", "input_error", "service_unavailable", "timeout", "runtime_error"]


class NodeTestResponse(BaseModel):
    """Response from a single-node test execution."""
    success: bool
    output: Any = None
    error: Optional[str] = None
    error_type: Optional[ErrorType] = None
    suggestions: List[str] = []
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
            error_type="timeout",
            suggestions=[
                "Check that required services (Ollama, databases) are running",
                "Reduce input data size or prompt length",
                "Try a smaller/faster model if using an LLM node",
            ],
            duration_ms=duration_ms,
        )
    except Exception as e:
        duration_ms = round((time.perf_counter() - start) * 1000, 2)
        error_type, suggestions = _classify_error(e, node_type)
        logger.warning(f"Node test failed for {node_type}: {e}")
        return NodeTestResponse(
            success=False,
            output=None,
            error=str(e),
            error_type=error_type,
            suggestions=suggestions,
            duration_ms=duration_ms,
        )


# ---------------------------------------------------------------------------
# Error classification
# ---------------------------------------------------------------------------

# Node types that depend on external services
_SERVICE_NODES = {
    "databaseNode", "llmNode", "emailInboxNode", "slackComplianceNode",
    "microsoftTeamsDORANode", "jiraComplianceNode", "sapERPNode",
    "cloudDocumentNode", "webhookGatewayNode", "webSearchNode",
}


def _classify_error(exc: Exception, node_type: str) -> tuple[ErrorType, list[str]]:
    """Classify an exception into an error_type and provide fix suggestions."""
    error_msg = str(exc).lower()

    # --- Validation / config errors ---
    if isinstance(exc, (ValidationError, KeyError)):
        return "config_error", [
            "Check that all required configuration fields are filled in",
            "Verify field values match the expected types",
        ]

    if isinstance(exc, ValueError):
        # Heuristic: if the message mentions input/data it's likely input_error
        if any(kw in error_msg for kw in ("input", "data", "payload", "empty", "missing key")):
            return "input_error", [
                "Provide sample input data in the Input tab",
                "Ensure input matches the format this node expects",
            ]
        return "config_error", [
            "Review the node configuration for invalid values",
            "Check that all required fields are set",
        ]

    if isinstance(exc, TypeError):
        return "input_error", [
            "Input data type doesn't match what this node expects",
            "Try passing a JSON object instead of a plain value",
        ]

    # --- Connection / service errors ---
    if isinstance(exc, (ConnectionError, ConnectionRefusedError, ConnectionResetError, OSError)):
        suggestions = ["Verify the service is running and accessible"]
        if node_type in ("llmNode", "personalityNode", "codeReviewNode"):
            suggestions.append("Check that Ollama is running on port 11434")
        elif node_type == "databaseNode":
            suggestions.append("Verify database host, port, and credentials in config")
        elif node_type in ("slackComplianceNode", "jiraComplianceNode", "sapERPNode"):
            suggestions.append("Check API credentials and network connectivity")
        return "service_unavailable", suggestions

    if isinstance(exc, TimeoutError):
        return "service_unavailable", [
            "The external service did not respond in time",
            "Check network connectivity and service health",
        ]

    # --- Catch-all: check error message for common patterns ---
    if any(kw in error_msg for kw in ("connection", "connect", "refused", "unreachable", "dns")):
        return "service_unavailable", [
            "Cannot reach the required service",
            "Check that Docker services are running (PostgreSQL, Redis, Ollama, etc.)",
        ]

    if any(kw in error_msg for kw in ("credential", "auth", "token", "api key", "unauthorized", "forbidden")):
        return "config_error", [
            "Authentication credentials are missing or invalid",
            "Verify API keys, tokens, or passwords in the node configuration",
        ]

    # --- Default ---
    return "runtime_error", [
        "An unexpected error occurred during node execution",
        "Check the backend logs for more details",
    ]


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
        NodeType.VOICE_ASSISTANT: engine._execute_voice_assistant_node,
    }

    handler = dispatch.get(NodeType(node.type))

    if handler is None:
        # Passthrough for frontend-only nodes (docker container, document)
        if NodeType(node.type) in (NodeType.DOCKER_CONTAINER, NodeType.DOCUMENT):
            return {"passthrough": True, **input_data}
        raise ValueError(f"No handler for node type: {node.type}")

    # 30-second timeout
    return await asyncio.wait_for(handler(node, input_data), timeout=30.0)
