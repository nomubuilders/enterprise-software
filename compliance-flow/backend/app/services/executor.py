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
import re
import uuid
import traceback
from typing import Any, Callable, Dict, List, Optional, Set, Tuple
from datetime import datetime
from collections import defaultdict, deque
import logging

import aiohttp
from pydantic import ValidationError

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

        # Template the query with input data
        query = self._template_string(node_data.query, {**input_data, **self.execution_context.variables})

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

    async def _execute_audit_node(self, node: WorkflowNode, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute an audit node - log execution state."""
        snapshot = {
            "timestamp": datetime.utcnow().isoformat(),
            "data_keys": list(input_data.keys()),
            "completed_nodes": list(self.execution_context.completed_nodes),
            "input_snapshot": {k: str(v)[:500] for k, v in input_data.items()},
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

        if not code_content:
            return {"review": "", "error": "No code content available for review"}

        ollama = OllamaService()
        system_prompt = (
            f"You are a code review assistant. Perform a {review_type} review of the following "
            f"{code_language} code. Focus on issues of {min_severity} severity or higher."
        )

        result = await ollama.generate(
            model=model,
            prompt=f"Review this code:\n```\n{code_content[:4000]}\n```\n\nProvide a structured review.",
            system=system_prompt,
            temperature=0.3,
        )
        return {"review": result.get("response", ""), "model": model}

    async def _execute_mcp_context_node(self, node: WorkflowNode, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute an MCP context node - returns MCP config as context."""
        return {
            "server_url": node.data.get("serverUrl", node.data.get("server_url", "")),
            "protocol": node.data.get("protocol", "mcp"),
            "tool_count": node.data.get("toolCount", node.data.get("tool_count", 0)),
            "tools": node.data.get("tools", []),
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
    def _template_string(template: str, context: Dict[str, Any]) -> str:
        """
        Simple template string substitution.

        Replaces {key} with context values.
        """
        result = template
        for key, value in context.items():
            placeholder = "{" + str(key) + "}"
            result = result.replace(placeholder, str(value))
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
