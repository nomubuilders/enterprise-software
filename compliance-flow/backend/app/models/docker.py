"""
Pydantic models for Docker container execution API.
Matches the frontend TypeScript types in src/types/docker.ts and src/services/dockerApi.ts.
"""

from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class ContainerStatus(str, Enum):
    PENDING = "pending"
    PULLING = "pulling"
    RUNNING = "running"
    COMPLETED = "completed"
    ERROR = "error"


class NetworkMode(str, Enum):
    NONE = "none"
    INTERNAL = "internal"


class RuntimeType(str, Enum):
    DOCKER = "docker"
    PODMAN = "podman"
    UNKNOWN = "unknown"
    REMOTE = "remote"


class AuditEventType(str, Enum):
    CONTAINER_EXECUTION = "container_execution"
    CONTAINER_BLOCKED = "container_blocked"
    IMAGE_PULL = "image_pull"


# --- Request / Response models ---

class DockerHealthStatus(BaseModel):
    available: bool
    version: Optional[str] = None
    api_version: Optional[str] = Field(None, alias="apiVersion")
    runtime: RuntimeType = RuntimeType.UNKNOWN
    error: Optional[str] = None

    model_config = {"populate_by_name": True, "by_alias": True}


class ApprovedImage(BaseModel):
    name: str
    tag: str
    sha256: str
    approved_by: str = Field(alias="approvedBy")
    approved_at: str = Field(alias="approvedAt")
    max_cpu: float = Field(alias="maxCpu")
    max_memory: int = Field(alias="maxMemory")
    description: Optional[str] = None

    model_config = {"populate_by_name": True, "by_alias": True}


class SecurityProfile(BaseModel):
    user: str = "1000:1000"
    privileged: bool = False
    cap_drop: list[str] = Field(default_factory=lambda: ["ALL"], alias="capDrop")
    readonly_rootfs: bool = Field(True, alias="readonlyRootfs")
    no_new_privileges: bool = Field(True, alias="noNewPrivileges")
    pid_mode: str = Field("", alias="pidMode")
    ipc_mode: str = Field("", alias="ipcMode")
    tmpfs: dict[str, str] = Field(default_factory=lambda: {"/tmp": "rw,noexec,nosuid,size=64m"})

    model_config = {"populate_by_name": True, "by_alias": True}


class RuntimeConfig(BaseModel):
    socket_path: Optional[str] = Field(None, alias="socketPath")
    remote_host: Optional[str] = Field(None, alias="remoteHost")
    tls_verify: Optional[bool] = Field(None, alias="tlsVerify")

    model_config = {"populate_by_name": True, "by_alias": True}


class ExecuteContainerRequest(BaseModel):
    image: str
    tag: str = "latest"
    command: list[str] = Field(default_factory=list)
    env_vars: dict[str, str] = Field(default_factory=dict, alias="envVars")
    cpu_limit: float = Field(0.5, alias="cpuLimit")
    memory_limit: int = Field(512, alias="memoryLimit")
    timeout: int = 300
    network_mode: NetworkMode = Field(NetworkMode.NONE, alias="networkMode")
    input_data: Optional[dict] = Field(None, alias="inputData")
    node_id: str = Field(alias="nodeId")
    workflow_run_id: str = Field(alias="workflowRunId")
    runtime: Optional[RuntimeType] = None
    runtime_config: Optional[RuntimeConfig] = Field(None, alias="runtimeConfig")
    security_profile: Optional[SecurityProfile] = Field(None, alias="securityProfile")

    model_config = {"populate_by_name": True, "by_alias": True}


class ExecuteContainerResponse(BaseModel):
    execution_id: str = Field(alias="executionId")
    container_id: str = Field(alias="containerId")
    status: str

    model_config = {"populate_by_name": True, "by_alias": True}


class ContainerLogEntry(BaseModel):
    timestamp: str
    stream: str  # "stdout" | "stderr"
    message: str


class ResourceUsage(BaseModel):
    cpu_percent: float = Field(alias="cpuPercent")
    memory_used_mb: float = Field(alias="memoryUsedMB")

    model_config = {"populate_by_name": True, "by_alias": True}


class ContainerExecutionStatus(BaseModel):
    id: str
    node_id: str = Field(alias="nodeId")
    workflow_run_id: str = Field(alias="workflowRunId")
    status: ContainerStatus
    image: str
    image_sha256: str = Field(alias="imageSha256")
    command: list[str]
    started_at: str = Field(alias="startedAt")
    completed_at: Optional[str] = Field(None, alias="completedAt")
    exit_code: Optional[int] = Field(None, alias="exitCode")
    logs: list[str] = Field(default_factory=list)
    output: Optional[dict] = None
    error: Optional[str] = None
    resource_usage: Optional[ResourceUsage] = Field(None, alias="resourceUsage")

    model_config = {"populate_by_name": True, "by_alias": True}


class StopContainerResponse(BaseModel):
    success: bool
    message: str


class ResourceLimits(BaseModel):
    cpu: float
    memory: str


class ContainerAuditLog(BaseModel):
    event_type: AuditEventType = Field(alias="eventType")
    workflow_id: str = Field(alias="workflowId")
    workflow_run_id: str = Field(alias="workflowRunId")
    node_id: str = Field(alias="nodeId")
    user_id: str = Field(alias="userId")
    timestamp: str
    image: str
    image_sha256: str = Field(alias="imageSha256")
    command: list[str]
    resource_limits: ResourceLimits = Field(alias="resourceLimits")
    network_mode: NetworkMode = Field(alias="networkMode")
    exit_code: Optional[int] = Field(None, alias="exitCode")
    duration: Optional[str] = None
    output_size_bytes: Optional[int] = Field(None, alias="outputSizeBytes")
    blocked: Optional[bool] = None
    block_reason: Optional[str] = Field(None, alias="blockReason")

    model_config = {"populate_by_name": True, "by_alias": True}


class AuditLogResponse(BaseModel):
    entries: list[ContainerAuditLog]
    total: int
