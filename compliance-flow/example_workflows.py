"""
Example workflows demonstrating the ComplianceFlow execution engine.

Shows practical use cases for compliance workflow automation.
"""

from app.models.workflow import (
    Workflow,
    WorkflowNode,
    WorkflowEdge,
    NodeType,
    TriggerType,
    PIIFilterMode,
)


def create_pii_redaction_workflow() -> Workflow:
    """
    Example: Redact PII from customer feedback.

    Flow: Trigger → PII Filter → Output
    """
    nodes = [
        WorkflowNode(
            id="trigger-customer-feedback",
            type=NodeType.TRIGGER,
            label="Customer Feedback Input",
            position={"x": 100, "y": 100},
            data={
                "trigger_type": TriggerType.MANUAL,
                "parameters": {
                    "feedback": "My email is john@example.com and my phone is 555-123-4567"
                },
            },
        ),
        WorkflowNode(
            id="filter-pii",
            type=NodeType.PII_FILTER,
            label="Remove PII",
            position={"x": 300, "y": 100},
            data={
                "mode": PIIFilterMode.REDACT,
                "patterns": ["email", "phone"],
                "replacement_char": "*",
                "context_field": "feedback",
            },
        ),
        WorkflowNode(
            id="output-clean-feedback",
            type=NodeType.OUTPUT,
            label="Clean Feedback",
            position={"x": 500, "y": 100},
            data={
                "format": "json",
                "include_metadata": True,
            },
        ),
    ]

    edges = [
        WorkflowEdge(id="e1", source="trigger-customer-feedback", target="filter-pii"),
        WorkflowEdge(id="e2", source="filter-pii", target="output-clean-feedback"),
    ]

    return Workflow(
        id="pii-redaction",
        name="PII Redaction Workflow",
        description="Automatically redact personally identifiable information from text",
        nodes=nodes,
        edges=edges,
    )


def create_document_analysis_workflow() -> Workflow:
    """
    Example: Analyze documents for compliance.

    Flow: Trigger → Database Query → LLM Analysis → PII Filter → Output
    """
    nodes = [
        WorkflowNode(
            id="trigger-document-upload",
            type=NodeType.TRIGGER,
            label="Document Upload",
            position={"x": 100, "y": 100},
            data={
                "trigger_type": TriggerType.WEBHOOK,
                "webhook_url": "https://webhook.example.com/documents",
                "parameters": {
                    "document_id": "doc-123",
                    "document_type": "contract",
                },
            },
        ),
        WorkflowNode(
            id="fetch-document",
            type=NodeType.DATABASE,
            label="Fetch from DB",
            position={"x": 300, "y": 100},
            data={
                "database_type": "postgresql",
                "query": "SELECT content, metadata FROM documents WHERE id = '{document_id}'",
                "connection_string": "postgresql://localhost/compliance_db",
            },
        ),
        WorkflowNode(
            id="analyze-compliance",
            type=NodeType.LLM,
            label="Compliance Analysis",
            position={"x": 500, "y": 100},
            data={
                "model": "mistral",
                "system_prompt": "You are a compliance expert. Analyze documents for legal compliance.",
                "prompt": "Analyze this document for compliance issues:\n\n{content}",
                "temperature": 0.3,
                "max_tokens": 500,
            },
        ),
        WorkflowNode(
            id="mask-sensitive-content",
            type=NodeType.PII_FILTER,
            label="Mask Sensitive Info",
            position={"x": 700, "y": 100},
            data={
                "mode": PIIFilterMode.MASK,
                "patterns": ["email", "phone", "ssn", "credit_card"],
                "replacement_char": "*",
            },
        ),
        WorkflowNode(
            id="output-compliance-report",
            type=NodeType.OUTPUT,
            label="Compliance Report",
            position={"x": 900, "y": 100},
            data={
                "format": "json",
                "include_metadata": True,
            },
        ),
    ]

    edges = [
        WorkflowEdge(id="e1", source="trigger-document-upload", target="fetch-document"),
        WorkflowEdge(id="e2", source="fetch-document", target="analyze-compliance"),
        WorkflowEdge(id="e3", source="analyze-compliance", target="mask-sensitive-content"),
        WorkflowEdge(id="e4", source="mask-sensitive-content", target="output-compliance-report"),
    ]

    return Workflow(
        id="document-analysis",
        name="Document Compliance Analysis",
        description="Analyze documents using LLM and filter sensitive information",
        nodes=nodes,
        edges=edges,
    )


def create_parallel_processing_workflow() -> Workflow:
    """
    Example: Process multiple compliance checks in parallel.

    Flow: Trigger → (DB Query + LLM Analysis) [parallel] → PII Filter → Output
    """
    nodes = [
        WorkflowNode(
            id="trigger-batch",
            type=NodeType.TRIGGER,
            label="Batch Processing Start",
            position={"x": 100, "y": 100},
            data={
                "trigger_type": TriggerType.SCHEDULE,
                "schedule_expression": "0 2 * * *",  # Daily at 2 AM
                "parameters": {
                    "batch_date": "2024-01-15",
                    "batch_size": 100,
                },
            },
        ),
        # Parallel branch 1: Database lookup
        WorkflowNode(
            id="query-user-data",
            type=NodeType.DATABASE,
            label="Query User Data",
            position={"x": 300, "y": 50},
            data={
                "database_type": "postgresql",
                "query": "SELECT * FROM users WHERE created_date = '{batch_date}' LIMIT {batch_size}",
                "connection_string": "postgresql://localhost/compliance_db",
            },
        ),
        # Parallel branch 2: LLM analysis
        WorkflowNode(
            id="check-policy-compliance",
            type=NodeType.LLM,
            label="Policy Check",
            position={"x": 300, "y": 150},
            data={
                "model": "llama2",
                "system_prompt": "You are a policy compliance checker.",
                "prompt": "Check if these data practices comply with GDPR: {batch_date}",
                "temperature": 0.5,
                "max_tokens": 200,
            },
        ),
        # Convergence point
        WorkflowNode(
            id="filter-results",
            type=NodeType.PII_FILTER,
            label="Filter PII",
            position={"x": 500, "y": 100},
            data={
                "mode": PIIFilterMode.REDACT,
                "patterns": ["email", "ssn"],
                "replacement_char": "X",
            },
        ),
        WorkflowNode(
            id="output-batch-report",
            type=NodeType.OUTPUT,
            label="Batch Report",
            position={"x": 700, "y": 100},
            data={
                "format": "csv",
                "include_metadata": True,
            },
        ),
    ]

    edges = [
        WorkflowEdge(id="e1", source="trigger-batch", target="query-user-data"),
        WorkflowEdge(id="e2", source="trigger-batch", target="check-policy-compliance"),
        WorkflowEdge(id="e3", source="query-user-data", target="filter-results"),
        WorkflowEdge(id="e4", source="check-policy-compliance", target="filter-results"),
        WorkflowEdge(id="e5", source="filter-results", target="output-batch-report"),
    ]

    return Workflow(
        id="parallel-compliance",
        name="Parallel Compliance Processing",
        description="Process multiple compliance checks in parallel for efficiency",
        nodes=nodes,
        edges=edges,
    )


def create_data_subject_access_workflow() -> Workflow:
    """
    Example: Handle Data Subject Access Requests (DSAR).

    Flow: Trigger → Database Query → PII Filter (Mask) → Output
    """
    nodes = [
        WorkflowNode(
            id="trigger-dsar",
            type=NodeType.TRIGGER,
            label="DSAR Request",
            position={"x": 100, "y": 100},
            data={
                "trigger_type": TriggerType.MANUAL,
                "parameters": {
                    "subject_id": "user-456",
                    "request_type": "personal_data",
                },
            },
        ),
        WorkflowNode(
            id="retrieve-personal-data",
            type=NodeType.DATABASE,
            label="Retrieve Personal Data",
            position={"x": 300, "y": 100},
            data={
                "database_type": "postgresql",
                "query": """
                    SELECT
                        name, email, phone, address, created_at, last_login,
                        account_status, preferences
                    FROM users
                    WHERE id = '{subject_id}'
                """,
                "connection_string": "postgresql://localhost/compliance_db",
            },
        ),
        WorkflowNode(
            id="mask-unnecessary-fields",
            type=NodeType.PII_FILTER,
            label="Mask Unnecessary Fields",
            position={"x": 500, "y": 100},
            data={
                "mode": PIIFilterMode.MASK,
                "patterns": ["phone"],  # Mask phone but keep email and name
                "replacement_char": "*",
            },
        ),
        WorkflowNode(
            id="format-dsar-response",
            type=NodeType.OUTPUT,
            label="Format DSAR Response",
            position={"x": 700, "y": 100},
            data={
                "format": "json",
                "template": "DSAR Response for {subject_id}",
                "include_metadata": True,
            },
        ),
    ]

    edges = [
        WorkflowEdge(id="e1", source="trigger-dsar", target="retrieve-personal-data"),
        WorkflowEdge(id="e2", source="retrieve-personal-data", target="mask-unnecessary-fields"),
        WorkflowEdge(id="e3", source="mask-unnecessary-fields", target="format-dsar-response"),
    ]

    return Workflow(
        id="dsar-processing",
        name="Data Subject Access Request",
        description="Process DSAR requests with appropriate data filtering",
        nodes=nodes,
        edges=edges,
    )


def create_audit_logging_workflow() -> Workflow:
    """
    Example: Comprehensive audit logging with compliance analysis.

    Flow: Trigger → (Log Storage + Analysis) [parallel] → Filter → Output
    """
    nodes = [
        WorkflowNode(
            id="trigger-audit",
            type=NodeType.TRIGGER,
            label="Audit Event",
            position={"x": 100, "y": 100},
            data={
                "trigger_type": TriggerType.WEBHOOK,
                "webhook_url": "https://webhook.example.com/audit",
                "parameters": {
                    "event_type": "user_login",
                    "timestamp": "2024-01-15T10:30:00Z",
                    "user_ip": "192.168.1.1",
                },
            },
        ),
        # Branch 1: Store in audit log
        WorkflowNode(
            id="store-audit-log",
            type=NodeType.DATABASE,
            label="Store Audit Log",
            position={"x": 300, "y": 50},
            data={
                "database_type": "postgresql",
                "query": """
                    INSERT INTO audit_logs
                    (event_type, timestamp, user_ip, details)
                    VALUES ('{event_type}', '{timestamp}', '{user_ip}', '...')
                """,
                "connection_string": "postgresql://localhost/compliance_db",
            },
        ),
        # Branch 2: Analyze for suspicious activity
        WorkflowNode(
            id="analyze-suspicious-activity",
            type=NodeType.LLM,
            label="Threat Analysis",
            position={"x": 300, "y": 150},
            data={
                "model": "mistral",
                "system_prompt": "You are a security analyst. Identify suspicious activities.",
                "prompt": "Analyze this event for suspicious activity: {event_type} from {user_ip} at {timestamp}",
                "temperature": 0.2,
                "max_tokens": 150,
            },
        ),
        # Convergence
        WorkflowNode(
            id="filter-audit-output",
            type=NodeType.PII_FILTER,
            label="Protect PII",
            position={"x": 500, "y": 100},
            data={
                "mode": PIIFilterMode.REDACT,
                "patterns": ["email"],
                "replacement_char": "X",
            },
        ),
        WorkflowNode(
            id="output-audit-result",
            type=NodeType.OUTPUT,
            label="Audit Report",
            position={"x": 700, "y": 100},
            data={
                "format": "json",
                "include_metadata": True,
            },
        ),
    ]

    edges = [
        WorkflowEdge(id="e1", source="trigger-audit", target="store-audit-log"),
        WorkflowEdge(id="e2", source="trigger-audit", target="analyze-suspicious-activity"),
        WorkflowEdge(id="e3", source="store-audit-log", target="filter-audit-output"),
        WorkflowEdge(id="e4", source="analyze-suspicious-activity", target="filter-audit-output"),
        WorkflowEdge(id="e5", source="filter-audit-output", target="output-audit-result"),
    ]

    return Workflow(
        id="audit-logging",
        name="Comprehensive Audit Logging",
        description="Log and analyze events with compliance checks",
        nodes=nodes,
        edges=edges,
    )


# Example usage
if __name__ == "__main__":
    import asyncio
    from app.services.executor import execute_workflow

    async def run_example():
        # Create workflow
        workflow = create_pii_redaction_workflow()

        print(f"\n{'='*60}")
        print(f"Running: {workflow.name}")
        print(f"Description: {workflow.description}")
        print(f"Nodes: {len(workflow.nodes)}, Edges: {len(workflow.edges)}")
        print(f"{'='*60}\n")

        # Define event callback
        async def on_event(event):
            print(f"[{event.event_type.upper()}] {event.message}")
            if event.data:
                print(f"  → {event.data}")

        # Execute
        result = await execute_workflow(workflow, event_callback=on_event)

        print(f"\n{'='*60}")
        print(f"Execution Result: {result.status}")
        print(f"Duration: {result.duration_ms}ms")
        print(f"Completed Nodes: {len(result.completed_nodes)}")
        print(f"Failed Nodes: {len(result.failed_nodes)}")
        print(f"\nFinal Output:")
        print(result.final_output)
        print(f"{'='*60}\n")

    # Run all example workflows
    workflows = [
        create_pii_redaction_workflow(),
        create_document_analysis_workflow(),
        create_parallel_processing_workflow(),
        create_data_subject_access_workflow(),
        create_audit_logging_workflow(),
    ]

    print(f"\nAvailable Example Workflows:")
    for wf in workflows:
        print(f"  - {wf.id}: {wf.name}")
        print(f"    {wf.description}")
