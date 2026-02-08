#!/usr/bin/env node

/**
 * Auto-update script for project-overview.html
 * Scans the project for current stats and updates the overview document.
 *
 * Usage: node scripts/generate-overview.js
 * Or:    npm run overview (from frontend/)
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = join(__dirname, '..')

// --- Data collectors ---

function countNodeTypes() {
  const nodesDir = join(ROOT, 'frontend/src/components/nodes')
  const indexFile = readFileSync(join(nodesDir, 'index.ts'), 'utf-8')
  const matches = indexFile.match(/^\s+\w+:\s+\w+,?$/gm)
  return matches ? matches.length : 0
}

function countSidebarCategories() {
  const sidebarFile = readFileSync(
    join(ROOT, 'frontend/src/components/sidebar/Sidebar.tsx'),
    'utf-8'
  )
  const categories = new Set()
  const re = /category:\s*['"]([^'"]+)['"]/g
  let m
  while ((m = re.exec(sidebarFile)) !== null) {
    categories.add(m[1])
  }
  return categories.size
}

function countEpics() {
  const epicsDir = join(ROOT, '.claude/epics')
  if (!existsSync(epicsDir)) return { completed: 0, total: 0 }

  const dirs = readdirSync(epicsDir).filter((d) => {
    const p = join(epicsDir, d)
    return statSync(p).isDirectory() && existsSync(join(p, 'epic.md'))
  })

  let completed = 0
  for (const d of dirs) {
    const content = readFileSync(join(epicsDir, d, 'epic.md'), 'utf-8')
    if (/status:\s*completed/i.test(content)) completed++
  }
  return { completed, total: dirs.length }
}

function countOpenIssues() {
  try {
    const out = execSync('gh issue list --state open --json number 2>/dev/null', {
      cwd: ROOT,
      encoding: 'utf-8',
      timeout: 10000,
    })
    return JSON.parse(out).length
  } catch {
    return 0
  }
}

function countInfraServices() {
  const composePath = join(ROOT, 'docker-compose.yml')
  if (!existsSync(composePath)) return 0
  const content = readFileSync(composePath, 'utf-8')
  // Count top-level service definitions (2-space indent, word followed by colon)
  const inServices = content.split(/^services:\s*$/m)[1] || ''
  const volumesStart = inServices.indexOf('\nvolumes:')
  const servicesBlock = volumesStart > -1 ? inServices.slice(0, volumesStart) : inServices
  const matches = servicesBlock.match(/^\s{2}\w[\w-]*:/gm)
  return matches ? matches.length : 0
}

function getRecentCommits() {
  try {
    const SEP = ';;SEP;;'
    const raw = execSync(`git log -10 --format="COMMIT:%H${SEP}%s${SEP}%ar" --shortstat`, {
      cwd: ROOT,
      encoding: 'utf-8',
      timeout: 10000,
    })
    const commits = []
    const lines = raw.split('\n')
    let current = null
    for (const line of lines) {
      if (line.startsWith('COMMIT:')) {
        if (current) commits.push(current)
        const parts = line.slice(7).split(SEP)
        current = { hash: parts[0], message: parts[1] || '', timeAgo: parts[2] || '', filesChanged: 0 }
      } else if (current && line.includes('file')) {
        const match = line.match(/(\d+)\s+file/)
        if (match) current.filesChanged = parseInt(match[1], 10)
      }
    }
    if (current) commits.push(current)
    return commits
  } catch {
    return []
  }
}

function formatDate() {
  const now = new Date()
  return now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// --- HTML updater ---

function updateHTML(stats) {
  const htmlPath = join(ROOT, 'project-overview.html')
  if (!existsSync(htmlPath)) {
    console.error('project-overview.html not found at', htmlPath)
    process.exit(1)
  }

  let html = readFileSync(htmlPath, 'utf-8')

  // Replace data-stat values: <element data-stat="key">old value</element>
  const replacements = {
    nodes: String(stats.nodes),
    categories: String(stats.categories),
    epics: `${stats.epics.completed}/${stats.epics.total}`,
    issues: String(stats.issues),
    infra: String(stats.infra),
    date: stats.date,
  }

  for (const [key, value] of Object.entries(replacements)) {
    // Match any tag with data-stat="key">...</tag>
    const re = new RegExp(`(data-stat="${key}">)[^<]*(<)`, 'g')
    html = html.replace(re, `$1${value}$2`)
  }

  // Inject recent activity commit cards
  if (stats.commits.length > 0) {
    const cards = stats.commits.map(c => {
      const msg = c.message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
      const filesLabel = c.filesChanged === 1 ? '1 file changed' : `${c.filesChanged} files changed`
      return `          <div class="activity-card">
            <div class="commit-msg">${msg}</div>
            <div class="commit-meta">${c.timeAgo}</div>
            <div class="commit-files">${filesLabel}</div>
          </div>`
    }).join('\n')
    html = html.replace(
      /<!-- ACTIVITY-START -->[\s\S]*?<!-- ACTIVITY-END -->/,
      `<!-- ACTIVITY-START -->\n${cards}\n<!-- ACTIVITY-END -->`
    )
  }

  writeFileSync(htmlPath, html, 'utf-8')
}

// --- Main ---

console.log('Scanning project...')

const stats = {
  nodes: countNodeTypes(),
  categories: countSidebarCategories(),
  epics: countEpics(),
  issues: countOpenIssues(),
  infra: countInfraServices(),
  commits: getRecentCommits(),
  date: formatDate(),
}

console.log(`  Nodes:      ${stats.nodes}`)
console.log(`  Categories: ${stats.categories}`)
console.log(`  Epics:      ${stats.epics.completed}/${stats.epics.total}`)
console.log(`  Open Issues: ${stats.issues}`)
console.log(`  Infra:      ${stats.infra}`)
console.log(`  Commits:    ${stats.commits.length}`)
console.log(`  Date:       ${stats.date}`)

updateHTML(stats)
console.log('project-overview.html updated.')
