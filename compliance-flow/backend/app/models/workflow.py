"""
Workflow models for ComplianceFlow.

Defines Pydantic models for:
- Workflow structure (nodes, edges, graph)
- Execution context and results
- Node execution logs and events
"""

from typing import Any, Dict, List, Optional, Literal
from enum import Enum
from datetime import datetime
from pydantic import BaseModel, Field


class NodeType(str, Enum):
    """Types of nodes in a workflow."""

    TRIGGER = "triggerNode"
    DATABASE = "databaseNode"
    LLM = "llmNode"
    PII_FILTER = "piiFilterNode"
    OUTPUT = "outputNode"
    DOCKER_CONTAINER = "dockerContainerNode"
    DOCUMENT = "documentNode"
    SPREADSHEET = "spreadsheetNode"
    EMAIL_INBOX = "emailInboxNode"
    WEB_SEARCH = "webSearchNode"
    PERSONALITY = "personalityNode"
    AUDIT = "auditNode"
    CODE_REVIEW = "codeReviewNode"
    MCP_CONTEXT = "mcpContextNode"
    CONDITIONAL = "conditionalNode"
    APPROVAL_GATE = "approvalGateNode"
    COMPLIANCE_DASHBOARD = "complianceDashboardNode"
    MODEL_REGISTRY = "modelRegistryNode"
    EVIDENCE_COLLECTION = "evidenceCollectionNode"


class TriggerType(str, Enum):
    """Types of triggers for workflow execution."""

    MANUAL = "manual"
    SCHEDULE = "schedule"
    WEBHOOK = "webhook"


class PIIFilterMode(str, Enum):
    """Modes for PII filtering."""

    REDACT = "redact"
    MASK = "mask"


class NodeDataBase(BaseModel):
    """Base model for node data."""

    pass


class TriggerNodeData(NodeDataBase):
    """Data for trigger nodes."""

    trigger_type: TriggerType = Field(default=TriggerType.MANUAL, description="Type of trigger")
    schedule_expression: Optional[str] = Field(default=None, description="Cron expression for scheduled triggers")
    webhook_url: Optional[str] = Field(default=None, description="Webhook URL for webhook triggers")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Initial parameters for workflow")


class DatabaseNodeData(NodeDataBase):
    """Data for database nodes."""

    database_type: Literal["postgresql", "mysql", "mongodb"] = Field(
        default="postgresql", description="Type of database"
    )
    query: str = Field(description="Query or aggregation pipeline")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Query parameters")
    connection_string: Optional[str] = Field(default=None, description="Connection string or reference")


class LLMNodeData(NodeDataBase):
    """Data for LLM nodes."""

    model: str = Field(default="mistral", description="Model name to use")
    prompt: str = Field(description="Prompt template for LLM")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0, description="Temperature for response")
    max_tokens: int = Field(default=1000, ge=1, description="Maximum tokens to generate")
    system_prompt: Optional[str] = Field(default=None, description="System prompt for context")


class PIIFilterNodeData(NodeDataBase):
    """Data for PII filter nodes."""

    mode: PIIFilterMode = Field(default=PIIFilterMode.REDACT, description="Filtering mode (redact or mask)")
    patterns: List[str] = Field(
        default_factory=list,
        description="Regex patterns for PII detection or entity types (email, phone, ssn, credit_card)",
    )
    replacement_char: str = Field(default="*", description="Character to use for masking/redaction")
    context_field: Optional[str] = Field(default=None, description="Field name to filter (if input is dict)")


class OutputNodeData(NodeDataBase):
    """Data for output nodes."""

    format: Literal["json", "text", "csv"] = Field(default="json", description="Output format")
    template: Optional[str] = Field(default=None, description="Output template for formatting")
    include_metadata: bool = Field(default=False, description="Include execution metadata in output")


class WorkflowNode(BaseModel):
    """Represents a node in the workflow graph."""

    id: str = Field(description="Unique node identifier")
    type: NodeType = Field(description="Type of node")
    position: Dict[str, float] = Field(default_factory=dict, description="Visual position in React Flow")
    data: Dict[str, Any] = Field(description="Node configuration data")
    label: Optional[str] = Field(default=None, description="Display label for node")

    class Config:
        use_enum_values = False


class WorkflowEdge(BaseModel):
    """Represents an edge (connection) between two nodes."""

    id: str = Field(description="Unique edge identifier")
    source: str = Field(description="Source node ID")
    target: str = Field(description="Target node ID")
    data: Dict[str, Any] = Field(default_factory=dict, description="Edge metadata")
    label: Optional[str] = Field(default=None, description="Edge label")

    class Config:
        use_enum_values = False


class Workflow(BaseModel):
    """Represents a complete workflow."""

    id: str = Field(description="Unique workflow identifier")
    name: str = Field(description="Workflow name")
    description: Optional[str] = Field(default=None, description="Workflow description")
    nodes: List[WorkflowNode] = Field(description="List of nodes in workflow")
    edges: List[WorkflowEdge] = Field(description="List of edges in workflow")
    version: str = Field(default="1.0", description="Workflow version")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Last update timestamp")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")

    class Config:
        use_enum_values = False


class ExecutionContext(BaseModel):
    """Context for a single workflow execution."""

    execution_id: str = Field(description="Unique execution identifier")
    workflow_id: str = Field(description="ID of workflow being executed")
    started_at: datetime = Field(default_factory=datetime.utcnow, description="Execution start time")
    initial_data: Dict[str, Any] = Field(default_factory=dict, description="Initial input data")
    node_data: Dict[str, Any] = Field(default_factory=dict, description="Output data from executed nodes")
    variables: Dict[str, Any] = Field(default_factory=dict, description="Execution variables")
    completed_nodes: List[str] = Field(default_factory=list, description="IDs of completed nodes")
    failed_nodes: List[str] = Field(default_factory=list, description="IDs of failed nodes")
    current_node: Optional[str] = Field(default=None, description="Currently executing node ID")

    class Config:
        use_enum_values = False


class NodeExecutionLog(BaseModel):
    """Log entry for a single node execution."""

    execution_id: str = Field(description="Execution ID this log belongs to")
    node_id: str = Field(description="Node that was executed")
    node_type: NodeType = Field(description="Type of node")
    status: Literal["pending", "running", "completed", "failed", "skipped", "paused"] = Field(description="Execution status")
    started_at: Optional[datetime] = Field(default=None, description="When node execution started")
    completed_at: Optional[datetime] = Field(default=None, description="When node execution completed")
    duration_ms: Optional[int] = Field(default=None, description="Execution duration in milliseconds")
    input_data: Dict[str, Any] = Field(default_factory=dict, description="Input data to node")
    output_data: Dict[str, Any] = Field(default_factory=dict, description="Output data from node")
    error: Optional[str] = Field(default=None, description="Error message if execution failed")
    error_type: Optional[str] = Field(default=None, description="Type of error (exception class name)")
    error_trace: Optional[str] = Field(default=None, description="Full error traceback")

    class Config:
        use_enum_values = False


class ExecutionResult(BaseModel):
    """Result of a complete workflow execution."""

    execution_id: str = Field(description="Unique execution identifier")
    workflow_id: str = Field(description="ID of executed workflow")
    status: Literal["success", "failed", "partial", "paused"] = Field(description="Overall execution status")
    started_at: datetime = Field(description="Execution start time")
    completed_at: datetime = Field(description="Execution completion time")
    duration_ms: int = Field(description="Total execution duration in milliseconds")
    final_output: Dict[str, Any] = Field(default_factory=dict, description="Final output data")
    execution_logs: List[NodeExecutionLog] = Field(default_factory=list, description="Log for each node")
    completed_nodes: List[str] = Field(default_factory=list, description="IDs of successfully completed nodes")
    failed_nodes: List[str] = Field(default_factory=list, description="IDs of failed nodes")
    error_summary: Optional[str] = Field(default=None, description="Summary of any errors")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional execution metadata")

    class Config:
        use_enum_values = False


class ExecutionEvent(BaseModel):
    """Real-time execution event emitted during workflow execution."""

    event_id: str = Field(description="Unique event identifier")
    execution_id: str = Field(description="Execution ID this event belongs to")
    event_type: Literal["execution_started", "node_started", "node_completed", "node_failed", "execution_completed", "execution_failed"] = Field(
        description="Type of event"
    )
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="When event occurred")
    node_id: Optional[str] = Field(default=None, description="Node involved (if applicable)")
    data: Dict[str, Any] = Field(default_factory=dict, description="Event-specific data")
    message: str = Field(description="Human-readable event message")

    class Config:
        use_enum_values = False
