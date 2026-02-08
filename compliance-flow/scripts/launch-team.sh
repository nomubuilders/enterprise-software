#!/bin/bash
# ============================================================================
# Compliance Ready AI — Full Agent Team Launcher (iTerm2 + tmux -CC)
# ============================================================================
# Launches Claude Code inside a tmux -CC session so iTerm2 renders each
# teammate as a native split pane. Claude detects it is inside tmux and
# creates panes automatically.
#
# MUST be run from iTerm2.
#
# Usage:
#   ./scripts/launch-team.sh                  # Full team (8 agents)
#   ./scripts/launch-team.sh --core           # Core: architect + frontend + backend
#   ./scripts/launch-team.sh --research       # Research: architect + n8n-scout + analyzer
#   ./scripts/launch-team.sh --node-io        # Node I/O: test input/output pane for all 38 nodes
#   ./scripts/launch-team.sh --voice          # Voice: VoiceAssistantNode with Whisper + PersonaPlex
#   ./scripts/launch-team.sh "custom task"    # Custom task for the team
# ============================================================================

set -e

PROJECT_DIR="/Users/rosaria/Desktop/Nomu_software/compliance-flow"

# ── Colors ──────────────────────────────────────────────────────────────────
CYAN='\033[0;36m'  PURPLE='\033[0;35m'  YELLOW='\033[1;33m'
GREEN='\033[0;32m' RED='\033[0;31m'     NC='\033[0m'

echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${PURPLE}  Compliance Ready AI — Agent Team Launcher${NC}"
echo -e "${PURPLE}  Nomu: We Make Data Speak.${NC}"
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ── Preflight ───────────────────────────────────────────────────────────────
FAIL=0
if ! command -v claude &>/dev/null; then
  echo -e "${RED}✗${NC} claude CLI not found"; FAIL=1
else
  echo -e "${GREEN}✓${NC} claude CLI"
fi

if ! command -v tmux &>/dev/null; then
  echo -e "${RED}✗${NC} tmux not found (brew install tmux)"; FAIL=1
else
  echo -e "${GREEN}✓${NC} tmux $(tmux -V 2>/dev/null)"
fi

if [ "$TERM_PROGRAM" != "iTerm.app" ]; then
  echo -e "${YELLOW}⚠${NC} Not running inside iTerm2 (current: ${TERM_PROGRAM:-unknown})"
  echo -e "  tmux -CC works best in iTerm2. Falling back to plain tmux."
  USE_CC=""
else
  echo -e "${GREEN}✓${NC} iTerm2 detected — using native panes via tmux -CC"
  USE_CC="-CC"
fi

[ "$FAIL" -eq 1 ] && { echo -e "\n${RED}Fix the above and retry.${NC}"; exit 1; }

echo -e "${GREEN}✓${NC} Project: ${PROJECT_DIR}"
echo ""

# ── Select prompt ───────────────────────────────────────────────────────────
TEAM_NAME="compliance-flow"
MODE_LABEL="Full Team (8 agents)"

pick_prompt() {
  case "$1" in
    --core)
      TEAM_NAME="compliance-core"
      MODE_LABEL="Core Team (architect + frontend + backend)"
      cat << 'PROMPT'
You are the team lead for Compliance Ready AI. Create an agent team called "compliance-core" with the core development triad.

Spawn these 3 teammates:

1. **architect** (subagent_type: "architect") — Plans features, decomposes tasks, defines API contracts. Does NOT code.
2. **frontend-engineer** (subagent_type: "frontend-engineer") — Implements React/Electron frontend aligned with backend.
3. **backend-engineer** (subagent_type: "backend-engineer") — Implements FastAPI backend aligned with frontend.

Use delegate mode. Have the architect analyze the codebase and create a task list. Assign tasks to frontend-engineer and backend-engineer. Coordinate their work through the shared task list. Use code-simplifier and code-analyzer as subagents for quality gates.
PROMPT
      ;;
    --research)
      TEAM_NAME="compliance-research"
      MODE_LABEL="Research Team (architect + n8n-scout + analyzer)"
      cat << 'PROMPT'
You are the team lead for Compliance Ready AI. Create an agent team called "compliance-research" for codebase analysis and n8n intelligence.

Spawn these 3 teammates:

1. **architect** (subagent_type: "architect") — Analyzes architecture, identifies improvements. Does NOT code.
2. **n8n-scout** (subagent_type: "n8n-scout") — Uses Playwright to scan n8n workflows and extract UI/UX patterns.
3. **code-analyzer** (subagent_type: "code-analyzer") — Deep-dives into codebase for bugs, patterns, and optimization opportunities.

Use delegate mode. Have each teammate explore independently and report findings. Synthesize into a prioritized improvement plan with specific file paths and recommendations.
PROMPT
      ;;
    --node-io)
      TEAM_NAME="compliance-node-io"
      MODE_LABEL="Node I/O Testing (architect + frontend + backend + node-engineer)"
      cat << 'PROMPT'
You are the team lead for Compliance Ready AI. Create an agent team called "compliance-node-io".

## Mission

Add an input/output test pane to every node so users can verify each node works before wiring up full workflows. Then systematically test all 38 node types.

## Spawn These Teammates

1. **architect** (subagent_type: "architect")
   - Analyze the current node config panel (NodeConfigPanel.tsx, 114KB) and execution flow (executor.py, 59KB).
   - Design the I/O test pane: a collapsible section inside each node's config panel with a "Test" button, sample input area, and output display.
   - Define the API contract: POST /api/v1/nodes/{nodeType}/test with input payload, returning execution result.
   - Decompose into tasks per node category: Core AI, Triggers, Compliance, Security, Integration, Testing.
   - Does NOT write code.

2. **frontend-engineer** (subagent_type: "frontend-engineer")
   - Build the reusable NodeIOTestPane component: input editor (JSON/text), "Run Test" button, output display with success/error states, loading spinner.
   - Integrate it into NodeConfigPanel.tsx as a collapsible section at the bottom of each node's config.
   - Wire it to the backend test endpoint via frontend/src/services/api.ts.
   - Use Tailwind, Zustand, ?? for defaults.

3. **backend-engineer** (subagent_type: "backend-engineer")
   - Create POST /api/v1/nodes/{nodeType}/test endpoint that accepts node config + sample input.
   - Reuse existing executor logic to run a single node in isolation (not the full DAG).
   - Return structured result: { success, output, error, duration_ms }.
   - Handle each of the 38 node types — delegate to existing services (Ollama, database, PII, etc.).

4. **compliance-node-engineer** (subagent_type: "compliance-node-engineer")
   - After the test pane and endpoint are built, systematically verify all 38 node types.
   - For each node: configure with sample data, hit "Test", confirm output is correct.
   - Create a test matrix documenting which nodes pass, which fail, and what needs fixing.
   - Fix any node-specific issues in both frontend component and backend executor.

## Execution Order

Phase 1 (parallel): architect designs + frontend-engineer builds pane + backend-engineer builds endpoint
Phase 2 (after Phase 1): compliance-node-engineer tests all 38 nodes, fixes issues
Phase 3: code-simplifier refines, code-analyzer reviews

Use delegate mode. Track everything via TaskCreate/TaskUpdate/TaskList.
PROMPT
      ;;
    --voice)
      exec "$PROJECT_DIR/scripts/launch-voice-team.sh"
      ;;
    ""|--full)
      cat << 'PROMPT'
You are the team lead for Compliance Ready AI. Create an agent team called "compliance-flow" and orchestrate ALL agents to work together on this project.

## Team Setup — Spawn These Teammates

Spawn all 8 specialized teammates in this order:

1. **architect** (subagent_type: "architect")
   - Role: System planner. Analyzes the codebase, designs API contracts, decomposes features into tasks, coordinates frontend-backend alignment.
   - Instruction: "Read the full codebase structure. Create a task list of improvements, features, and maintenance items. Decompose into frontend vs backend tasks. Assign tasks to teammates. You do NOT write code."

2. **frontend-engineer** (subagent_type: "frontend-engineer")
   - Role: Senior React/Electron frontend developer.
   - Instruction: "You own frontend/src/ and frontend/electron/. Implement frontend tasks assigned by the architect. Align all API calls with backend contracts. Use Tailwind only, Zustand for state, ?? for config defaults."

3. **backend-engineer** (subagent_type: "backend-engineer")
   - Role: Senior FastAPI/Python backend developer.
   - Instruction: "You own backend/app/. Implement backend tasks assigned by the architect. Ensure all API response shapes match what the frontend expects. Use async patterns, Pydantic models."

4. **compliance-node-engineer** (subagent_type: "compliance-node-engineer")
   - Role: Node type specialist covering all 38 compliance nodes.
   - Instruction: "You own the 38 node types across frontend/src/components/nodes/ and backend/app/services/executor.py. Ensure consistency across all nodes. Implement new node types when needed."

5. **electron-specialist** (subagent_type: "electron-specialist")
   - Role: Electron desktop shell specialist.
   - Instruction: "You own frontend/electron/. Handle IPC communication, Docker management, auto-updates, filesystem operations, and cross-platform packaging."

6. **integration-engineer** (subagent_type: "integration-engineer")
   - Role: Enterprise integration specialist.
   - Instruction: "You own all third-party integrations: Slack, Jira, SAP, Microsoft Graph, cloud storage, OAuth, webhooks. Ensure secure, reliable connections."

7. **n8n-scout** (subagent_type: "n8n-scout")
   - Role: n8n workflow intelligence scout using Playwright browser automation.
   - Instruction: "Use Playwright MCP tools to navigate n8n instances. Analyze their UI patterns, node configurations, integration approaches, and settings. Report actionable improvements for our project. Use Context7 MCP for documentation lookups."

8. **docker-infra** (subagent_type: "docker-infra")
   - Role: Docker and infrastructure specialist.
   - Instruction: "You own docker-compose.yml, Dockerfiles, approved-images.json, and the Electron Docker Manager. Ensure all services run reliably."

## After Spawning

1. Use **delegate mode** — do NOT implement code yourself. Only coordinate.
2. Have the **architect** analyze the current codebase and create a prioritized task list.
3. Assign tasks from the shared task list to the appropriate teammates.
4. The **code-simplifier** agent should be spawned as a subagent by any coding teammate after they complete work, to refine their output.
5. The **code-analyzer** agent should be spawned as a subagent to review changes before marking tasks complete.
6. The **test-runner** agent should be spawned as a subagent to validate changes.
7. Monitor all teammates — redirect if stuck, reassign if blocked.
8. Synthesize findings from the n8n-scout into actionable tasks for the other agents.

## Coordination Rules

- **No file conflicts**: Each teammate owns specific directories. The architect enforces boundaries.
- **API contracts first**: The architect defines interfaces before frontend and backend implement.
- **Task tracking**: All work flows through TaskCreate, TaskUpdate, TaskList.
- **Communication**: Teammates message each other directly for cross-domain questions.
- **Quality gates**: Code-analyzer reviews before completion. Code-simplifier refines after.

## Available Skills & Commands

All teammates have access to:
- 18 skills in .claude/skills/ (frontend-design, webapp-testing, mcp-builder, brand-guidelines, etc.)
- 46 PM commands in .claude/commands/pm/ (epic management, issue tracking, PRDs, syncing)
- Context7 MCP via Docker for library documentation lookups
- Playwright MCP via Docker for browser automation

Start by creating the team, spawning all teammates, and having the architect do the initial analysis.
PROMPT
      ;;
    *)
      # Custom task — wrap with team creation context
      TEAM_NAME="compliance-custom"
      MODE_LABEL="Custom Team"
      cat <<PROMPT
You are the team lead for Compliance Ready AI. Create an agent team called "compliance-custom".

Spawn the teammates most relevant to this task from the available agents:
- architect, frontend-engineer, backend-engineer, compliance-node-engineer
- electron-specialist, integration-engineer, n8n-scout, docker-infra

Use delegate mode. Coordinate through the shared task list.

Task: $1
PROMPT
      ;;
  esac
}

# Write the selected prompt to a temp file (avoids quoting hell)
PROMPT_FILE=$(mktemp /tmp/claude-team-prompt-XXXXXX)
pick_prompt "$1" > "$PROMPT_FILE"

echo -e "${CYAN}Mode:${NC} ${MODE_LABEL}"
echo -e "${CYAN}Team:${NC} ${TEAM_NAME}"
echo ""

# ── Write runner script ─────────────────────────────────────────────────────
# A small script that runs inside tmux. This avoids all nested-quoting issues.
RUNNER_FILE=$(mktemp /tmp/claude-team-runner-XXXXXX)
cat > "$RUNNER_FILE" <<RUNNER
#!/bin/bash
cd "${PROJECT_DIR}"
PROMPT=\$(cat "${PROMPT_FILE}")
exec claude --dangerously-skip-permissions --teammate-mode tmux "\$PROMPT"
RUNNER
chmod +x "$RUNNER_FILE"

# ── Kill stale session ──────────────────────────────────────────────────────
if tmux has-session -t "$TEAM_NAME" 2>/dev/null; then
  echo -e "${YELLOW}Killing existing tmux session '${TEAM_NAME}'...${NC}"
  tmux kill-session -t "$TEAM_NAME"
fi

# ── Launch ──────────────────────────────────────────────────────────────────
echo -e "${GREEN}Launching Claude Code in tmux${USE_CC:+ -CC} session '${TEAM_NAME}'...${NC}"
echo -e "Each teammate spawns as a native iTerm2 pane."
echo ""
echo -e "  ${CYAN}Shift+Up/Down${NC}  Select teammate"
echo -e "  ${CYAN}Enter${NC}          View teammate session"
echo -e "  ${CYAN}Escape${NC}         Interrupt teammate"
echo -e "  ${CYAN}Ctrl+T${NC}         Toggle task list"
echo -e "  ${CYAN}Shift+Tab${NC}      Enable delegate mode"
echo ""

# tmux -CC  → iTerm2 intercepts and renders native panes/tabs
# new-session -s name → named session for easy cleanup
# The runner script handles cd + prompt + launching claude
exec tmux $USE_CC new-session -s "$TEAM_NAME" "$RUNNER_FILE"
