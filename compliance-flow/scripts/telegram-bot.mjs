#!/usr/bin/env node
// ============================================================================
// Compliance Ready AI — Telegram Commander Bot
// ============================================================================
// Speed tiers:
//   INSTANT (<1s)  — /status /log /agents /start → direct git/fs, no Claude
//   FAST    (~15s) — /quick /todo               → claude -p with Haiku
//   FULL    (~60s) — /build + free-text          → claude -p with Opus
// ============================================================================

import { Telegraf } from 'telegraf'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'

const execFileAsync = promisify(execFile)

// ── Config ─────────────────────────────────────────────────────────────────
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const ALLOWED_USERS = (process.env.TELEGRAM_ALLOWED_USERS || '')
  .split(',').map(id => parseInt(id.trim(), 10)).filter(Boolean)
const PROJECT_DIR = process.env.PROJECT_DIR ||
  '/Users/rosaria/Desktop/Nomu_software/compliance-flow'
const CLAUDE_BIN = process.env.CLAUDE_BIN || 'claude'
const MAX_MSG = 4000
let consecutiveErrors = 0

if (!BOT_TOKEN) {
  console.error('❌ Set TELEGRAM_BOT_TOKEN env var. Get one from @BotFather.')
  process.exit(1)
}
if (ALLOWED_USERS.length === 0) {
  console.error('❌ Set TELEGRAM_ALLOWED_USERS (comma-separated IDs from @userinfobot).')
  process.exit(1)
}

// ── Bot (shorter timeouts so sleep/wake recovers fast) ─────────────────────
const bot = new Telegraf(BOT_TOKEN, {
  handlerTimeout: Infinity,      // disabled — Claude handlers use fire-and-forget
  telegram: { apiRoot: 'https://api.telegram.org' }
})

bot.use((ctx, next) => {
  if (!ALLOWED_USERS.includes(ctx.from?.id)) return ctx.reply('⛔ Not authorized.')
  return next()
})

// Reset error count on any successful update (must be before command handlers)
bot.use((ctx, next) => {
  consecutiveErrors = 0
  return next()
})

// /ping — instant connectivity test (no git, no Claude, nothing)
bot.command('ping', (ctx) => ctx.reply('🏓 pong'))

// ── Helpers ────────────────────────────────────────────────────────────────

async function git(...args) {
  const { stdout } = await execFileAsync('git', args, { cwd: PROJECT_DIR, timeout: 10000 })
  return stdout.trim()
}

/** Escape markdown special chars so Telegram doesn't choke */
function esc(text) {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1')
}

async function runClaude(prompt, { tools, model, timeout } = {}) {
  const args = [
    '-p', prompt,
    '--output-format', 'text',
    '--dangerously-skip-permissions',
    '--no-session-persistence',
    '--mcp-config', '{"mcpServers":{}}',
    '--strict-mcp-config'
  ]
  if (tools) {
    args.push('--allowedTools', tools)
    args.push('--tools', tools)
  }
  if (model) args.push('--model', model)

  const start = Date.now()
  try {
    const { stdout, stderr } = await execFileAsync(CLAUDE_BIN, args, {
      cwd: PROJECT_DIR,
      timeout: timeout || 10 * 60 * 1000,
      maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env, CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: '1' }
    })
    const sec = ((Date.now() - start) / 1000).toFixed(0)
    const out = stdout.trim() || stderr.trim() || '(no output)'
    return `${out}\n\n⏱ ${sec}s`
  } catch (err) {
    if (err.killed) return '⏱ Timed out.'
    const out = err.stdout?.trim() || ''
    return out || `❌ ${err.message?.slice(0, 500)}`
  }
}

function splitMsg(text) {
  if (text.length <= MAX_MSG) return [text]
  const chunks = []
  let rem = text
  while (rem.length > 0) {
    let end = Math.min(rem.length, MAX_MSG)
    const nl = rem.lastIndexOf('\n', end)
    if (nl > MAX_MSG * 0.5) end = nl + 1
    chunks.push(rem.slice(0, end))
    rem = rem.slice(end)
  }
  return chunks
}

async function reply(ctx, text) {
  for (const chunk of splitMsg(text)) {
    await ctx.reply(chunk, { parse_mode: 'Markdown' })
      .catch(() => ctx.reply(chunk))
  }
}

/**
 * Fire-and-forget: sends ack immediately, runs claudeFn in background.
 * Handler returns right away so telegraf's timeout never fires.
 */
function runInBackground(ctx, ackText, claudeFn) {
  ctx.reply(ackText).catch(() => {})
  const typing = setInterval(() => ctx.sendChatAction('typing').catch(() => {}), 4000)
  claudeFn()
    .then((result) => {
      clearInterval(typing)
      reply(ctx, result)
    })
    .catch((err) => {
      clearInterval(typing)
      ctx.reply(`❌ ${err.message?.slice(0, 500) || 'Unknown error'}`).catch(() => {})
    })
}

// ── INSTANT commands (no Claude, <1s) ──────────────────────────────────────

bot.command('start', (ctx) => ctx.reply(
`🤖 *Compliance Flow — Remote*

⚡ *Instant* (<1s):
/status — Branch, recent commits, dirty files
/log — Last 10 commits
/diff — Uncommitted changes
/agents — List agents

🏎 *Fast* (~15s):
/quick \`question\` — Read-only answer (Haiku)
/todo \`task\` — Create a tracked task

🔨 *Full* (~60s):
/build \`description\` — Implement a feature
_or just type anything_

_Project: compliance-flow_`, { parse_mode: 'Markdown' }))

bot.command('status', async (ctx) => {
  try {
    const branch = await git('branch', '--show-current').catch(() => 'detached HEAD')
    const log = await git('log', '--oneline', '-5').catch(() => '(no commits)')
    const status = await git('status', '--short').catch(() => '')
    const dirty = status || '(clean)'
    // Plain text — no Markdown parsing issues
    await ctx.reply(
`📊 Status

Branch: ${branch || 'detached HEAD'}

Recent commits:
${log}

Working tree:
${dirty}`)
  } catch (e) {
    await ctx.reply(`❌ ${e.message?.slice(0, 200)}`)
  }
})

bot.command('log', async (ctx) => {
  try {
    const log = await git('log', '--oneline', '--decorate', '-10')
    await ctx.reply(`📋 Commits:\n${log}`)
  } catch { await ctx.reply('❌ Could not read git log.') }
})

bot.command('diff', async (ctx) => {
  try {
    const diff = await git('diff', '--stat').catch(() => '')
    const staged = await git('diff', '--staged', '--stat').catch(() => '')
    const parts = []
    if (diff) parts.push(`Unstaged:\n${diff}`)
    if (staged) parts.push(`Staged:\n${staged}`)
    if (!diff && !staged) parts.push('✅ No changes')
    await ctx.reply(parts.join('\n\n'))
  } catch { await ctx.reply('✅ No changes') }
})

bot.command('agents', (ctx) => ctx.reply(
`🤖 *Agents*

*Code:* frontend-engineer, backend-engineer, compliance-node-engineer, electron-specialist, integration-engineer
*Plan:* architect (no code)
*Scan:* n8n-scout (Playwright), code-analyzer, code-simplifier
*Infra:* docker-infra
*Util:* test-runner, file-analyzer, parallel-worker`, { parse_mode: 'Markdown' }))

// ── FAST commands (~15s, Haiku) ────────────────────────────────────────────

bot.command('quick', (ctx) => {
  const q = ctx.message.text.replace(/^\/quick\s*/, '').trim()
  if (!q) return ctx.reply('Usage: /quick <question>')

  runInBackground(ctx, '🏎 Thinking...', () =>
    runClaude(q, { tools: 'Read,Glob,Grep', model: 'haiku', timeout: 2 * 60 * 1000 })
  )
})

bot.command('todo', (ctx) => {
  const desc = ctx.message.text.replace(/^\/todo\s*/, '').trim()
  if (!desc) return ctx.reply('Usage: /todo <task description>')

  runInBackground(ctx, '📝 Creating task...', () =>
    runClaude(
      `Create a task: "${desc}". Use TaskCreate with a clear subject, full description, and activeForm. Confirm what was created. Be very brief.`,
      { tools: 'Read,Glob,Grep', model: 'haiku', timeout: 2 * 60 * 1000 }
    ).then((r) => `📝 ${r}`)
  )
})

// ── FULL commands (~60s, Opus) ─────────────────────────────────────────────

bot.command('build', (ctx) => {
  const task = ctx.message.text.replace(/^\/build\s*/, '').trim()
  if (!task) return ctx.reply('Usage: /build <what to build>')

  runInBackground(ctx, '🔨 Building...', () =>
    runClaude(
`Task: ${task}

1. Read existing code first
2. Follow CLAUDE.md conventions (Tailwind, ?? defaults, Zustand)
3. Implement the changes
4. Commit with a descriptive message
5. Reply with ONLY: summary + files changed (mobile screen, be brief)`,
      { tools: 'Read,Edit,Write,Glob,Grep,Bash(git:*)' }
    ).then((r) => `✅ *Done*\n\n${r}`)
  )
})

// ── Default: any message → full Claude prompt ──────────────────────────────

bot.on('text', (ctx) => {
  const prompt = ctx.message.text.trim()
  if (!prompt) return

  runInBackground(ctx, '🧠 Working...', () =>
    runClaude(prompt, { tools: 'Read,Edit,Write,Glob,Grep,Bash(git:*)' })
  )
})

// ── Error handling + auto-reconnect on sleep/wake ──────────────────────────

bot.catch((err, ctx) => {
  consecutiveErrors++
  console.error(`[${new Date().toLocaleTimeString()}] Error #${consecutiveErrors}: ${err.message}`)
  ctx.reply('❌ Something went wrong. Try again.').catch(() => {})

  // 3+ errors in a row = connection is dead (Mac slept), restart polling
  if (consecutiveErrors >= 3) {
    console.log('🔄 Too many errors — restarting polling...')
    bot.stop('reconnect').catch(() => {})
    setTimeout(() => {
      consecutiveErrors = 0
      bot.launch({ dropPendingUpdates: true })
      console.log('✅ Reconnected.')
    }, 2000)
  }
})

// ── Launch with connectivity check ─────────────────────────────────────────
async function start() {
  // Verify we can reach Telegram API before starting
  try {
    const me = await bot.telegram.getMe()
    console.log(`✅ Connected as @${me.username}`)
  } catch (e) {
    console.error(`❌ Cannot reach Telegram API: ${e.message}`)
    console.error('   Check your internet connection and bot token.')
    process.exit(1)
  }

  // Verify Claude CLI is available
  try {
    await execFileAsync(CLAUDE_BIN, ['--version'], { timeout: 5000 })
    console.log('✅ Claude CLI available')
  } catch {
    console.log('⚠️  Claude CLI not responding (build/quick/todo will fail)')
  }

  bot.launch({ dropPendingUpdates: true })
  console.log('')
  console.log('🤖 Bot is live. Send /ping to test.')
  console.log(`📂 Project: ${PROJECT_DIR}`)
  console.log(`👤 Allowed users: ${ALLOWED_USERS.join(', ')}`)
  console.log('')
  console.log('  ⚡ /ping /status /log /diff /agents → instant')
  console.log('  🏎  /quick /todo                    → ~15s (Haiku)')
  console.log('  🔨 /build + free-text               → ~60s (Opus)')
  console.log('')
  console.log('Auto-reconnects after sleep. Ctrl+C to stop.')
}

start()

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
