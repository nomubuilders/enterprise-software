"""
Docker container execution service.
Uses the Python docker SDK to manage containers with security hardening.
All blocking Docker SDK calls are wrapped with asyncio.to_thread().
"""

import asyncio
import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import AsyncGenerator, Optional

import docker
from docker.errors import DockerException, ImageNotFound, NotFound, APIError
from loguru import logger

from app.core.config import settings
from app.models.docker import (
    ApprovedImage,
    ContainerAuditLog,
    ContainerExecutionStatus,
    ContainerLogEntry,
    ContainerStatus,
    DockerHealthStatus,
    ExecuteContainerRequest,
    ExecuteContainerResponse,
    NetworkMode,
    ResourceUsage,
    RuntimeType,
    StopContainerResponse,
)


class DockerService:
    """Manages Docker container lifecycle with security enforcement."""

    def __init__(self):
        self._client: Optional[docker.DockerClient] = None
        self._approved_images: list[ApprovedImage] = []
        self._executions: dict[str, ContainerExecutionStatus] = {}
        self._watchdog_tasks: dict[str, asyncio.Task] = {}
        self._container_ids: dict[str, str] = {}  # execution_id -> container_id

    async def initialize(self):
        """Connect to Docker daemon and load approved images."""
        try:
            self._client = await asyncio.to_thread(
                docker.DockerClient.from_env,
            )
            info = await asyncio.to_thread(self._client.info)
            logger.info(f"Connected to Docker daemon: {info.get('ServerVersion', 'unknown')}")
        except DockerException as e:
            logger.warning(f"Docker daemon not available: {e}")
            self._client = None

        # Load approved images
        images_path = Path(settings.APPROVED_IMAGES_PATH)
        if images_path.exists():
            with open(images_path) as f:
                raw = json.load(f)
            self._approved_images = [ApprovedImage.model_validate(img) for img in raw]
            logger.info(f"Loaded {len(self._approved_images)} approved images")
        else:
            logger.warning(f"Approved images file not found: {images_path}")

    # ------------------------------------------------------------------
    # Health
    # ------------------------------------------------------------------

    async def get_health(self) -> DockerHealthStatus:
        """Check Docker daemon connectivity."""
        if not self._client:
            return DockerHealthStatus(available=False, runtime=RuntimeType.UNKNOWN, error="Docker client not initialized")

        try:
            version_info = await asyncio.to_thread(self._client.version)
            # Detect podman vs docker
            runtime = RuntimeType.DOCKER
            components = version_info.get("Components", [])
            for c in components:
                if "podman" in c.get("Name", "").lower():
                    runtime = RuntimeType.PODMAN
                    break

            return DockerHealthStatus(
                available=True,
                version=version_info.get("Version"),
                api_version=version_info.get("ApiVersion"),
                runtime=runtime,
            )
        except DockerException as e:
            return DockerHealthStatus(available=False, runtime=RuntimeType.UNKNOWN, error=str(e))

    # ------------------------------------------------------------------
    # Images
    # ------------------------------------------------------------------

    async def get_approved_images(self) -> list[ApprovedImage]:
        return list(self._approved_images)

    def _find_approved_image(self, image: str, tag: str) -> Optional[ApprovedImage]:
        for img in self._approved_images:
            if img.name == image and img.tag == tag:
                return img
        return None

    # ------------------------------------------------------------------
    # Execute
    # ------------------------------------------------------------------

    async def execute_container(self, req: ExecuteContainerRequest) -> ExecuteContainerResponse:
        """Validate, create, and start a container."""
        if not self._client:
            raise RuntimeError("Docker daemon not available")

        # Validate image against allowlist
        approved = self._find_approved_image(req.image, req.tag)
        if not approved:
            raise ValueError(f"Image {req.image}:{req.tag} is not in the approved allowlist")

        # Enforce resource ceilings from allowlist
        cpu_limit = min(req.cpu_limit, approved.max_cpu)
        memory_limit = min(req.memory_limit, approved.max_memory)

        # Build security profile
        sec = req.security_profile
        if sec is None:
            from app.models.docker import SecurityProfile
            sec = SecurityProfile()

        image_ref = f"{req.image}:{req.tag}"
        execution_id = str(uuid.uuid4())

        # Pull image if needed
        try:
            await asyncio.to_thread(self._client.images.get, image_ref)
        except ImageNotFound:
            logger.info(f"Pulling image {image_ref}...")
            await asyncio.to_thread(self._client.images.pull, req.image, tag=req.tag)

        # Build container kwargs
        container_kwargs: dict = {
            "image": image_ref,
            "command": req.command if req.command else None,
            "detach": True,
            "environment": req.env_vars,
            "nano_cpus": int(cpu_limit * 1e9),
            "mem_limit": f"{memory_limit}m",
            "network_mode": "none" if req.network_mode == NetworkMode.NONE else "bridge",
            "user": sec.user,
            "cap_drop": sec.cap_drop,
            "read_only": sec.readonly_rootfs,
            "security_opt": ["no-new-privileges"] if sec.no_new_privileges else [],
            "labels": {
                "complianceflow.execution_id": execution_id,
                "complianceflow.node_id": req.node_id,
                "complianceflow.workflow_run_id": req.workflow_run_id,
            },
        }

        # Add tmpfs mounts
        if sec.tmpfs:
            container_kwargs["tmpfs"] = sec.tmpfs

        if sec.pid_mode:
            container_kwargs["pid_mode"] = sec.pid_mode
        if sec.ipc_mode:
            container_kwargs["ipc_mode"] = sec.ipc_mode

        # Create and start
        container = await asyncio.to_thread(self._client.containers.create, **container_kwargs)
        container_id = container.id[:12]
        self._container_ids[execution_id] = container.id

        now = datetime.now(timezone.utc).isoformat()
        self._executions[execution_id] = ContainerExecutionStatus(
            id=execution_id,
            node_id=req.node_id,
            workflow_run_id=req.workflow_run_id,
            status=ContainerStatus.RUNNING,
            image=image_ref,
            image_sha256=approved.sha256,
            command=req.command,
            started_at=now,
        )

        await asyncio.to_thread(container.start)
        logger.info(f"Started container {container_id} for execution {execution_id}")

        # Launch watchdog
        timeout = min(req.timeout, settings.DOCKER_TIMEOUT)
        task = asyncio.create_task(self._watchdog(execution_id, timeout))
        self._watchdog_tasks[execution_id] = task

        return ExecuteContainerResponse(
            execution_id=execution_id,
            container_id=container_id,
            status="running",
        )

    # ------------------------------------------------------------------
    # Logs
    # ------------------------------------------------------------------

    async def stream_logs(self, execution_id: str) -> AsyncGenerator[ContainerLogEntry, None]:
        """Async generator yielding log entries from a running container."""
        if not self._client:
            return

        full_id = self._container_ids.get(execution_id)
        if not full_id:
            return

        try:
            container = await asyncio.to_thread(self._client.containers.get, full_id)
        except NotFound:
            return

        log_gen = container.logs(stream=True, follow=True, timestamps=True)

        try:
            while True:
                line = await asyncio.to_thread(next, log_gen, None)
                if line is None:
                    break
                decoded = line.decode("utf-8", errors="replace").rstrip("\n")
                # Docker log lines with timestamps: "2024-01-15T10:30:00.000000000Z message"
                parts = decoded.split(" ", 1)
                ts = parts[0] if len(parts) > 1 else datetime.now(timezone.utc).isoformat()
                msg = parts[1] if len(parts) > 1 else decoded
                yield ContainerLogEntry(timestamp=ts, stream="stdout", message=msg)
        except Exception as e:
            logger.debug(f"Log stream ended for {execution_id}: {e}")

        # Finalize execution status
        await self._finalize_execution(execution_id)

    async def _finalize_execution(self, execution_id: str):
        """Update execution status after container exits."""
        full_id = self._container_ids.get(execution_id)
        if not full_id or not self._client:
            return

        try:
            container = await asyncio.to_thread(self._client.containers.get, full_id)
            result = await asyncio.to_thread(container.wait)
            exit_code = result.get("StatusCode", -1)
            now = datetime.now(timezone.utc).isoformat()

            if execution_id in self._executions:
                ex = self._executions[execution_id]
                ex.exit_code = exit_code
                ex.completed_at = now
                ex.status = ContainerStatus.COMPLETED if exit_code == 0 else ContainerStatus.ERROR
                if exit_code != 0:
                    ex.error = f"Container exited with code {exit_code}"

            # Cleanup container
            await asyncio.to_thread(container.remove, force=True)
        except Exception as e:
            logger.warning(f"Error finalizing execution {execution_id}: {e}")

    # ------------------------------------------------------------------
    # Status
    # ------------------------------------------------------------------

    async def get_container_status(self, execution_id: str) -> Optional[ContainerExecutionStatus]:
        """Return current execution status, refreshing from Docker if running."""
        ex = self._executions.get(execution_id)
        if not ex:
            return None

        if ex.status == ContainerStatus.RUNNING and self._client:
            full_id = self._container_ids.get(execution_id)
            if full_id:
                try:
                    container = await asyncio.to_thread(self._client.containers.get, full_id)
                    info = container.attrs
                    state = info.get("State", {})
                    if state.get("Status") == "exited":
                        await self._finalize_execution(execution_id)
                        ex = self._executions.get(execution_id)
                except NotFound:
                    ex.status = ContainerStatus.ERROR
                    ex.error = "Container not found"

        return ex

    # ------------------------------------------------------------------
    # Stop
    # ------------------------------------------------------------------

    async def stop_container(self, execution_id: str) -> StopContainerResponse:
        """Stop and remove a container, cancel its watchdog."""
        full_id = self._container_ids.get(execution_id)
        if not full_id or not self._client:
            return StopContainerResponse(success=False, message="Container not found")

        # Cancel watchdog
        task = self._watchdog_tasks.pop(execution_id, None)
        if task:
            task.cancel()

        try:
            container = await asyncio.to_thread(self._client.containers.get, full_id)
            await asyncio.to_thread(container.stop, timeout=10)
            await asyncio.to_thread(container.remove, force=True)
        except NotFound:
            pass
        except Exception as e:
            logger.warning(f"Error stopping container: {e}")

        if execution_id in self._executions:
            ex = self._executions[execution_id]
            ex.status = ContainerStatus.COMPLETED
            ex.completed_at = datetime.now(timezone.utc).isoformat()
            ex.exit_code = -1
            ex.error = "Stopped by user"

        return StopContainerResponse(success=True, message="Container stopped")

    # ------------------------------------------------------------------
    # Audit
    # ------------------------------------------------------------------

    async def write_audit_log(self, entry: ContainerAuditLog):
        """Append an audit entry to the JSONL file."""
        audit_path = Path(settings.AUDIT_LOG_PATH)
        audit_path.parent.mkdir(parents=True, exist_ok=True)

        line = entry.model_dump_json(by_alias=True) + "\n"
        await asyncio.to_thread(self._append_file, str(audit_path), line)
        logger.debug(f"Audit log written: {entry.event_type}")

    @staticmethod
    def _append_file(path: str, data: str):
        with open(path, "a") as f:
            f.write(data)

    async def read_audit_logs(
        self,
        node_id: Optional[str] = None,
        workflow_run_id: Optional[str] = None,
        limit: int = 100,
    ) -> tuple[list[ContainerAuditLog], int]:
        """Read audit logs with optional filters."""
        audit_path = Path(settings.AUDIT_LOG_PATH)
        if not audit_path.exists():
            return [], 0

        content = await asyncio.to_thread(audit_path.read_text)
        entries: list[ContainerAuditLog] = []
        for line in content.strip().split("\n"):
            if not line:
                continue
            try:
                entry = ContainerAuditLog.model_validate_json(line)
                if node_id and entry.node_id != node_id:
                    continue
                if workflow_run_id and entry.workflow_run_id != workflow_run_id:
                    continue
                entries.append(entry)
            except Exception:
                continue

        total = len(entries)
        return entries[-limit:], total

    # ------------------------------------------------------------------
    # Watchdog
    # ------------------------------------------------------------------

    async def _watchdog(self, execution_id: str, timeout: int):
        """Kill container after timeout seconds."""
        try:
            await asyncio.sleep(timeout)
            logger.warning(f"Watchdog timeout for execution {execution_id}")
            await self.stop_container(execution_id)
            if execution_id in self._executions:
                self._executions[execution_id].error = f"Timeout after {timeout}s"
        except asyncio.CancelledError:
            pass

    # ------------------------------------------------------------------
    # Cleanup
    # ------------------------------------------------------------------

    async def close(self):
        """Cleanup all active containers and watchdog tasks."""
        for task in self._watchdog_tasks.values():
            task.cancel()
        self._watchdog_tasks.clear()

        if self._client:
            for eid, full_id in list(self._container_ids.items()):
                try:
                    container = await asyncio.to_thread(self._client.containers.get, full_id)
                    await asyncio.to_thread(container.stop, timeout=5)
                    await asyncio.to_thread(container.remove, force=True)
                    logger.info(f"Cleaned up container for execution {eid}")
                except Exception:
                    pass

            await asyncio.to_thread(self._client.close)
            self._client = None

        logger.info("DockerService closed")
