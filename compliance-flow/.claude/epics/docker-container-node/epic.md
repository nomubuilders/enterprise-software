---
name: docker-container-node
status: completed
created: 2026-02-05T21:32:57Z
progress: 100%
updated: 2026-02-05T22:03:03Z
prd: .claude/prds/docker-container-node.md
github: https://github.com/nomubuilders/enterprise-software/issues/12
---

# Epic: Docker Container Node

## Overview

Add a `dockerContainerNode` to ComplianceFlow's React Flow canvas that executes containerized tools within compliance workflows. The node follows the existing BaseNode pattern (dark gray header with brand purple icon, input/output handles) and integrates with the existing NodeConfigPanel for configuration. Backend uses Dockerode to manage container lifecycle with support for Docker, Podman, and remote hosts.

Key differentiator: every execution enforces an image allowlist, resource caps, and air-gapped networking by default, with full audit logging — making this safe for DORA/GDPR-regulated environments.

## Architecture Decisions

1. **Extend existing patterns, don't reinvent** — DockerContainerNode extends BaseNode like all other nodes. Docker config section is added to the existing NodeConfigPanel (same as Database, LLM nodes) rather than creating a separate panel. This keeps the UX consistent and minimizes new code.

2. **Dockerode for container orchestration** — Node.js-native Docker API client. Well-maintained, supports streams for log tailing, works with both Docker and Podman (via compatible socket). Added to the existing `src/services/api.ts` backend API pattern.

3. **Zustand store for Docker state** — `dockerStore.ts` manages the image allowlist, active container states, and execution history. Follows the same pattern as `workflowStore.ts` and `themeStore.ts`.

4. **Config-file allowlist over registry integration** — A simple `config/approved-images.json` file that admins curate. No registry API complexity for v1. Can be extended later.

5. **xterm.js for live terminal** — Renders stdout/stderr in real-time within the config panel. Lazy-loaded to avoid bloating the main bundle.

6. **Audit log as append-only JSON file** — `data/audit/container-executions.jsonl` with one JSON object per line. Simple, greppable, immutable. Can be upgraded to a proper DB in future phases.

## Technical Approach

### Frontend Components

**New files:**
- `src/components/nodes/DockerContainerNode.tsx` — Canvas node using BaseNode wrapper. Header color: `bg-[#36312E]` with a `Container` (lucide-react) icon in brand purple. Body shows image name, resource limits, and air-gapped badge.
- `src/types/docker.ts` — TypeScript interfaces: `DockerContainerConfig`, `ApprovedImage`, `ContainerExecution`, `ContainerAuditLog`
- `src/store/dockerStore.ts` — Zustand store: approved images list, active containers map, execution results

**Modified files:**
- `src/components/nodes/index.ts` — Register `dockerContainerNode` in nodeTypes
- `src/components/sidebar/Sidebar.tsx` — Add "Containers" category with Docker Container template
- `src/components/panels/NodeConfigPanel.tsx` — Add Docker configuration section (image selector, command, env vars, resource sliders, network toggle, terminal)
- `src/components/modals/ExecutionPanel.tsx` — Show container execution logs inline
- `src/types/workflow.ts` — Add `DockerContainerConfig` export

### Backend Services

**New files:**
- `src/services/dockerApi.ts` — API client with methods: `listApprovedImages()`, `executeContainer(config)`, `streamLogs(containerId)`, `getContainerStatus(containerId)`, `stopContainer(containerId)`
- `config/approved-images.json` — Allowlist seed file

**Backend API endpoints (to be implemented in the backend service):**
- `POST /api/v1/docker/execute` — Start container execution
- `GET /api/v1/docker/logs/:containerId` — Stream container logs (SSE)
- `POST /api/v1/docker/stop/:containerId` — Stop running container
- `GET /api/v1/docker/images` — List approved images
- `GET /api/v1/docker/status` — Docker daemon health check

### Container Lifecycle
```
User clicks "Run" →
  1. Read node config (image, command, env, volumes, limits)
  2. Verify image is in allowlist
  3. POST /api/v1/docker/execute with config
  4. Backend: pull image (if needed) → create container → start → stream logs
  5. Frontend: display real-time logs in terminal
  6. Backend: wait for exit → capture /output/result.json or stdout
  7. Backend: remove container → write audit log
  8. Frontend: inject output JSON into workflow data stream for next node
```

## Implementation Strategy

**Phase 1 (Foundation):** Types, store, node component, sidebar registration — get the node visible on canvas with mock data.

**Phase 2 (Config UI):** Build out the NodeConfigPanel Docker section — image selector, command input, env vars, resource sliders, network toggle.

**Phase 3 (Backend):** Dockerode integration, container lifecycle, data injection/capture, log streaming.

**Phase 4 (Security):** Allowlist enforcement, Cosign verification, resource capping, Seccomp profiles.

**Phase 5 (Audit + Terminal):** Audit logging, xterm.js live console, Podman/remote host support.

### Risk Mitigation
- Start with mock execution to validate the full UI flow before touching Docker
- Container cleanup uses `try/finally` to guarantee removal even on errors
- Resource limits have both per-image ceilings (allowlist) and per-execution user settings
- Watchdog timer kills containers that exceed timeout

### Testing Approach
- Unit tests for Docker config validation and allowlist checking
- Integration tests with a local Docker daemon (test image: `alpine:latest`)
- E2E test: create workflow with Docker node → execute → verify output flows to next node
- Security test: attempt to run non-allowlisted image → verify rejection

## Task Breakdown Preview

- [ ] #13: Create Docker types, Zustand store, and node component (foundation)
- [ ] #14: Register node in canvas and add to sidebar with "Containers" category
- [ ] #15: Build Docker configuration section in NodeConfigPanel (image selector, command, env vars, resource controls, network toggle)
- [ ] #17: Create backend Docker API service and container orchestration (Dockerode lifecycle, data injection, output capture)
- [ ] #19: Implement image allowlist enforcement and Cosign signature verification
- [ ] #16: Add real-time log streaming (SSE) and xterm.js terminal in config panel
- [ ] #18: Implement audit logging (append-only JSONL) and integrate with ExecutionPanel
- [ ] #20: Add Podman and remote Docker host support
- [ ] #21: Security hardening (Seccomp, AppArmor, non-root, no-privileged) and resource watchdog
- [ ] #22: End-to-end testing and Docker daemon health check / graceful degradation

## Dependencies

### External
- `dockerode` — npm package for Docker Engine API
- `xterm` + `xterm-addon-fit` — npm packages for terminal rendering
- `cosign` — binary for image signature verification (installed on host)
- Docker Engine v20.10+ (API v1.41) or Podman 4.0+

### Internal
- BaseNode component (exists) — DockerContainerNode wraps it
- NodeConfigPanel (exists) — add Docker config section
- Sidebar node templates array (exists) — add Docker entry
- `nodeTypes` registry in `src/components/nodes/index.ts` (exists)
- `src/services/api.ts` pattern (exists) — follow for dockerApi.ts
- Workflow execution engine in `workflowStore.ts` (exists) — extend with container step
- Nomu brand CSS variables (exists) — use for all styling

### Task Dependencies
- #13 must complete before all others (foundation types and store)
- #14 depends on #13 (needs node component to register)
- #15 depends on #13 (needs types for config form)
- #17 depends on #13 (needs types for API contract)
- #19, #16, #18 depend on #17 (need working backend)
- #20 depends on #17 (extends orchestration layer)
- #21 depends on #17, #19 (needs execution + allowlist)
- #22 depends on all (integration testing)

## Success Criteria (Technical)

- `dockerContainerNode` renders on canvas with correct brand styling
- Node configuration panel shows all 6 sections (image, command, env, volumes, resources, network)
- Container executes and output JSON flows to downstream nodes
- Non-allowlisted images are rejected with clear error
- Container is always removed after execution (zero orphans)
- Audit log written for 100% of executions
- Resource limits enforced (CPU, RAM, timeout)
- Air-gapped mode disables networking by default
- Real-time log streaming works with < 500ms latency
- TypeScript compiles clean with strict mode
- Works with Docker, Podman, and remote Docker hosts

## Estimated Effort

- **Total tasks**: 10
- **Parallelizable**: #14, #15 after #13; #19, #16, #18, #20 after #17
- **Critical path**: #13 → #17 → #19 → #21 → #22
- **Estimated timeline**: 3.5-4 weeks
- **Risk items**: Docker socket permissions, Cosign binary availability, xterm.js bundle size

## Tasks Created

- [ ] #13 - Create Docker types, Zustand store, and node component (parallel: false)
- [ ] #14 - Register node in canvas and add to sidebar (parallel: true, depends: #13)
- [ ] #15 - Build Docker configuration section in NodeConfigPanel (parallel: true, depends: #13)
- [ ] #17 - Create backend Docker API service and container orchestration (parallel: true, depends: #13)
- [ ] #19 - Implement image allowlist enforcement and Cosign verification (parallel: true, depends: #17)
- [ ] #16 - Add real-time log streaming and xterm.js terminal (parallel: true, depends: #17)
- [ ] #18 - Implement audit logging and ExecutionPanel integration (parallel: true, depends: #17)
- [ ] #20 - Add Podman and remote Docker host support (parallel: true, depends: #17)
- [ ] #21 - Security hardening and resource watchdog (parallel: false, depends: #17, #19)
- [ ] #22 - End-to-end testing and graceful degradation (parallel: false, depends: all)

Total tasks: 10
Parallel tasks: 6 (#14, #15, #17 after foundation; #19, #16, #18, #20 after backend)
Sequential tasks: 4 (#13 foundation, #21 security, #22 testing)
Estimated total effort: 44-63 hours
