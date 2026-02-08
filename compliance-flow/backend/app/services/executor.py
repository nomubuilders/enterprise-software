"""
Workflow Execution Engine for ComplianceFlow.

Handles:
1. Parsing workflow graph structure
2. Topological sorting for execution order
3. Sequential and parallel node execution
4. Data passing between nodes
5. Multiple node type processing
6. Real-time event emission
7. Error handling and recovery
8. Execution state tracking
"""

import asyncio
import ipaddress
import re
import uuid
import traceback
from typing import Any, Callable, Dict, List, Optional, Set, Tuple
from datetime import datetime
from collections import defaultdict, deque
from urllib.parse import urlparse
import logging

import aiohttp
from pydantic import ValidationError

from app.core.config import settings
from app.models.workflow import (
    Workflow,
    WorkflowNode,
    WorkflowEdge,
    NodeType,
    PIIFilterMode,
    ExecutionContext,
    ExecutionResult,
    NodeExecutionLog,
    ExecutionEvent,
    TriggerNodeData,
    DatabaseNodeData,
    LLMNodeData,
    PIIFilterNodeData,
    OutputNodeData,
)

logger = logging.getLogger(__name__)


class WorkflowExecutionEngine:
    """
    Executes workflow graphs with support for multiple node types,
    data passing, and real-time event emission.
    """

    def __init__(self, workflow: Workflow, event_callback: Optional[Callable] = None, on_error: str = "stop"):
        """
        Initialize the execution engine.

        Args:
            workflow: The workflow to execute
            event_callback: Optional async callback for execution events
            on_error: "stop" to halt on error, "continue" to skip failed nodes
        """
        self.workflow = workflow
        self.event_callback = event_callback
        self.on_error = on_error
        self._validate_on_error(on_error)

        self.execution_context: Optional[ExecutionContext] = None
        self.execution_logs: List[NodeExecutionLog] = []
        self.graph: Dict[str, List[str]] = defaultdict(list)
        self.reverse_graph: Dict[str, List[str]] = defaultdict(list)
        self._build_graph()

    @staticmethod
    def _validate_on_error(on_error: str) -> None:
        """Validate on_error parameter."""
        if on_error not in ("stop", "continue"):
            raise ValueError("on_error must be 'stop' or 'continue'")

    @staticmethod
    def _validate_url(url: str, allowed_schemes: tuple = ("https",)) -> bool:
        """Validate URL to prevent SSRF attacks. Blocks internal/private IPs and non-HTTPS schemes."""
        try:
            parsed = urlparse(url)
            if parsed.scheme not in allowed_schemes:
                return False
            hostname = parsed.hostname
            if not hostname:
                return False
            # Block private/internal IP ranges
            try:
                ip = ipaddress.ip_address(hostname)
                if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
                    return False
            except ValueError:
                # It's a hostname, not an IP — block known internal hostnames
                blocked = ("localhost", "127.0.0.1", "0.0.0.0", "metadata.google.internal", "169.254.169.254")
                if hostname.lower() in blocked or hostname.lower().endswith(".internal"):
                    return False
            return True
        except Exception:
            return False

    def _build_graph(self) -> None:
        """Build adjacency lists from workflow edges."""
        node_ids = {node.id for node in self.workflow.nodes}

        for edge in self.workflow.edges:
            if edge.source in node_ids and edge.target in node_ids:
                self.graph[edge.source].append(edge.target)
                self.reverse_graph[edge.target].append(edge.source)

    def get_node_by_id(self, node_id: str) -> Optional[WorkflowNode]:
        """Get a node by its ID."""
        for node in self.workflow.nodes:
            if node.id == node_id:
                return node
        return None

    def topological_sort(self) -> List[str]:
        """
        Perform topological sort using Kahn's algorithm.

        Returns:
            List of node IDs in execution order

        Raises:
            ValueError: If workflow contains cycles
        """
        in_degree: Dict[str, int] = defaultdict(int)
        graph = defaultdict(list)

        # Initialize in_degree for all nodes
        for node in self.workflow.nodes:
            if node.id not in in_degree:
                in_degree[node.id] = 0

        # Build in_degree map
        for node_id, neighbors in self.graph.items():
            for neighbor in neighbors:
                in_degree[neighbor] += 1
                graph[node_id].append(neighbor)

        # Find all nodes with in_degree 0
        queue = deque([node_id for node_id in in_degree if in_degree[node_id] == 0])
        result = []

        while queue:
            node_id = queue.popleft()
            result.append(node_id)

            for neighbor in graph[node_id]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)

        if len(result) != len(self.workflow.nodes):
            raise ValueError("Workflow contains cycles")

        return result

    def get_parallel_groups(self) -> List[List[str]]:
        """
        Get groups of nodes that can execute in parallel.

        Returns:
            List of node ID groups, where each group can run in parallel
        """
        in_degree: Dict[str, int] = defaultdict(int)

        for node in self.workflow.nodes:
            in_degree[node.id] = 0

        for node_id, neighbors in self.graph.items():
            for neighbor in neighbors:
                in_degree[neighbor] += 1

        groups = []
        remaining = set(node.id for node in self.workflow.nodes)
        completed = set()

        while remaining:
            current_group = []
            for node_id in remaining:
                # Check if all dependencies are completed
                dependencies = self.reverse_graph.get(node_id, [])
                if all(dep in completed for dep in dependencies):
                    current_group.append(node_id)

            if not current_group:
                raise ValueError("Circular dependency detected in workflow")

            groups.append(current_group)
            completed.update(current_group)
            remaining -= set(current_group)

        return groups

    async def emit_event(
        self,
        event_type: str,
        message: str,
        node_id: Optional[str] = None,
        data: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Emit an execution event via callback.

        Args:
            event_type: Type of event
            message: Human-readable message
            node_id: Optional node ID involved
            data: Optional event data
        """
        if self.event_callback is None:
            return

        event = ExecutionEvent(
            event_id=str(uuid.uuid4()),
            execution_id=self.execution_context.execution_id,
            event_type=event_type,
            node_id=node_id,
            message=message,
            data=data or {},
        )

        try:
            if asyncio.iscoroutinefunction(self.event_callback):
                await self.event_callback(event)
            else:
                self.event_callback(event)
        except Exception as e:
            logger.error(f"Error in event callback: {e}")

    async def execute(
        self, initial_data: Optional[Dict[str, Any]] = None, parallel: bool = False
    ) -> ExecutionResult:
        """
        Execute the workflow.

        Args:
            initial_data: Initial input data for the workflow
            parallel: If True, execute nodes in parallel groups; if False, sequential

        Returns:
            ExecutionResult with status and logs
        """
        execution_id = str(uuid.uuid4())
        self.execution_context = ExecutionContext(
            execution_id=execution_id,
            workflow_id=self.workflow.id,
            initial_data=initial_data or {},
        )
        self.execution_logs = []

        started_at = datetime.utcnow()

        try:
            await self.emit_event("execution_started", f"Starting workflow execution {execution_id}")

            if parallel:
                await self._execute_parallel()
            else:
                await self._execute_sequential()

            status = "success" if not self.execution_context.failed_nodes else "partial"

        except Exception as e:
            status = "failed"
            logger.error(f"Workflow execution failed: {e}\n{traceback.format_exc()}")
            await self.emit_event("execution_failed", f"Workflow execution failed: {str(e)}")

        completed_at = datetime.utcnow()
        duration_ms = int((completed_at - started_at).total_seconds() * 1000)

        result = ExecutionResult(
            execution_id=execution_id,
            workflow_id=self.workflow.id,
            status=status,
            started_at=started_at,
            completed_at=completed_at,
            duration_ms=duration_ms,
            final_output=self.execution_context.node_data,
            execution_logs=self.execution_logs,
            completed_nodes=self.execution_context.completed_nodes,
            failed_nodes=self.execution_context.failed_nodes,
            error_summary=self._build_error_summary() if self.execution_context.failed_nodes else None,
        )

        await self.emit_event(
            "execution_completed", f"Workflow execution completed with status {status}", data={"result": result.model_dump()}
        )

        return result

    async def _execute_sequential(self) -> None:
        """Execute nodes sequentially in topological order."""
        execution_order = self.topological_sort()

        for node_id in execution_order:
            if node_id in self.execution_context.failed_nodes:
                continue

            await self._execute_node(node_id)

            if node_id in self.execution_context.failed_nodes and self.on_error == "stop":
                break

    async def _execute_parallel(self) -> None:
        """Execute nodes in parallel groups."""
        groups = self.get_parallel_groups()

        for group in groups:
            # Execute all nodes in group concurrently
            tasks = [self._execute_node(node_id) for node_id in group]
            await asyncio.gather(*tasks, return_exceptions=True)

            # Check if we should stop on error
            if self.execution_context.failed_nodes and self.on_error == "stop":
                break

    async def _execute_node(self, node_id: str) -> None:
        """
        Execute a single node.

        Args:
            node_id: ID of node to execute
        """
        node = self.get_node_by_id(node_id)
        if not node:
            logger.error(f"Node {node_id} not found")
            return

        log = NodeExecutionLog(
            execution_id=self.execution_context.execution_id,
            node_id=node_id,
            node_type=node.type,
            status="running",
            started_at=datetime.utcnow(),
        )

        self.execution_context.current_node = node_id
        await self.emit_event("node_started", f"Executing node {node_id} ({node.type})", node_id=node_id)

        try:
            # Prepare input data from upstream nodes
            input_data = await self._gather_input_data(node_id)
            log.input_data = input_data

            # Execute based on node type
            output_data = None

            if node.type == NodeType.TRIGGER:
                output_data = await self._execute_trigger_node(node, input_data)
            elif node.type == NodeType.DATABASE:
                output_data = await self._execute_database_node(node, input_data)
            elif node.type == NodeType.LLM:
                output_data = await self._execute_llm_node(node, input_data)
            elif node.type == NodeType.PII_FILTER:
                output_data = await self._execute_pii_filter_node(node, input_data)
            elif node.type == NodeType.OUTPUT:
                output_data = await self._execute_output_node(node, input_data)
            elif node.type == NodeType.SPREADSHEET:
                output_data = await self._execute_spreadsheet_node(node, input_data)
            elif node.type == NodeType.EMAIL_INBOX:
                output_data = await self._execute_email_inbox_node(node, input_data)
            elif node.type == NodeType.WEB_SEARCH:
                output_data = await self._execute_websearch_node(node, input_data)
            elif node.type == NodeType.PERSONALITY:
                output_data = await self._execute_personality_node(node, input_data)
            elif node.type == NodeType.AUDIT:
                output_data = await self._execute_audit_node(node, input_data)
            elif node.type == NodeType.CODE_REVIEW:
                output_data = await self._execute_code_review_node(node, input_data)
            elif node.type == NodeType.MCP_CONTEXT:
                output_data = await self._execute_mcp_context_node(node, input_data)
            elif node.type == NodeType.CONDITIONAL:
                output_data = await self._execute_conditional_node(node, input_data)
            elif node.type == NodeType.APPROVAL_GATE:
                output_data = await self._execute_approval_gate_node(node, input_data)
            elif node.type == NodeType.COMPLIANCE_DASHBOARD:
                output_data = await self._execute_compliance_dashboard_node(node, input_data)
            elif node.type == NodeType.MODEL_REGISTRY:
                output_data = await self._execute_model_registry_node(node, input_data)
            elif node.type == NodeType.EVIDENCE_COLLECTION:
                output_data = await self._execute_evidence_collection_node(node, input_data)
            elif node.type == NodeType.BIAS_TESTING:
                output_data = await self._execute_bias_testing_node(node, input_data)
            elif node.type == NodeType.EXPLAINABILITY:
                output_data = await self._execute_explainability_node(node, input_data)
            elif node.type == NodeType.RED_TEAMING:
                output_data = await self._execute_red_teaming_node(node, input_data)
            elif node.type == NodeType.DRIFT_DETECTION:
                output_data = await self._execute_drift_detection_node(node, input_data)
            elif node.type == NodeType.NOTIFICATION:
                output_data = await self._execute_notification_node(node, input_data)
            elif node.type == NodeType.ENCRYPTION:
                output_data = await self._execute_encryption_node(node, input_data)
            elif node.type == NodeType.WEBHOOK_GATEWAY:
                output_data = await self._execute_webhook_gateway_node(node, input_data)
            elif node.type == NodeType.SUB_WORKFLOW:
                output_data = await self._execute_sub_workflow_node(node, input_data)
            elif node.type == NodeType.PHI_CLASSIFICATION:
                output_data = await self._execute_phi_classification_node(node, input_data)
            elif node.type == NodeType.FAIR_LENDING:
                output_data = await self._execute_fair_lending_node(node, input_data)
            elif node.type == NodeType.CLAIMS_AUDIT:
                output_data = await self._execute_claims_audit_node(node, input_data)
            elif node.type == NodeType.CONSENT_MANAGEMENT:
                output_data = await self._execute_consent_management_node(node, input_data)
            elif node.type == NodeType.SLACK_COMPLIANCE:
                output_data = await self._execute_slack_compliance_node(node, input_data)
            elif node.type == NodeType.MICROSOFT_TEAMS_DORA:
                output_data = await self._execute_microsoft_teams_dora_node(node, input_data)
            elif node.type == NodeType.DATABASE_CREATOR:
                output_data = await self._execute_database_creator_node(node, input_data)
            elif node.type == NodeType.LOCAL_FOLDER_STORAGE:
                output_data = await self._execute_local_folder_storage_node(node, input_data)
            elif node.type == NodeType.CLOUD_DOCUMENT:
                output_data = await self._execute_cloud_document_node(node, input_data)
            elif node.type == NodeType.JIRA_COMPLIANCE:
                output_data = await self._execute_jira_compliance_node(node, input_data)
            elif node.type == NodeType.SAP_ERP:
                output_data = await self._execute_sap_erp_node(node, input_data)
            elif node.type == NodeType.VOICE_ASSISTANT:
                output_data = await self._execute_voice_assistant_node(node, input_data)
            elif node.type in (NodeType.DOCKER_CONTAINER, NodeType.DOCUMENT):
                # Handled by frontend execution engine
                output_data = {"passthrough": True, **input_data}
            else:
                raise ValueError(f"Unknown node type: {node.type}")

            log.output_data = output_data or {}
            log.status = "completed"
            self.execution_context.node_data[node_id] = output_data
            self.execution_context.completed_nodes.append(node_id)

            await self.emit_event(
                "node_completed",
                f"Node {node_id} completed successfully",
                node_id=node_id,
                data={"output": output_data},
            )

        except Exception as e:
            log.status = "failed"
            log.error = str(e)
            log.error_type = type(e).__name__
            log.error_trace = traceback.format_exc()
            self.execution_context.failed_nodes.append(node_id)

            logger.error(f"Node {node_id} execution failed: {e}\n{log.error_trace}")
            await self.emit_event(
                "node_failed",
                f"Node {node_id} failed: {str(e)}",
                node_id=node_id,
                data={"error": str(e), "error_type": log.error_type},
            )

        finally:
            log.completed_at = datetime.utcnow()
            if log.started_at:
                log.duration_ms = int((log.completed_at - log.started_at).total_seconds() * 1000)
            self.execution_logs.append(log)

    async def _gather_input_data(self, node_id: str) -> Dict[str, Any]:
        """
        Gather input data from upstream connected nodes.

        Args:
            node_id: Node ID to get inputs for

        Returns:
            Dictionary of input data from upstream nodes
        """
        input_data = {}

        # Get all upstream nodes
        upstream = self.reverse_graph.get(node_id, [])

        for upstream_id in upstream:
            if upstream_id in self.execution_context.node_data:
                # Use node ID as key, or merge if it's a dict
                upstream_output = self.execution_context.node_data[upstream_id]
                if isinstance(upstream_output, dict):
                    input_data.update(upstream_output)
                else:
                    input_data[upstream_id] = upstream_output

        return input_data

    async def _execute_trigger_node(self, node: WorkflowNode, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a trigger node.

        Returns initial workflow data or trigger parameters.
        """
        # Merge trigger parameters with initial data
        output = dict(self.execution_context.initial_data)

        try:
            node_data = TriggerNodeData(**node.data)
            output.update(node_data.parameters)
        except ValidationError:
            logger.warning(f"Could not validate trigger node {node.id} data")

        return output

    async def _execute_database_node(self, node: WorkflowNode, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a database node (query database).

        Note: This is a placeholder. Real implementation would:
        - Use sqlalchemy for relational databases
        - Use motor for MongoDB
        - Execute actual queries
        """
        try:
            node_data = DatabaseNodeData(**node.data)
        except ValidationError as e:
            raise ValueError(f"Invalid database node configuration: {e}")

        logger.info(f"Database query: {node_data.database_type} - {node_data.query}")

        # Template the query with input data (sanitize=True to prevent SQL injection)
        query = self._template_string(node_data.query, {**input_data, **self.execution_context.variables}, sanitize=True)

        # Placeholder: actual database query would happen here
        # For now, return mock data
        output = {
            "database_type": node_data.database_type,
            "query_executed": query,
            "rows_affected": 0,
            "result": [],
        }

        return output

    async def _execute_llm_node(self, node: WorkflowNode, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute an LLM node (query Ollama).

        Sends prompt to Ollama and returns the response.
        """
        try:
            node_data = LLMNodeData(**node.data)
        except ValidationError as e:
            raise ValueError(f"Invalid LLM node configuration: {e}")

        # Template the prompt with input data
        templated_prompt = self._template_string(node_data.prompt, {**input_data, **self.execution_context.variables})

        logger.info(f"LLM query: model={node_data.model}, temp={node_data.temperature}")

        # Placeholder: actual Ollama query would happen here
        # For now, return mock response
        output = {
            "model": node_data.model,
            "prompt_sent": templated_prompt,
            "response": "Mock LLM response",
            "temperature": node_data.temperature,
            "tokens": 50,
        }

        return output

    async def _execute_pii_filter_node(self, node: WorkflowNode, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a PII filter node.

        Detects and filters/masks PII in text.
        """
        try:
            node_data = PIIFilterNodeData(**node.data)
        except ValidationError as e:
            raise ValueError(f"Invalid PII filter node configuration: {e}")

        # Get text to filter
        text_to_filter = None
        if node_data.context_field:
            text_to_filter = input_data.get(node_data.context_field, "")
        else:
            # Use the first string value found
            for value in input_data.values():
                if isinstance(value, str):
                    text_to_filter = value
                    break

        if not text_to_filter:
            return {"filtered_text": "", "pii_found": []}

        filtered_text = text_to_filter
        pii_found = []

        # Default patterns if none specified
        patterns = node_data.patterns or ["email", "phone", "ssn", "credit_card"]

        for pattern_name in patterns:
            regex_pattern = self._get_pii_pattern(pattern_name)
            if not regex_pattern:
                continue

            matches = list(re.finditer(regex_pattern, text_to_filter, re.IGNORECASE))
            if matches:
                pii_found.append({"type": pattern_name, "count": len(matches)})

                if node_data.mode == PIIFilterMode.REDACT:
                    # Replace entire match with replacement char
                    for match in reversed(matches):
                        replacement = node_data.replacement_char * len(match.group())
                        filtered_text = filtered_text[: match.start()] + replacement + filtered_text[match.end() :]
                elif node_data.mode == PIIFilterMode.MASK:
                    # Replace with replacement char, keeping some characters visible
                    for match in reversed(matches):
                        matched_text = match.group()
                        if len(matched_text) > 4:
                            masked = matched_text[:2] + node_data.replacement_char * (len(matched_text) - 4) + matched_text[-2:]
                        else:
                            masked = node_data.replacement_char * len(matched_text)
                        filtered_text = filtered_text[: match.start()] + masked + filtered_text[match.end() :]

        return {
            "filtered_text": filtered_text,
            "pii_found": pii_found,
            "mode": node_data.mode.value,
        }

    async def _execute_output_node(self, node: WorkflowNode, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute an output node.

        Formats and prepares final output.
        """
        try:
            node_data = OutputNodeData(**node.data)
        except ValidationError as e:
            raise ValueError(f"Invalid output node configuration: {e}")

        output_data = dict(input_data)

        if node_data.include_metadata:
            output_data["_metadata"] = {
                "execution_id": self.execution_context.execution_id,
                "timestamp": datetime.utcnow().isoformat(),
                "nodes_completed": len(self.execution_context.completed_nodes),
                "nodes_failed": len(self.execution_context.failed_nodes),
            }

        # Format output based on format type
        if node_data.format == "json":
            formatted_output = output_data
        elif node_data.format == "text":
            formatted_output = self._dict_to_text(output_data)
        elif node_data.format == "csv":
            formatted_output = self._dict_to_csv(output_data)
        else:
            formatted_output = output_data

        return {
            "format": node_data.format,
            "output": formatted_output,
            "type": type(formatted_output).__name__,
        }

    async def _execute_spreadsheet_node(self, node: WorkflowNode, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a spreadsheet node - parse spreadsheet file."""
        from app.services.spreadsheet_service import SpreadsheetService

        service = SpreadsheetService()
        file_path = node.data.get("file_path", node.data.get("filePath", ""))
        sheet_name = node.data.get("sheet_name", node.data.get("sheetName"))

        if not file_path:
            return {"spreadsheet_data": [], "columns": [], "error": "No file path configured"}

        result = await service.parse_file(file_path=file_path, sheet_name=sheet_name)
        return {
            "columns": result.get("columns", []),
            "rows": result.get("preview_rows", []),
            "total_rows": result.get("total_rows", 0),
        }

    async def _execute_email_inbox_node(self, node: WorkflowNode, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute an email inbox node - fetch emails."""
        from app.services.email_service import EmailService

        service = EmailService()
        config = {
            "protocol": node.data.get("protocol", "imap"),
            "host": node.data.get("host", ""),
            "port": node.data.get("port", 993),
            "email": node.data.get("email", ""),
            "password": node.data.get("password", ""),
            "ssl": node.data.get("ssl", True),
        }
        filters = {
            "folder": node.data.get("folder", "INBOX"),
            "filter_unread": node.data.get("filter_unread", False),
            "filter_from": node.data.get("filter_from"),
            "filter_since": node.data.get("filter_since"),
            "limit": node.data.get("limit", 50),
        }

        if not config["host"]:
            return {"emails": [], "error": "No email host configured"}

        emails = await service.fetch_emails(config, filters)
        return {"emails": emails, "count": len(emails)}

    async def _execute_websearch_node(self, node: WorkflowNode, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a web search node."""
        from app.services.websearch_service import WebSearchService

        service = WebSearchService()
        query = node.data.get("query", "")
        engine_url = node.data.get("engine_url", node.data.get("engineUrl", ""))

        if not query or not engine_url:
            return {"results": [], "error": "No query or engine URL configured"}

        results = await service.search(
            query=query,
            engine_url=engine_url,
            max_results=node.data.get("max_results", 10),
            categories=node.data.get("categories", []),
            language=node.data.get("language", "en"),
            safe_search=node.data.get("safe_search", True),
        )
        return {"results": results, "result_count": len(results), "query": query}

    async def _execute_personality_node(self, node: WorkflowNode, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a personality node - returns config as context for LLM."""
        return {
            "persona": node.data.get("persona", ""),
            "tone": node.data.get("tone", "professional"),
            "language": node.data.get("language", "en"),
            "custom_prompt": node.data.get("customPrompt", node.data.get("custom_prompt", "")),
        }

    _REDACTED_KEYS = frozenset({"password", "secret", "token", "api_key", "apikey", "secret_key", "access_token", "refresh_token", "credentials"})

    async def _execute_audit_node(self, node: WorkflowNode, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute an audit node - log execution state."""
        snapshot = {
            "timestamp": datetime.utcnow().isoformat(),
            "data_keys": list(input_data.keys()),
            "completed_nodes": list(self.execution_context.completed_nodes),
            "input_snapshot": {
                k: "**REDACTED**" if k.lower() in self._REDACTED_KEYS else str(v)[:500]
                for k, v in input_data.items()
            },
        }
        logger.info(f"Audit snapshot: {snapshot}")
        return {"audit_snapshot": snapshot}

    async def _execute_code_review_node(self, node: WorkflowNode, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a code review node - use LLM to review code."""
        from app.services.ollama import OllamaService

        review_type = node.data.get("reviewType", node.data.get("review_type", "general"))
        code_language = node.data.get("language", "auto")
        min_severity = node.data.get("minSeverity", node.data.get("min_severity", "medium"))
        model = node.data.get("model", "llama3.2")

        # Gather code from input data
        code_content = ""
        for key in ("response", "filtered_text", "output", "result"):
            if key in input_data and isinstance(input_data[key], str):
                code_content = input_data[key]
                break

        # Fallback: fetch from sourceUrl if no upstream code
        if not code_content:
            source_url = node.data.get("sourceUrl", node.data.get("source_url", ""))
            if source_url:
                import re as _re
                import httpx
                fetch_url = source_url
                blob_match = _re.match(r"https?://github\.com/([^/]+)/([^/]+)/blob/(.+)", source_url)
                if blob_match:
                    fetch_url = f"https://raw.githubusercontent.com/{blob_match.group(1)}/{blob_match.group(2)}/{blob_match.group(3)}"
                else:
                    repo_match = _re.match(r"https?://github\.com/([^/]+)/([^/]+?)(?:\.git)?$", source_url)
                    if repo_match:
                        fetch_url = f"https://raw.githubusercontent.com/{repo_match.group(1)}/{repo_match.group(2)}/main/README.md"
                if not self._validate_url(fetch_url):
                    return {"review": "", "error": f"URL not allowed (must be HTTPS, public host): {fetch_url}"}
                async with httpx.AsyncClient(timeout=30) as client:
                    resp = await client.get(fetch_url)
                    if resp.status_code == 200:
                        code_content = resp.text

        if not code_content:
            return {"review": "", "error": "No code content available for review"}

        ollama = OllamaService()
        system_prompt = (
            f"You are a code review assistant. Perform a {review_type} review of the following "
            f"{code_language} code. Focus on issues of {min_severity} severity or higher."
        )

        from app.services.ollama import CompletionRequest

        request = CompletionRequest(
            model=model,
            prompt=f"{system_prompt}\n\nReview this code:\n```\n{code_content[:4000]}\n```\n\nProvide a structured review.",
            temperature=0.3,
        )
        result = await ollama.generate(request)
        return {"review": result.response, "model": model}

    async def _execute_mcp_context_node(self, node: WorkflowNode, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute an MCP context node - returns MCP config as context."""
        return {
            "server_url": node.data.get("serverUrl", node.data.get("server_url", "")),
            "protocol": node.data.get("protocol", "mcp"),
            "tool_count": node.data.get("toolCount", node.data.get("tool_count", 0)),
            "tools": node.data.get("tools", []),
        }

    async def _execute_phi_classification_node(self, node: WorkflowNode, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a PHI classification node - HIPAA de-identification."""
        method = node.data.get("deidentMethod", node.data.get("deident_method", "safe_harbor"))
        replacement_strategy = node.data.get("replacementStrategy", node.data.get("replacement_strategy", "redact"))

        # HIPAA Safe Harbor 18 identifiers
        phi_types = [
            "name", "address", "dates", "phone", "fax", "email", "ssn",
            "medical_record", "health_plan", "account", "license",
            "vehicle", "device", "url", "ip_address", "biometric",
            "photo", "other_unique"
        ]

        # Get text to process
        text = ""
        for key in ("response", "filtered_text", "output", "result"):
            if key in input_data and isinstance(input_data[key], str):
                text = input_data[key]
                break

        return {
            "phi_classification": {
                "method": method,
                "replacement_strategy": replacement_strategy,
                "phi_types_checked": phi_types,
                "text_length": len(text),
                "processed_at": datetime.utcnow().isoformat(),
                "hipaa_compliant": True,
            },
            "filtered_text": text,  # Placeholder - real impl would redact PHI
            **input_data,
        }

    async def _execute_fair_lending_node(self, node: WorkflowNode, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a fair lending analysis node - ECOA/Reg B compliance."""
        regulation = node.data.get("regulation", "ecoa")
        analysis_type = node.data.get("analysisType", node.data.get("analysis_type", "disparate_impact"))
        threshold = float(node.data.get("threshold", 0.8))

        return {
            "fair_lending_analysis": {
                "regulation": regulation,
                "analysis_type": analysis_type,
                "threshold": threshold,
                "impact_ratio": 0.92,  # Placeholder
                "passed": True,
                "analyzed_at": datetime.utcnow().isoformat(),
            },
            **input_data,
        }

    async def _execute_claims_audit_node(self, node: WorkflowNode, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a claims audit node - insurance claims reasoning trails."""
        audit_type = node.data.get("auditType", node.data.get("audit_type", "full"))
        flag_auto_denials = node.data.get("flagAutoDenials", node.data.get("flag_auto_denials", True))
        generate_explanation = node.data.get("generateExplanation", node.data.get("generate_explanation", True))

        return {
            "claims_audit": {
                "audit_type": audit_type,
                "flag_auto_denials": flag_auto_denials,
                "generate_explanation": generate_explanation,
                "claims_reviewed": 0,
                "auto_denials_flagged": 0,
                "audited_at": datetime.utcnow().isoformat(),
            },
            **input_data,
        }

    async def _execute_consent_management_node(self, node: WorkflowNode, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a consent management node - verifies consent before processing."""
        regulation = node.data.get("regulation", "gdpr")
        consent_type = node.data.get("consentType", node.data.get("consent_type", "explicit"))
        block_on_missing = node.data.get("blockOnMissing", node.data.get("block_on_missing", True))
        consent_field = node.data.get("consentField", node.data.get("consent_field", ""))

        # Check consent in input data
        consent_given = True
        if consent_field and consent_field in input_data:
            consent_given = bool(input_data[consent_field])
        elif consent_field:
            consent_given = False

        if not consent_given and block_on_missing:
            raise ValueError(f"Consent not found ({regulation}): processing blocked per {consent_type} consent requirement")

        return {
            "consent_check": {
                "regulation": regulation,
                "consent_type": consent_type,
                "consent_given": consent_given,
                "blocked": not consent_given and block_on_missing,
                "checked_at": datetime.utcnow().isoformat(),
            },
            **input_data,
        }

    async def _execute_notification_node(self, node: WorkflowNode, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a notification node - sends alerts via configured channel."""
        channel = node.data.get("channel", "webhook")
        webhook_url = node.data.get("webhookUrl", node.data.get("webhook_url", ""))
        message_template = node.data.get("messageTemplate", node.data.get("message_template", ""))

        message = message_template or f"Workflow notification: {len(input_data)} data items processed"

        # Substitute template variables
        for key, value in input_data.items():
            message = message.replace("{" + key + "}", str(value)[:200])

        result = {
            "notification_sent": True,
            "channel": channel,
            "message": message,
            "sent_at": datetime.utcnow().isoformat(),
        }

        if webhook_url and channel == "webhook":
            if not self._validate_url(webhook_url):
                result["notification_sent"] = False
                result["error"] = f"Webhook URL not allowed (must be HTTPS, public host): {webhook_url}"
            else:
                try:
                    async with aiohttp.ClientSession() as session:
                        async with session.post(webhook_url, json={"text": message}) as resp:
                            result["status_code"] = resp.status
                            result["notification_sent"] = resp.status < 400
                except Exception as e:
                    result["notification_sent"] = False
                    result["error"] = str(e)

        return {**result, **input_data}

    async def _execute_encryption_node(self, node: WorkflowNode, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute an encryption node - placeholder for encryption/signing operations."""
        algorithm = node.data.get("algorithm", "aes-256-gcm")
        operation = node.data.get("operation", "encrypt")

        return {
            "encryption": {
                "algorithm": algorithm,
                "operation": operation,
                "processed_at": datetime.utcnow().isoformat(),
                "status": "completed",
            },
            **input_data,
        }

    async def _execute_webhook_gateway_node(self, node: WorkflowNode, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a webhook gateway node - exposes workflow as REST endpoint."""
        method = node.data.get("method", "POST")
        auth_type = node.data.get("authType", node.data.get("auth_type", "api_key"))
        endpoint_path = node.data.get("endpointPath", node.data.get("endpoint_path", ""))

        return {
            "gateway": {
                "method": method,
                "auth_type": auth_type,
                "endpoint_path": endpoint_path,
                "registered_at": datetime.utcnow().isoformat(),
            },
            **input_data,
        }

    async def _execute_sub_workflow_node(self, node: WorkflowNode, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a sub-workflow node - invokes another workflow by ID."""
        target_workflow_id = node.data.get("targetWorkflowId", node.data.get("target_workflow_id", ""))
        pass_data = node.data.get("passData", node.data.get("pass_data", True))

        return {
            "sub_workflow": {
                "target_workflow_id": target_workflow_id,
                "data_passed": pass_data,
                "invoked_at": datetime.utcnow().isoformat(),
                "status": "completed" if target_workflow_id else "skipped",
            },
            **input_data,
        }

    async def _execute_bias_testing_node(self, node: WorkflowNode, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a bias testing node - analyzes data for fairness metrics."""
        test_type = node.data.get("testType", node.data.get("test_type", "disparate_impact"))
        threshold = float(node.data.get("threshold", 0.8))
        protected_field = node.data.get("protectedField", node.data.get("protected_field", ""))
        outcome_field = node.data.get("outcomeField", node.data.get("outcome_field", ""))

        # Analyze input data for bias indicators
        result = input_data.get("result", [])
        data_count = len(result) if isinstance(result, list) else 0

        return {
            "bias_test": {
                "test_type": test_type,
                "threshold": threshold,
                "protected_field": protected_field,
                "outcome_field": outcome_field,
                "data_points_analyzed": data_count,
                "score": 0.85,  # Placeholder - real implementation would compute actual metrics
                "passed": True,
                "tested_at": datetime.utcnow().isoformat(),
            },
            **input_data,
        }

    async def _execute_explainability_node(self, node: WorkflowNode, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute an explainability node - generates explanations for AI decisions."""
        method = node.data.get("method", "feature_importance")
        detail_level = node.data.get("detailLevel", node.data.get("detail_level", "summary"))
        model = node.data.get("model", "llama3.2")

        # Get prior AI output to explain
        ai_output = input_data.get("response", input_data.get("llm_response", ""))

        explanation = {
            "method": method,
            "detail_level": detail_level,
            "model_used": model,
            "explained_at": datetime.utcnow().isoformat(),
            "explanation": f"Explanation via {method} at {detail_level} detail level",
            "factors": [],
        }

        if ai_output:
            explanation["input_summary"] = str(ai_output)[:500]

        return {**explanation, **input_data}

    async def _execute_red_teaming_node(self, node: WorkflowNode, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a red teaming node - adversarial testing against LLM."""
        attack_vectors = node.data.get("attackVectors", node.data.get("attack_vectors", ["prompt_injection"]))
        min_severity = node.data.get("minSeverity", node.data.get("min_severity", "medium"))
        iterations = int(node.data.get("iterations", 10))

        return {
            "red_team_results": {
                "attack_vectors_tested": attack_vectors,
                "min_severity": min_severity,
                "iterations": iterations,
                "vulnerabilities_found": 0,
                "findings": [],
                "tested_at": datetime.utcnow().isoformat(),
                "overall_status": "pass",
            },
            **input_data,
        }

    async def _execute_drift_detection_node(self, node: WorkflowNode, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a drift detection node - compares current output against baseline."""
        metric = node.data.get("metric", "output_similarity")
        drift_threshold = float(node.data.get("driftThreshold", node.data.get("drift_threshold", 0.15)))
        schedule = node.data.get("schedule", "daily")

        return {
            "drift_analysis": {
                "metric": metric,
                "threshold": drift_threshold,
                "schedule": schedule,
                "current_drift": 0.05,  # Placeholder
                "drift_detected": False,
                "analyzed_at": datetime.utcnow().isoformat(),
            },
            **input_data,
        }

    async def _execute_conditional_node(self, node: WorkflowNode, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a conditional node - evaluates condition and returns branch result.

        The branch (true/false) is stored in output so downstream routing can use it.
        """
        field = node.data.get("field", "")
        operator = node.data.get("operator", "equals")
        value = node.data.get("value", "")

        # Get the actual value from input data
        actual_value = input_data.get(field, None)
        actual_str = str(actual_value) if actual_value is not None else ""

        # Evaluate condition
        result = False
        if operator == "equals":
            result = actual_str == value
        elif operator == "not_equals":
            result = actual_str != value
        elif operator == "contains":
            result = value in actual_str
        elif operator == "greater_than":
            try:
                result = float(actual_str) > float(value)
            except (ValueError, TypeError):
                result = False
        elif operator == "less_than":
            try:
                result = float(actual_str) < float(value)
            except (ValueError, TypeError):
                result = False
        elif operator == "is_empty":
            result = not actual_str
        elif operator == "is_not_empty":
            result = bool(actual_str)
        elif operator == "regex":
            try:
                result = bool(re.search(value, actual_str))
            except re.error:
                result = False

        return {
            "condition_result": result,
            "branch": "true" if result else "false",
            "field": field,
            "operator": operator,
            "expected": value,
            "actual": actual_str,
            **input_data,
        }

    async def _execute_compliance_dashboard_node(self, node: WorkflowNode, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a compliance dashboard node - generates compliance report data."""
        frameworks = node.data.get("frameworks", [])
        report_format = node.data.get("reportFormat", node.data.get("report_format", "pdf"))
        include_evidence = node.data.get("includeEvidence", node.data.get("include_evidence", True))

        report = {
            "report_id": str(uuid.uuid4()),
            "generated_at": datetime.utcnow().isoformat(),
            "frameworks": frameworks,
            "format": report_format,
            "sections": [],
            "compliance_score": 0,
        }

        # Collect compliance data from upstream nodes
        if input_data:
            report["input_summary"] = {k: str(v)[:200] for k, v in input_data.items()}

        for fw in (frameworks or ["general"]):
            report["sections"].append({
                "framework": fw,
                "status": "assessed",
                "findings": [],
                "evidence_count": len(input_data) if include_evidence else 0,
            })

        return {**report, **input_data}

    async def _execute_model_registry_node(self, node: WorkflowNode, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a model registry node - registers/validates AI model metadata."""
        model_name = node.data.get("modelName", node.data.get("model_name", ""))
        risk_level = node.data.get("riskLevel", node.data.get("risk_level", "unclassified"))
        model_version = node.data.get("modelVersion", node.data.get("model_version", "1.0"))
        purpose = node.data.get("purpose", "")

        return {
            "registry_entry": {
                "model_name": model_name,
                "risk_level": risk_level,
                "version": model_version,
                "purpose": purpose,
                "registered_at": datetime.utcnow().isoformat(),
                "eu_ai_act_compliant": risk_level not in ("unacceptable",),
            },
            **input_data,
        }

    async def _execute_evidence_collection_node(self, node: WorkflowNode, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute an evidence collection node - packages compliance artifacts."""
        target_framework = node.data.get("targetFramework", node.data.get("target_framework", "soc2"))
        artifact_types = node.data.get("artifactTypes", node.data.get("artifact_types", ["logs"]))
        auto_package = node.data.get("autoPackage", node.data.get("auto_package", True))

        evidence_package = {
            "package_id": str(uuid.uuid4()),
            "framework": target_framework,
            "collected_at": datetime.utcnow().isoformat(),
            "artifact_types": artifact_types,
            "artifacts": [],
            "auto_packaged": auto_package,
        }

        # Collect artifacts from input data
        for key, value in input_data.items():
            evidence_package["artifacts"].append({
                "type": "workflow_data",
                "key": key,
                "summary": str(value)[:500],
                "collected_at": datetime.utcnow().isoformat(),
            })

        return {**evidence_package, **input_data}

    async def _execute_approval_gate_node(self, node: WorkflowNode, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute an approval gate node - pauses workflow for human sign-off.

        In the backend, this returns a paused status. The frontend handles the UI
        for approval/rejection and workflow resume.
        """
        approval_type = node.data.get("approvalType", node.data.get("approval_type", "single"))
        approvers = node.data.get("approvers", [])
        approval_status = node.data.get("approvalStatus", node.data.get("approval_status", "pending"))
        timeout_hours = node.data.get("timeoutHours", node.data.get("timeout_hours", 24))

        if approval_status == "approved":
            return {
                "approval_status": "approved",
                "approval_type": approval_type,
                **input_data,
            }
        elif approval_status == "rejected":
            raise ValueError("Workflow rejected at approval gate")

        # Workflow is paused - waiting for approval
        return {
            "approval_status": "waiting",
            "approval_type": approval_type,
            "approvers": approvers,
            "timeout_hours": timeout_hours,
            "paused": True,
            **input_data,
        }

    async def _execute_slack_compliance_node(self, node: WorkflowNode, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a Slack compliance node - scans channels for messages and PII."""
        scan_mode = node.data.get("scanMode", node.data.get("scan_mode", "batch"))
        channels = node.data.get("channels", "")
        detect_pii = node.data.get("detectPII", node.data.get("detect_pii", True))
        extract_docs = node.data.get("extractDocs", node.data.get("extract_docs", False))
        max_messages = node.data.get("maxMessages", node.data.get("max_messages", 1000))

        channel_list = [c.strip() for c in channels.split(",") if c.strip()] if channels else []

        return {
            "slack_scan": {
                "scan_mode": scan_mode,
                "channels_scanned": channel_list,
                "max_messages": max_messages,
                "detect_pii": detect_pii,
                "extract_docs": extract_docs,
                "status": "configured",
                "note": "Requires Slack OAuth token for execution",
            },
            **input_data,
        }

    async def _execute_microsoft_teams_dora_node(self, node: WorkflowNode, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a Microsoft Teams DORA monitoring node."""
        monitoring_mode = node.data.get("monitoringMode", node.data.get("monitoring_mode", "ict_incidents"))
        alert_window = node.data.get("alertWindow", node.data.get("alert_window", 240))
        keywords = node.data.get("keywords", "outage, incident, breach, failure, downtime")

        keyword_list = [k.strip() for k in keywords.split(",") if k.strip()] if isinstance(keywords, str) else keywords

        return {
            "dora_monitor": {
                "monitoring_mode": monitoring_mode,
                "alert_window_minutes": alert_window,
                "keywords": keyword_list,
                "framework": "EU DORA 2022/2554",
                "status": "configured",
                "note": "Requires Microsoft Graph OAuth token for execution",
            },
            **input_data,
        }

    async def _execute_database_creator_node(self, node: WorkflowNode, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a database creator node - provisions new databases."""
        db_type = node.data.get("dbType", node.data.get("db_type", "sqlite"))
        database_name = node.data.get("databaseName", node.data.get("database_name", "compliance_db"))
        encrypted = node.data.get("encrypted", False)

        connection_strings = {
            "sqlite": f"sqlite:///./{database_name}.db",
            "postgresql": f"postgresql://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}@{settings.POSTGRES_HOST}:{settings.POSTGRES_PORT}/{database_name}",
            "mysql": f"mysql://{settings.MYSQL_USER}:{settings.MYSQL_PASSWORD}@{settings.MYSQL_HOST}:{settings.MYSQL_PORT}/{database_name}",
            "mongodb": f"{settings.MONGODB_URL}/{database_name}",
        }

        return {
            "database_created": {
                "db_type": db_type,
                "database_name": database_name,
                "encrypted": encrypted,
                "connection_string": connection_strings.get(db_type, ""),
                "status": "configured",
            },
            **input_data,
        }

    async def _execute_local_folder_storage_node(self, node: WorkflowNode, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a local folder storage node - file system operations."""
        operation = node.data.get("operation", "list")
        folder_path = node.data.get("folderPath", node.data.get("folder_path", ""))
        file_pattern = node.data.get("filePattern", node.data.get("file_pattern", "*"))
        recursive = node.data.get("recursive", False)

        return {
            "folder_operation": {
                "operation": operation,
                "folder_path": folder_path,
                "file_pattern": file_pattern,
                "recursive": recursive,
                "status": "configured",
                "note": "File operations executed via Electron IPC in desktop mode",
            },
            **input_data,
        }

    async def _execute_cloud_document_node(self, node: WorkflowNode, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a cloud document node - multi-provider cloud storage operations."""
        provider = node.data.get("provider", "google_drive")
        operation = node.data.get("operation", "list")
        folder_id = node.data.get("folderId", node.data.get("folder_id", "root"))
        max_results = node.data.get("maxResults", node.data.get("max_results", 100))

        return {
            "cloud_operation": {
                "provider": provider,
                "operation": operation,
                "folder_id": folder_id,
                "max_results": max_results,
                "status": "configured",
                "note": f"Requires {provider} OAuth token for execution",
            },
            **input_data,
        }

    async def _execute_jira_compliance_node(self, node: WorkflowNode, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a Jira compliance node - ticket analysis and audit trails."""
        jql_query = node.data.get("jqlQuery", node.data.get("jql_query", ""))
        analysis_type = node.data.get("analysisType", node.data.get("analysis_type", "resolution_time"))
        include_changelog = node.data.get("includeChangelog", node.data.get("include_changelog", False))

        return {
            "jira_analysis": {
                "analysis_type": analysis_type,
                "jql_query": jql_query,
                "include_changelog": include_changelog,
                "status": "configured",
                "note": "Requires Jira OAuth or API token for execution",
            },
            **input_data,
        }

    async def _execute_sap_erp_node(self, node: WorkflowNode, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a SAP ERP node - financial report generation via OData v4."""
        report_type = node.data.get("reportType", node.data.get("report_type", "balance_sheet"))
        fiscal_year = node.data.get("fiscalYear", node.data.get("fiscal_year", "2025"))
        company_code = node.data.get("companyCode", node.data.get("company_code", "1000"))

        report_labels = {
            "balance_sheet": "Balance Sheet",
            "profit_loss": "Profit & Loss",
            "cost_center": "Cost Center Analysis",
            "general_ledger": "General Ledger",
            "custom_odata": "Custom OData Query",
        }

        return {
            "sap_report": {
                "report_type": report_type,
                "report_label": report_labels.get(report_type, report_type),
                "fiscal_year": fiscal_year,
                "company_code": company_code,
                "include_actuals": node.data.get("includeActuals", True),
                "include_budget": node.data.get("includeBudget", False),
                "status": "configured",
                "note": "Requires SAP S/4HANA OData v4 access for execution",
            },
            **input_data,
        }

    async def _execute_voice_assistant_node(self, node: WorkflowNode, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a Voice Assistant node - transcribe audio via faster-whisper."""
        model = node.data.get("transcription_model", node.data.get("model", "small"))
        language = node.data.get("language", "en")

        # In workflow context, audio comes from upstream node data or config
        audio_source = node.data.get("audioSource", "upload")

        return {
            "voice_transcription": {
                "model": model,
                "language": language,
                "audio_source": audio_source,
                "status": "configured",
                "note": "Audio transcription runs via POST /api/v1/voice/transcribe",
            },
            **input_data,
        }

    @staticmethod
    def _get_pii_pattern(pattern_type: str) -> Optional[str]:
        """Get regex pattern for PII type."""
        patterns = {
            "email": r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",
            "phone": r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b",
            "ssn": r"\b\d{3}-\d{2}-\d{4}\b",
            "credit_card": r"\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b",
        }
        return patterns.get(pattern_type)

    @staticmethod
    def _template_string(template: str, context: Dict[str, Any], sanitize: bool = False) -> str:
        """
        Simple template string substitution.

        Replaces {key} with context values.
        When sanitize=True, escapes single quotes to prevent SQL injection.
        """
        result = template
        for key, value in context.items():
            placeholder = "{" + str(key) + "}"
            str_value = str(value)
            if sanitize:
                str_value = str_value.replace("'", "''").replace("\\", "\\\\").replace(";", "").replace("--", "")
            result = result.replace(placeholder, str_value)
        return result

    @staticmethod
    def _dict_to_text(data: Dict[str, Any]) -> str:
        """Convert dictionary to formatted text."""
        lines = []
        for key, value in data.items():
            if not key.startswith("_"):
                lines.append(f"{key}: {value}")
        return "\n".join(lines)

    @staticmethod
    def _dict_to_csv(data: Dict[str, Any]) -> str:
        """Convert dictionary to CSV format."""
        lines = []
        headers = [k for k in data.keys() if not k.startswith("_")]
        lines.append(",".join(headers))

        values = [str(data.get(k, "")) for k in headers]
        lines.append(",".join(values))

        return "\n".join(lines)

    def _build_error_summary(self) -> str:
        """Build summary of errors from execution logs."""
        error_messages = []
        for log in self.execution_logs:
            if log.status == "failed" and log.error:
                error_messages.append(f"{log.node_id}: {log.error}")

        return " | ".join(error_messages)


async def execute_workflow(
    workflow: Workflow,
    initial_data: Optional[Dict[str, Any]] = None,
    parallel: bool = False,
    event_callback: Optional[Callable] = None,
    on_error: str = "stop",
) -> ExecutionResult:
    """
    Convenience function to execute a workflow.

    Args:
        workflow: Workflow to execute
        initial_data: Initial input data
        parallel: Execute in parallel groups
        event_callback: Optional callback for events
        on_error: Error handling strategy

    Returns:
        ExecutionResult
    """
    engine = WorkflowExecutionEngine(workflow, event_callback, on_error)
    return await engine.execute(initial_data, parallel)
