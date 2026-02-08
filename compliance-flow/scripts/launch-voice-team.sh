#!/bin/bash
# ============================================================================
# Compliance Ready AI — Voice Assistant Team Launcher (iTerm2 + tmux -CC)
# ============================================================================
# Launches a 5-agent team to implement the VoiceAssistantNode with local
# Whisper transcription and optional PersonaPlex conversational AI.
#
# Agents: architect, voice-engineer, electron-specialist, backend-engineer,
#         compliance-node-engineer
#
# MUST be run from iTerm2.
#
# Usage:
#   ./scripts/launch-voice-team.sh
# ============================================================================

set -e

PROJECT_DIR="/Users/rosaria/Desktop/Nomu_software/compliance-flow"

# ── Colors ──────────────────────────────────────────────────────────────────
CYAN='\033[0;36m'  PURPLE='\033[0;35m'  YELLOW='\033[1;33m'
GREEN='\033[0;32m' RED='\033[0;31m'     NC='\033[0m'

echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${PURPLE}  Compliance Ready AI — Voice Assistant Team${NC}"
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

# ── Config ──────────────────────────────────────────────────────────────────
TEAM_NAME="compliance-voice"
MODE_LABEL="Voice Team (architect + voice-engineer + electron + backend + node-engineer)"

echo -e "${CYAN}Mode:${NC} ${MODE_LABEL}"
echo -e "${CYAN}Team:${NC} ${TEAM_NAME}"
echo ""

# ── Write prompt to temp file ──────────────────────────────────────────────
PROMPT_FILE=$(mktemp /tmp/claude-voice-team-prompt-XXXXXX)
cat > "$PROMPT_FILE" << 'PROMPT'
You are the team lead for Compliance Ready AI. Create an agent team called "compliance-voice" to implement the **VoiceAssistantNode** — a new node type that provides local Whisper transcription with optional PersonaPlex conversational AI.

## Team Setup — Spawn These 5 Teammates

1. **architect** (subagent_type: "architect")
   - Analyze the codebase: existing IPC namespaces, node registration pattern, executor routing, preload bridge structure.
   - Design API contracts for: Electron whisper IPC namespace, backend voice endpoint, node config schema.
   - Decompose into tasks and assign to teammates. You do NOT write code.

2. **voice-engineer** (subagent_type: "voice-engineer")
   - Implement `frontend/electron/main/whisper-manager.ts` — native Whisper addon lifecycle, model download/cache, transcription API.
   - Define the audio pipeline: renderer captures PCM → IPC → whisper-manager → transcript back.
   - Handle model management: download on first use, cache in userData, hot-swap between sizes.

3. **electron-specialist** (subagent_type: "electron-specialist")
   - Add new `whisper` IPC namespace to `frontend/electron/main/ipc-handlers.ts`.
   - Extend preload bridge in `frontend/electron/preload/index.ts` with `window.electronAPI.whisper`.
   - Add TypeScript types in `frontend/src/types/electron.ts` for the whisper namespace.

4. **backend-engineer** (subagent_type: "backend-engineer")
   - Create `backend/app/services/voice_service.py` using faster-whisper for server-side transcription.
   - Create `backend/app/api/voice.py` with `POST /api/v1/voice/transcribe` endpoint.
   - Register the router in the FastAPI app.

5. **compliance-node-engineer** (subagent_type: "compliance-node-engineer")
   - Create `VoiceAssistantNode.tsx` React component in `frontend/src/components/nodes/`.
   - Create `VoiceAssistantNodeConfig.tsx` config panel in `frontend/src/components/panels/configs/`.
   - Register the node across all touchpoints (8-step checklist below).
   - Add execution logic to `backend/app/services/executor.py`.

## Execution Phases

### Phase 1: Architecture (architect alone)
- Analyze existing patterns: read ipc-handlers.ts, preload/index.ts, electron.ts types, executor.py, NodeConfigPanel.tsx, Sidebar.tsx, nodeColors.ts, nodes/index.ts, workflow.py
- Design contracts and create tasks for all teammates

### Phase 2: Parallel Implementation (voice-engineer + electron-specialist + backend-engineer)
- voice-engineer: whisper-manager.ts (native addon, model management)
- electron-specialist: IPC handlers + preload bridge + types (depends on voice-engineer's interface)
- backend-engineer: voice_service.py + voice.py endpoint (independent)

### Phase 3: Node Wiring (compliance-node-engineer, after Phase 2)
- VoiceAssistantNode.tsx component
- Config panel with all fields
- Node registration (8-step checklist)
- Executor integration

### Phase 4: Quality (subagents)
- Spawn code-analyzer to review all new files
- Spawn test-runner to validate

## Technical Context (so agents don't need to research)

### Whisper Architecture

**Native Electron path (primary)**:
- Package: `@kutalia/whisper-node-addon` — Node.js native binding to whisper.cpp
- Runs in Electron main process only (not renderer, not worker)
- Models stored in `app.getPath('userData')/whisper-models/`
- Supported models: tiny (~75MB), small (~244MB), medium (~769MB), large-v3-turbo (~1.6GB)
- Input format: 16kHz mono PCM Float32 audio (WAV)
- The addon exposes: `whisper(params)` returning `{ result: string[] }`

**Backend path (fallback for browser mode)**:
- Package: `faster-whisper` (CTranslate2-optimized)
- Runs in backend Docker container
- Same model options, same audio format
- Used when Electron is not available or for batch processing

### Audio Pipeline
```
Renderer: navigator.mediaDevices.getUserMedia({ audio: true })
  → AudioContext (resample to 16kHz)
  → AudioWorkletNode (PCM Float32 chunks)
  → IPC: window.electronAPI.whisper.transcribe(audioBuffer)
Main Process: whisper-manager.ts
  → @kutalia/whisper-node-addon
  → transcript string
  → IPC callback to renderer
```

### Model Management
- No models bundled with app — too large
- On first use of VoiceAssistantNode, prompt user to download selected model
- Download via HTTPS from Hugging Face (ggerganov/whisper.cpp model files)
- Progress reported via IPC: `whisper:download-progress`
- Cache in `{userData}/whisper-models/{model-name}.bin`
- User selects model in node config panel

### PersonaPlex Integration (Optional)
- WebSocket connection to GPU server for conversational AI with persona
- Protocol: send PCM audio → receive Opus audio + transcript
- Persona configured via text prompt in node config
- Voice embedding field for consistent persona voice
- Toggle: `personaplex_enabled` in config, with `personaplex_url` field
- Default off — pure local Whisper is the primary use case

### New Files to Create

| File | Owner | Description |
|------|-------|-------------|
| `frontend/electron/main/whisper-manager.ts` | voice-engineer | Native Whisper addon lifecycle, model management |
| `frontend/electron/preload/index.ts` | electron-specialist | Add `whisper` namespace to existing bridge |
| `frontend/src/types/electron.ts` | electron-specialist | Add whisper type definitions |
| `frontend/electron/main/ipc-handlers.ts` | electron-specialist | Add whisper IPC channel handlers |
| `backend/app/services/voice_service.py` | backend-engineer | faster-whisper inference service |
| `backend/app/api/voice.py` | backend-engineer | REST endpoint for voice transcription |
| `frontend/src/components/nodes/VoiceAssistantNode.tsx` | compliance-node-engineer | React Flow node component |
| `frontend/src/components/panels/configs/VoiceAssistantNodeConfig.tsx` | compliance-node-engineer | Config panel |

### Files to Update

| File | Owner | Change |
|------|-------|--------|
| `frontend/src/components/nodes/index.ts` | compliance-node-engineer | Export VoiceAssistantNode |
| `frontend/src/components/sidebar/Sidebar.tsx` | compliance-node-engineer | Add to Communication category |
| `frontend/src/config/nodeColors.ts` | compliance-node-engineer | Add voiceAssistantNode color (Integration/Indigo) |
| `frontend/src/components/panels/NodeConfigPanel.tsx` | compliance-node-engineer | Route to VoiceAssistantNodeConfig |
| `backend/app/models/workflow.py` | compliance-node-engineer | Add voiceAssistantNode to NodeType enum |
| `backend/app/services/executor.py` | compliance-node-engineer | Add voiceAssistantNode execution case |
| `frontend/electron/main/index.ts` | electron-specialist | Import and init whisper-manager |

### Node Registration Checklist (8 steps)
1. React component in `frontend/src/components/nodes/VoiceAssistantNode.tsx`
2. Export in `frontend/src/components/nodes/index.ts`
3. Sidebar entry in `frontend/src/components/sidebar/Sidebar.tsx` (Communication category)
4. Color mapping in `frontend/src/config/nodeColors.ts`
5. Config panel in `frontend/src/components/panels/configs/VoiceAssistantNodeConfig.tsx`
6. Config routing in `frontend/src/components/panels/NodeConfigPanel.tsx`
7. NodeType enum in `backend/app/models/workflow.py`
8. Executor logic in `backend/app/services/executor.py`

### VoiceAssistantNode Config Fields
```typescript
interface VoiceAssistantNodeConfig {
  // Transcription
  transcription_model: 'tiny' | 'small' | 'medium' | 'large-v3-turbo'
  language: string              // ISO 639-1 code, default 'en'
  realtime_preview: boolean     // Show partial transcripts while speaking
  use_backend: boolean          // Force backend API instead of native addon

  // PersonaPlex (optional)
  personaplex_enabled: boolean
  personaplex_url: string       // WSS URL for PersonaPlex server
  persona_prompt: string        // Text prompt defining the AI persona
  voice_embedding: string       // Base64 voice embedding for consistent persona voice
}
```

## Coordination Rules

- **No file conflicts**: Each teammate owns specific files (see table above).
- **API contracts first**: Architect defines interfaces before implementation starts.
- **Task tracking**: All work flows through TaskCreate/TaskUpdate/TaskList.
- **Communication**: Use direct messages for cross-agent coordination.
- **Quality gates**: Spawn code-analyzer before marking tasks complete.

Start by creating the team, spawning all 5 teammates, and having the architect do the initial codebase analysis and task decomposition.
PROMPT

# ── Write runner script ─────────────────────────────────────────────────────
RUNNER_FILE=$(mktemp /tmp/claude-voice-team-runner-XXXXXX)
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

exec tmux $USE_CC new-session -s "$TEAM_NAME" "$RUNNER_FILE"
