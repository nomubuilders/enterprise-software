#!/bin/bash
# Fix Telegram Bot Timeout — Agent Team
# Usage: ./scripts/fix-telegram-swarm.sh [--tmux]

set -e

DIR="$(cd "$(dirname "$0")/.." && pwd)"
CLI="$(command -v claude 2>/dev/null || echo "$HOME/.local/bin/claude")"

if [ ! -x "$CLI" ]; then
  echo "❌ Claude CLI not found. Install it or add to PATH."
  exit 1
fi

cd "$DIR"

CLAUDECODE=1 \
CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1 \
exec "$CLI" \
  --dangerously-skip-permissions \
  --model claude-opus-4-6 \
  -p 'Create an agent team called "fix-telegram-bot" to diagnose and fix the Telegram bot timeout issue affecting /quick and /build commands. The bot times out when users send these commands. Spawn 4 teammates: (1) researcher (subagent_type: architect) to investigate root cause — look at scripts/setup-telegram.sh, telegram config, MCP server configs, and bot integration code, (2) backend-dev (subagent_type: backend-engineer) to implement the fix after researcher reports findings, (3) simplifier (subagent_type: code-simplifier) to review and clean up the fix, (4) tester (subagent_type: telegram-commander, model: claude-sonnet-4-5-20250929) to validate /quick and /build work after the fix. Create tasks with dependencies: investigate root cause -> implement fix -> review/simplify + validate. Use delegate mode — do NOT implement code yourself, only coordinate. Wait for teammates to finish before proceeding.'
