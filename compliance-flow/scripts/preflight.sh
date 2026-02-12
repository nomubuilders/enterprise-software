#!/usr/bin/env bash
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Nomu Compliance Flow — Pre-flight Agent Team (iTerm2 + tmux -CC)
#  Launches a 4-agent team for code quality, testing, docs, cleanup, and push.
#
#  Usage:
#    ./scripts/preflight.sh                  # Full pre-flight
#    ./scripts/preflight.sh --dry-run        # Cleanup preview, no push
#    ./scripts/preflight.sh --skip-push      # Everything except git push
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
set -e

PROJECT_DIR="/Users/rosaria/Desktop/Nomu_software/compliance-flow"
CLAUDE_BIN="/Users/rosaria/.local/share/claude/versions/2.1.37"
TEAM_NAME="preflight-check"
SESSION_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')

# Forward flags
FLAGS=""
for arg in "$@"; do
  FLAGS="$FLAGS $arg"
done

# ── Colors ───────────────────────────────────────────────────────────────────
CYAN='\033[0;36m'  PURPLE='\033[0;35m'  YELLOW='\033[1;33m'
GREEN='\033[0;32m' RED='\033[0;31m'     NC='\033[0m'

echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${PURPLE}  Compliance Ready AI — Pre-flight Agent Team${NC}"
echo -e "${PURPLE}  Nomu: We Make Data Speak.${NC}"
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ── Preflight ────────────────────────────────────────────────────────────────
FAIL=0
if [ ! -x "$CLAUDE_BIN" ]; then
  echo -e "${RED}✗${NC} Claude binary not found at $CLAUDE_BIN"; FAIL=1
else
  echo -e "${GREEN}✓${NC} Claude Code $(${CLAUDE_BIN} --version 2>/dev/null | head -1)"
fi

if ! command -v tmux &>/dev/null; then
  echo -e "${RED}✗${NC} tmux not found (brew install tmux)"; FAIL=1
else
  echo -e "${GREEN}✓${NC} tmux $(tmux -V 2>/dev/null)"
fi

if [ "$TERM_PROGRAM" != "iTerm.app" ]; then
  echo -e "${YELLOW}⚠${NC} Not running inside iTerm2 (current: ${TERM_PROGRAM:-unknown})"
  USE_CC=""
else
  echo -e "${GREEN}✓${NC} iTerm2 detected — native panes via tmux -CC"
  USE_CC="-CC"
fi

[ "$FAIL" -eq 1 ] && { echo -e "\n${RED}Fix the above and retry.${NC}"; exit 1; }

echo -e "${GREEN}✓${NC} Project: ${PROJECT_DIR}"
echo -e "${CYAN}Team:${NC} ${TEAM_NAME}"
echo -e "${CYAN}Session:${NC} ${SESSION_ID}"
echo ""

# ── Kill stale session ───────────────────────────────────────────────────────
if tmux has-session -t "$TEAM_NAME" 2>/dev/null; then
  echo -e "${YELLOW}Killing existing session '${TEAM_NAME}'...${NC}"
  tmux kill-session -t "$TEAM_NAME"
fi

# ── Write team lead prompt ───────────────────────────────────────────────────
PROMPT_FILE=$(mktemp /tmp/preflight-prompt-XXXXXX)
cat > "$PROMPT_FILE" << PROMPT
You are the team lead for a pre-flight quality check on Compliance Ready AI.
Create an agent team called "${TEAM_NAME}" and run a full quality gate before pushing to GitHub.
Flags passed: ${FLAGS}

## Phase 1: Spawn These 4 Teammates (parallel)

1. **code-analyzer** (subagent_type: "code-analyzer")
   - Bug hunt all recently changed files (git diff HEAD~5).
   - Focus on: OWASP vulnerabilities, null/undefined risks, race conditions, type mismatches between frontend API calls and backend endpoints, React hook dependency issues.
   - Check the TTS proxy SSRF surface in backend/app/api/voice.py.
   - Check the DB host resolution fallback in backend/app/api/databases.py.
   - Output: concise bug report with file:line references.

2. **code-simplifier** (subagent_type: "code-simplifier")
   - Review recently modified files for code quality using Context7 MCP.
   - Use resolve-library-id + get-library-docs for: React 19, Zustand 5, FastAPI, Tailwind CSS 4.1, @xyflow/react 12.
   - Check these files specifically:
     - frontend/src/components/nodes/PersonaPlexNode.tsx
     - frontend/src/components/nodes/PersonaPlexChatThread.tsx
     - frontend/src/hooks/useVoiceChat.ts
     - backend/app/api/voice.py
     - backend/app/api/databases.py
     - backend/app/services/tts_service.py
   - Output: simplification suggestions with file:line, following CLAUDE.md standards.

3. **backend-engineer** (subagent_type: "backend-engineer")
   - Run validation tests:
     a. Python syntax check: all files in backend/app/
     b. curl health endpoint: http://localhost:8000/api/v1/health
     c. curl TTS endpoint: POST /voice/tts with {"text":"test"}
     d. curl TTS fallback: POST /voice/tts with {"text":"test","url":"http://localhost:9999/fake"}
     e. curl DB test: POST /databases/test with localhost postgres credentials
     f. Check docker compose ps for running containers
   - Output: pass/fail for each validation with details on failures.

4. **frontend-engineer** (subagent_type: "frontend-engineer")
   - Run TypeScript type check: cd frontend && npx tsc --noEmit
   - Run production build: cd frontend && npm run build
   - Check for any Tailwind class conflicts in recently changed .tsx files
   - Verify all imports resolve (no broken imports from recent refactoring)
   - Output: pass/fail with specific errors and fix suggestions.

## Phase 2: Cleanup (you do this yourself after Phase 1)

Remove these internal PM artifacts that should not be in the GitHub push:

1. Delete .claude/epics/ directory (completed epic tracking — 3 epics, ~40 files)
2. Delete .claude/prds/ directory (completed PRD files — 3 files)
3. Delete scripts/team-prompts.md (internal agent prompts)
4. Delete scripts/launch-team.sh (internal launcher — being replaced)
5. Delete scripts/launch-voice-team.sh (internal launcher — completed)
6. Remove root package.json + package-lock.json if they exist and are empty wrappers (frontend/ has the real one)
7. Clean up any stale plan files in ~/.claude/plans/ older than 1 day
8. Clean up ~/.claude/teams/ and ~/.claude/tasks/ directories

$(if echo "$FLAGS" | grep -q "\-\-dry-run"; then echo "DRY RUN MODE: List what would be deleted but do NOT actually delete anything."; fi)

## Phase 3: Documentation Update (after cleanup)

Read README.md and the recent git log. Update README.md to reflect:
- PersonaPlex Voice Assistant with built-in Piper TTS
- Real DB context loading (schema + sample data from upstream nodes)
- Voice transcription via faster-whisper
- Docker setup: postgres, redis, mongo, backend (Ollama runs locally on host)
- DB host resolution for Docker environments
Keep changes minimal — only update what is outdated or missing.

## Phase 4: Summary & Git Push

1. Collect all teammate reports.
2. Print a summary table: phase | status | details
3. If frontend build FAILED → abort, do not push.
4. Show git status.
$(if echo "$FLAGS" | grep -q "\-\-skip-push"; then
  echo "5. SKIP PUSH MODE: Show what would be committed but do not push."
elif echo "$FLAGS" | grep -q "\-\-dry-run"; then
  echo "5. DRY RUN MODE: Do not commit or push anything."
else
  echo "5. Stage all changes, commit with descriptive message, and push to origin."
  echo "   Commit message should summarize: PersonaPlex TTS, DB context, UX fixes, code quality."
  echo "   Include: Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
fi)

## Coordination Rules

- Wait for ALL 4 teammates to complete before starting Phase 2.
- Track everything via TaskCreate/TaskUpdate/TaskList.
- Each teammate works independently — no file conflicts in Phase 1 (read-only analysis).
- If code-analyzer finds CRITICAL issues, flag them in the summary but still continue.
- Use code-simplifier's Context7 findings to validate suggestions are current.
PROMPT

# ── Write runner script ──────────────────────────────────────────────────────
RUNNER_FILE=$(mktemp /tmp/preflight-runner-XXXXXX)
cat > "$RUNNER_FILE" <<RUNNER
#!/bin/bash
cd "${PROJECT_DIR}"
PROMPT=\$(cat "${PROMPT_FILE}")
exec claude --dangerously-skip-permissions --teammate-mode tmux "\$PROMPT"
RUNNER
chmod +x "$RUNNER_FILE"

# ── Launch ───────────────────────────────────────────────────────────────────
echo -e "${GREEN}Launching pre-flight team in tmux${USE_CC:+ -CC} session '${TEAM_NAME}'...${NC}"
echo -e "4 agents: code-analyzer, code-simplifier, backend-engineer, frontend-engineer"
echo ""
echo -e "  ${CYAN}Shift+Up/Down${NC}  Select teammate"
echo -e "  ${CYAN}Enter${NC}          View teammate session"
echo -e "  ${CYAN}Escape${NC}         Interrupt teammate"
echo -e "  ${CYAN}Ctrl+T${NC}         Toggle task list"
echo -e "  ${CYAN}Shift+Tab${NC}      Enable delegate mode"
echo ""

exec tmux $USE_CC new-session -s "$TEAM_NAME" "$RUNNER_FILE"
