---
name: docker-container-node
description: Air-gapped Docker container execution node for compliance workflows with image signing, resource hardening, and automatic audit trails
status: backlog
created: 2026-02-05T21:29:39Z
---

# PRD: Docker Container Node

## Executive Summary

Add a new **Docker Container Node** to ComplianceFlow's canvas that allows users to execute custom code, regulatory scanning tools, or specialized software within managed, isolated containers as part of compliance workflows. Unlike generic Docker integrations, this node is purpose-built for **air-gapped compliance** — enforcing image allowlists, resource caps, ephemeral networking controls, and automatic audit logging required by DORA, GDPR, and EU AI Act frameworks.

This turns ComplianceFlow into a highly flexible orchestration layer where any containerized tool can be safely embedded into a compliance pipeline without risking data leakage, resource exhaustion, or unaudited execution.

**Value proposition**: Eliminates the need for custom integration development (estimated savings of 100K+ per bespoke connector) by allowing compliance teams to "bring their own tool" in a container while maintaining full regulatory traceability.

## Problem Statement

### What problem are we solving?

Compliance teams at financial institutions and privacy-sensitive organizations frequently need to run specialized tools (regulatory scanners, custom Python scripts, data validators, ML model auditors) as part of their workflows. Currently, each tool requires:

1. A custom node implementation in ComplianceFlow (weeks of dev time per tool)
2. Direct installation on the host machine (security risk, dependency conflicts)
3. Manual execution outside the workflow with copy-paste data transfer (breaks audit trail)

### Why is this important now?

- **DORA (Digital Operational Resilience Act)** requires financial entities to demonstrate control over all ICT processing, including third-party tools
- **GDPR Article 32** mandates "appropriate technical measures" for data processing — containers provide isolation guarantees
- Customers are asking for extensibility without compromising the air-gapped deployment model
- n8n and similar tools have proven the Docker node pattern is viable and high-demand

## User Stories

### US-1: Compliance Officer — Run Custom Validator
> As a **Compliance Officer**, I want to run a custom Python data validation script inside an isolated container so that I can verify regulatory compliance without risking the script sending data to external APIs.

**Acceptance Criteria:**
- [ ] Can select a pre-approved Python image from the allowlist
- [ ] Can provide a shell command or script to execute
- [ ] Container runs with network disabled by default
- [ ] Output data flows to the next node in the workflow
- [ ] Execution is logged in the audit trail

### US-2: DevOps Engineer — Resource Limits
> As a **DevOps Engineer**, I want to set CPU and RAM limits on container executions so that one heavy workflow step doesn't crash the entire ComplianceFlow instance.

**Acceptance Criteria:**
- [ ] Can set CPU limit (0.25 - 4.0 cores) via slider
- [ ] Can set RAM limit (128MB - 4GB) via slider
- [ ] Container is killed if it exceeds limits
- [ ] Resource usage is visible in the execution logs

### US-3: Auditor — Execution Traceability
> As an **Auditor**, I want to see exactly which container image (by hash), command, and user was involved in a specific workflow execution from 6 months ago.

**Acceptance Criteria:**
- [ ] Audit log includes: image name, image SHA256 hash, command executed, user ID, timestamp, exit code, duration
- [ ] Logs are immutable and queryable
- [ ] Can correlate container execution to specific workflow run ID

### US-4: Data Engineer — Chain Container Output
> As a **Data Engineer**, I want the JSON output from a container to automatically flow into downstream nodes so I can build multi-step pipelines mixing containers with built-in nodes.

**Acceptance Criteria:**
- [ ] Container stdout captured as JSON and injected into workflow data stream
- [ ] Can map input data from previous nodes into container environment variables
- [ ] Can mount workflow data as input volume
- [ ] Errors (non-zero exit) are surfaced in the workflow execution panel

### US-5: Security Admin — Image Governance
> As a **Security Admin**, I want to maintain an allowlist of approved container images so that only vetted, signed images can be used in workflows.

**Acceptance Criteria:**
- [ ] Admin can manage image allowlist via configuration
- [ ] Node refuses to execute non-allowlisted images
- [ ] Image signature verification (Cosign) before execution
- [ ] Blocked executions are logged as security events

## Requirements

### Functional Requirements

#### FR-1: New Canvas Node Type — `dockerContainerNode`
- Appears in the sidebar under a new "Containers" category
- Draggable onto the React Flow canvas
- Has one input handle (data in) and one output handle (data out)
- Visual identity: Dark gray (#36312E) background with brand purple (#4004DA) container icon
- Selected state shows purple glow consistent with other nodes

#### FR-2: Node Configuration Panel
When clicked, the NodeConfigPanel renders these sections:

**Image Selection**
- Searchable dropdown populated from the local image allowlist
- Shows image name, tag, size, and approval date
- "Pull Image" button to fetch from local registry if not cached

**Command Configuration**
- Text input for command/entrypoint override
- Monaco-based code editor for multi-line scripts (optional enhancement)
- Syntax highlighting for shell commands

**Environment Variables**
- Dynamic key-value pair list (add/remove rows)
- Values support static text or expression syntax referencing previous node outputs
- Expression format: `{{ $node["NodeName"].json["field"] }}`

**Volume Mappings**
- Visual list of host path → container path mappings
- Restricted to admin-approved host directories
- Input volume: auto-mounts workflow data to `/input`
- Output volume: reads from `/output` after execution

**Resource Controls**
- CPU limit slider: 0.25 - 4.0 cores (default: 0.5)
- Memory limit slider: 128MB - 4096MB (default: 512MB)
- Execution timeout: 30s - 3600s (default: 300s)

**Network Controls**
- Toggle: "Air-Gapped Mode" (default: ON) — disables all container networking
- When OFF, restricts to internal Docker network only (no internet)

**Execution Console**
- Real-time terminal view (xterm.js) showing stdout/stderr during execution
- Visible in the node configuration panel or as a tab in the ExecutionPanel

#### FR-3: Backend Container Orchestration
- **Runtime support**: Docker daemon (primary), Podman (secondary), Remote Docker host via TCP/SSH
- **Container lifecycle**: Pull → Verify signature → Create → Start → Wait → Capture output → Remove
- **Auto-cleanup**: Containers are always removed after execution (ephemeral)
- **Data injection**: Mount a temp volume with input JSON at `/input/data.json`
- **Output capture**: Read `/output/result.json` (or stdout if no output file) and inject into workflow data stream

#### FR-4: Image Allowlist Management
- Configuration file at `config/approved-images.json`
- Schema: `[{ name, tag, sha256, approvedBy, approvedAt, maxCpu, maxMemory }]`
- Per-image resource ceiling (admin can cap specific images below global limits)
- CLI or admin UI for managing the allowlist

#### FR-5: Audit Logging
Every container execution generates an immutable audit record:
```json
{
  "eventType": "container_execution",
  "workflowId": "wf-123",
  "workflowRunId": "run-456",
  "nodeId": "node-789",
  "userId": "user-001",
  "timestamp": "2026-02-05T21:29:39Z",
  "image": "registry.local/scanner:1.2.3",
  "imageSha256": "sha256:abc123...",
  "command": ["python", "/app/scan.py"],
  "resourceLimits": { "cpu": 0.5, "memory": "512m" },
  "networkMode": "none",
  "exitCode": 0,
  "duration": "12.4s",
  "outputSizeBytes": 4096
}
```

#### FR-6: Pre-Execution Security Checks
Before running any container:
1. Verify image is on the allowlist
2. Verify image signature (Cosign integration)
3. Check resource limits don't exceed per-image ceiling
4. Optionally scan for CVEs (Anchore/Snyk integration — Phase 3)
5. Block execution with clear error if any check fails

### Non-Functional Requirements

#### NFR-1: Performance
- Container startup latency < 3s for cached images
- Real-time log streaming with < 500ms latency
- Node configuration panel renders within 200ms
- No impact on canvas rendering performance (lazy-load heavy components)

#### NFR-2: Security
- Container runs as non-root user by default
- No privileged mode allowed
- Seccomp and AppArmor profiles applied
- Docker socket access restricted to the orchestration service only
- No host PID or IPC namespace sharing

#### NFR-3: Reliability
- Containers always cleaned up, even on workflow crash (watchdog process)
- Execution timeout enforced at both container and workflow level
- Graceful degradation if Docker daemon is unavailable (node shows "Docker Unavailable" status)

#### NFR-4: Scalability
- Support up to 10 concurrent container executions per workflow
- Queue additional executions if limit reached
- Resource limits prevent any single container from starving the host

## Technical Architecture

### New Files
| File | Purpose |
|------|---------|
| `src/components/nodes/DockerContainerNode.tsx` | Canvas node component |
| `src/components/panels/DockerConfigPanel.tsx` | Configuration panel (or section within NodeConfigPanel) |
| `src/types/docker.ts` | TypeScript interfaces for Docker node config |
| `src/store/dockerStore.ts` | Zustand store for container state, allowlist |
| `src/services/dockerApi.ts` | API client for backend container orchestration |
| `config/approved-images.json` | Image allowlist configuration |

### Backend Services (new)
| Service | Purpose |
|---------|---------|
| Container Orchestrator | Dockerode/Podman API wrapper with lifecycle management |
| Signature Verifier | Cosign integration for image verification |
| Audit Logger | Immutable execution log writer |
| Resource Monitor | Tracks container CPU/RAM usage |

### Integration Points
- **React Flow**: New custom node type registered in `nodeTypes`
- **Sidebar**: New "Containers" category with DockerContainerNode template
- **NodeConfigPanel**: Docker-specific configuration section
- **ExecutionPanel**: Container logs integrated into execution log stream
- **Workflow Engine**: Container execution step in workflow runner

## Success Criteria

| Metric | Target |
|--------|--------|
| Container startup (cached image) | < 3 seconds |
| Zero unaudited executions | 100% of runs have audit records |
| Image allowlist enforcement | 0 unauthorized images executed |
| Container cleanup rate | 100% — no orphaned containers |
| Resource limit enforcement | 0 OOM kills on host |
| User can configure + run a container node | < 5 minutes first time |

## Constraints & Assumptions

### Constraints
- Docker daemon (or Podman) must be available on the deployment machine
- Air-gapped deployments may not have registry access — images must be pre-loaded
- Host filesystem access restricted to admin-approved directories only
- No Windows container support in initial release (Linux containers only)

### Assumptions
- ComplianceFlow runs on a machine with Docker installed
- Admin has pre-approved at least one container image before users can use the node
- Backend API service exists or will be created to handle container orchestration
- Current workflow execution engine can be extended with async container steps

## Out of Scope

- **Docker Compose / multi-container orchestration** — single container per node only
- **Kubernetes integration** — local Docker/Podman only for v1
- **Custom Dockerfile building** — images must be pre-built and approved
- **GPU passthrough** — CPU-only for v1
- **Windows containers** — Linux containers only
- **Image building/pushing** — read-only registry access
- **Vulnerability scanning UI** — CLI/API only for v1 (UI in future phase)

## Dependencies

### External
- Docker Engine API v1.41+ (or Podman compatible API)
- Cosign for image signature verification
- xterm.js for terminal rendering (npm package)
- Monaco Editor for script editing (optional, npm package)
- Dockerode npm package for Node.js Docker API

### Internal
- Existing React Flow canvas and node registration system
- NodeConfigPanel component for configuration rendering
- Workflow execution engine for container step orchestration
- Audit logging infrastructure (or new if none exists)
- Theme system (uses existing Nomu brand CSS variables)

## Implementation Phases

### Phase 1: Frontend Node + Basic Config (1 week)
- DockerContainerNode component on canvas
- Configuration panel with image selector, command input, env vars
- Sidebar entry under "Containers" category
- Mock execution for UI testing

### Phase 2: Backend Container Engine (1 week)
- Dockerode integration with container lifecycle management
- Data injection (input volume) and output capture
- Auto-cleanup and timeout enforcement
- Basic stdout/stderr log streaming

### Phase 3: Security Hardening (1 week)
- Image allowlist enforcement
- Cosign signature verification
- Resource capping (CPU, RAM, timeout)
- Seccomp/AppArmor profiles
- Air-gapped network mode

### Phase 4: Audit + Polish (3-5 days)
- Immutable audit logging for every execution
- Real-time terminal (xterm.js) in config panel
- Podman support
- Remote Docker host support via TCP/SSH
- Error handling and edge case coverage

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Docker daemon not available | Node unusable | Graceful degradation, clear error messaging, pre-flight check |
| Container escapes isolation | Security breach | Seccomp, AppArmor, no-root, no-privileged, resource limits |
| Large images slow down workflow | UX degradation | Image caching, pre-pull on approval, size limits in allowlist |
| Orphaned containers consume resources | Host instability | Watchdog process, always-remove policy, periodic cleanup job |
| Expression injection in env vars | Security vulnerability | Sanitize expressions, allowlist variable sources |
