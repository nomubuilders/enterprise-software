#!/bin/bash
# ============================================================================
# Telegram Bot Setup — One-time setup & launcher
# ============================================================================
# Usage:
#   ./scripts/setup-telegram.sh              # Interactive setup
#   ./scripts/setup-telegram.sh --run        # Just run (already configured)
# ============================================================================

set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$PROJECT_DIR/.env.telegram"

CYAN='\033[0;36m' GREEN='\033[0;32m' YELLOW='\033[1;33m'
RED='\033[0;31m' PURPLE='\033[0;35m' NC='\033[0m'

echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${PURPLE}  Compliance Ready AI — Telegram Bot Setup${NC}"
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ── Check dependencies ──────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  echo -e "${RED}✗${NC} Node.js not found"
  exit 1
fi
echo -e "${GREEN}✓${NC} Node.js $(node -v)"

if ! command -v claude &>/dev/null; then
  echo -e "${RED}✗${NC} Claude CLI not found"
  exit 1
fi
echo -e "${GREEN}✓${NC} Claude CLI"

# ── Install telegraf if needed ──────────────────────────────────────────────
if ! node -e "require('telegraf')" 2>/dev/null; then
  echo -e "${YELLOW}Installing telegraf...${NC}"
  cd "$PROJECT_DIR/frontend" && npm install telegraf 2>/dev/null || \
  npm install --prefix "$PROJECT_DIR/scripts" telegraf
  echo -e "${GREEN}✓${NC} telegraf installed"
else
  echo -e "${GREEN}✓${NC} telegraf"
fi
echo ""

# ── Setup or Run ────────────────────────────────────────────────────────────
if [ "$1" = "--run" ] && [ -f "$ENV_FILE" ]; then
  echo -e "${GREEN}Loading config from $ENV_FILE${NC}"
  set -a; source "$ENV_FILE"; set +a
  echo ""
  echo -e "${GREEN}Starting bot...${NC}"
  exec node "$PROJECT_DIR/scripts/telegram-bot.mjs"
fi

# ── Interactive Setup ───────────────────────────────────────────────────────
echo -e "${CYAN}Step 1: Create your Telegram bot${NC}"
echo ""
echo "  1. Open Telegram on your phone"
echo "  2. Search for @BotFather and start a chat"
echo "  3. Send: /newbot"
echo "  4. Pick a name (e.g., 'Compliance Flow Bot')"
echo "  5. Pick a username (e.g., 'compliance_flow_bot')"
echo "  6. Copy the API token BotFather gives you"
echo ""
read -p "Paste your bot token: " BOT_TOKEN
echo ""

if [ -z "$BOT_TOKEN" ]; then
  echo -e "${RED}No token provided. Exiting.${NC}"
  exit 1
fi

echo -e "${CYAN}Step 2: Get your Telegram user ID${NC}"
echo ""
echo "  1. Search for @userinfobot on Telegram"
echo "  2. Start a chat and send any message"
echo "  3. It will reply with your user ID (a number)"
echo ""
read -p "Paste your user ID: " USER_ID
echo ""

if [ -z "$USER_ID" ]; then
  echo -e "${RED}No user ID provided. Exiting.${NC}"
  exit 1
fi

# ── Save config ─────────────────────────────────────────────────────────────
cat > "$ENV_FILE" <<EOF
TELEGRAM_BOT_TOKEN=${BOT_TOKEN}
TELEGRAM_ALLOWED_USERS=${USER_ID}
PROJECT_DIR=${PROJECT_DIR}
EOF

echo -e "${GREEN}✓${NC} Config saved to ${ENV_FILE}"
echo ""

# Add to .gitignore if not already there
if ! grep -q '.env.telegram' "$PROJECT_DIR/.gitignore" 2>/dev/null; then
  echo '.env.telegram' >> "$PROJECT_DIR/.gitignore"
  echo -e "${GREEN}✓${NC} Added .env.telegram to .gitignore"
fi

# ── Launch ──────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}Setup complete. Starting bot...${NC}"
echo ""
echo -e "To run again later:"
echo -e "  ${CYAN}./scripts/setup-telegram.sh --run${NC}"
echo ""

set -a; source "$ENV_FILE"; set +a
exec node "$PROJECT_DIR/scripts/telegram-bot.mjs"
