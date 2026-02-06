"""
Docker Container API Routes
Endpoints for container execution, log streaming, health checks, and audit logging.
"""

import json
from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from loguru import logger

from app.models.docker import (
    AuditLogResponse,
    ContainerAuditLog,
    ContainerExecutionStatus,
    DockerHealthStatus,
    ApprovedImage,
    ExecuteContainerRequest,
    ExecuteContainerResponse,
    StopContainerResponse,
)

router = APIRouter(prefix="/docker", tags=["Docker"])


def _get_docker_service(request: Request):
    svc = getattr(request.app.state, "docker", None)
    if not svc:
        raise HTTPException(status_code=503, detail="Docker service not initialized")
    return svc


@router.get("/status", response_model=DockerHealthStatus)
async def docker_health(request: Request):
    """Check Docker daemon health and connectivity."""
    svc = _get_docker_service(request)
    return await svc.get_health()


@router.get("/images", response_model=list[ApprovedImage])
async def list_approved_images(request: Request):
    """Return the approved image allowlist."""
    svc = _get_docker_service(request)
    return await svc.get_approved_images()


@router.post("/execute", response_model=ExecuteContainerResponse)
async def execute_container(req: ExecuteContainerRequest, request: Request):
    """Start a container from an approved image with security hardening."""
    svc = _get_docker_service(request)
    try:
        return await svc.execute_container(req)
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.get("/logs/{execution_id}")
async def stream_logs(execution_id: str, request: Request):
    """Stream container logs via Server-Sent Events."""
    svc = _get_docker_service(request)

    async def event_generator():
        async for entry in svc.stream_logs(execution_id):
            data = entry.model_dump_json()
            yield f"data: {data}\n\n"
        yield "event: done\ndata: {}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/status/{execution_id}", response_model=ContainerExecutionStatus)
async def container_status(execution_id: str, request: Request):
    """Get current status of a container execution."""
    svc = _get_docker_service(request)
    status = await svc.get_container_status(execution_id)
    if not status:
        raise HTTPException(status_code=404, detail="Execution not found")
    return status


@router.post("/stop/{execution_id}", response_model=StopContainerResponse)
async def stop_container(execution_id: str, request: Request):
    """Stop and remove a running container."""
    svc = _get_docker_service(request)
    return await svc.stop_container(execution_id)


@router.post("/audit")
async def write_audit(entry: ContainerAuditLog, request: Request):
    """Write a container audit log entry."""
    svc = _get_docker_service(request)
    await svc.write_audit_log(entry)
    return {"status": "ok"}


@router.get("/audit", response_model=AuditLogResponse)
async def read_audit(
    request: Request,
    node_id: Optional[str] = None,
    workflow_run_id: Optional[str] = None,
    limit: int = 100,
):
    """Read container audit logs with optional filters."""
    svc = _get_docker_service(request)
    entries, total = await svc.read_audit_logs(
        node_id=node_id,
        workflow_run_id=workflow_run_id,
        limit=limit,
    )
    return AuditLogResponse(entries=entries, total=total)
