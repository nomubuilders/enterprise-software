# Agent Team Prompts — Copy & Paste into iTerm2

## Quick Start

Open iTerm2, navigate to the project, and run:

```bash
cd ~/Desktop/Nomu_software/compliance-flow
```

Then choose one of the options below.

---

## Option 1: Launch Script (Recommended)

```bash
# Full team (all 8 agents)
./scripts/launch-team.sh

# Core only (architect + frontend + backend)
./scripts/launch-team.sh --core

# Research only (architect + n8n-scout + code-analyzer)
./scripts/launch-team.sh --research

# Custom task
./scripts/launch-team.sh "Implement a new webhook management dashboard"
```

---

## Option 2: Direct Claude Command

### Full Team (all 8 agents)

```bash
claude --teammate-mode tmux -p "You are the team lead for Compliance Ready AI. Create an agent team called compliance-flow and orchestrate ALL agents.

Spawn these 8 teammates in order:
1. architect (subagent_type: architect) — System planner, NO coding. Analyzes codebase, designs API contracts, decomposes tasks, assigns work.
2. frontend-engineer (subagent_type: frontend-engineer) — Senior React/Electron dev. Owns frontend/src/ and frontend/electron/.
3. backend-engineer (subagent_type: backend-engineer) — Senior FastAPI/Python dev. Owns backend/app/.
4. compliance-node-engineer (subagent_type: compliance-node-engineer) — 38 node type specialist. Owns nodes/ and executor.py.
5. electron-specialist (subagent_type: electron-specialist) — Electron shell. Owns electron/main/ and preload/.
6. integration-engineer (subagent_type: integration-engineer) — Enterprise integrations (Slack, Jira, SAP, cloud).
7. n8n-scout (subagent_type: n8n-scout) — Playwright browser agent for n8n analysis.
8. docker-infra (subagent_type: docker-infra) — Docker, services, deployment.

After spawning: Use delegate mode. Have architect analyze the codebase and create prioritized tasks. Assign to appropriate teammates. Use code-simplifier, code-analyzer, and test-runner as subagents for quality gates. No file conflicts — architect enforces boundaries. API contracts before implementation. All work tracked via TaskCreate/TaskUpdate/TaskList."
```

### Core Team (3 agents)

```bash
claude --teammate-mode tmux -p "Create an agent team called compliance-core with 3 teammates: architect (plans, no code), frontend-engineer (React/Electron), backend-engineer (FastAPI). Use delegate mode. Architect analyzes codebase, creates tasks, assigns to frontend and backend engineers. Use code-simplifier and code-analyzer as subagents for quality."
```

### Research Team (3 agents)

```bash
claude --teammate-mode tmux -p "Create an agent team called compliance-research with 3 teammates: architect (analysis, no code), n8n-scout (Playwright browser to scan n8n workflows), code-analyzer (deep codebase analysis). Each explores independently and reports findings. Synthesize into a prioritized improvement plan."
```

---

## Option 3: In-Process Mode (no tmux needed)

If tmux is not available or you prefer all agents in one terminal:

```bash
claude --teammate-mode in-process -p "You are the team lead for Compliance Ready AI. Create an agent team called compliance-flow. Spawn all 8 agents: architect, frontend-engineer, backend-engineer, compliance-node-engineer, electron-specialist, integration-engineer, n8n-scout, docker-infra. Use delegate mode. Architect plans, others implement. Track via shared task list."
```

Controls for in-process mode:
- `Shift+Up/Down` — Select teammate
- `Enter` — View teammate session
- `Escape` — Interrupt teammate
- `Ctrl+T` — Toggle task list
- `Shift+Tab` — Enable delegate mode

---

## Targeted Task Examples

### Add a new node type
```bash
./scripts/launch-team.sh "Add a new 'API Gateway' node type that can proxy requests to external REST APIs with rate limiting, retry logic, and response caching. Architect plans the implementation, compliance-node-engineer builds the node, backend-engineer adds the executor logic, frontend-engineer adds the config panel."
```

### Improve the config panel
```bash
./scripts/launch-team.sh "Refactor NodeConfigPanel.tsx (114KB) into modular per-category config components. n8n-scout should first analyze how n8n structures their config panels. Architect plans the decomposition. Frontend-engineer implements."
```

### Full code review
```bash
./scripts/launch-team.sh --research
```

### Enterprise integration sprint
```bash
claude --teammate-mode tmux -p "Create an agent team called compliance-integrations. Spawn: architect (plan API contracts), integration-engineer (implement services), backend-engineer (API routes), frontend-engineer (config panel UI). Task: improve all enterprise integrations (Slack, Jira, SAP, cloud storage) with better error handling, retry logic, and OAuth refresh flows."
```
