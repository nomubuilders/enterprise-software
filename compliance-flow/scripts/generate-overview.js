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

// --- Timeline phase detection ---

function humanizeEpicName(name) {
  return name
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\s+Implementation$/i, '')
    .trim()
}

function humanizeBranchName(name) {
  return name
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\s+Roadmap$/i, '')
    .trim()
}

function clusterLabel(commits, date) {
  const adds = commits.filter((c) =>
    /^(Add|Create|feat)/i.test(c.message)
  ).length
  const fixes = commits.filter((c) => /^Fix/i.test(c.message)).length
  const cleanup = commits.filter((c) =>
    /^(Remove|Move|chore|Simplify|Unify|Removed)/i.test(c.message)
  ).length

  let label
  if (cleanup > adds && cleanup > fixes) label = 'Cleanup & Restructure'
  else if (cleanup > 0 && adds > 0 && fixes === 0) label = 'Features & Cleanup'
  else if (fixes > adds) label = 'Bug Fixes'
  else if (adds > 0 && fixes > 0) label = 'Features & Fixes'
  else if (adds > 0) label = 'New Features'
  else label = 'Improvements'

  // Append short date for uniqueness across days
  const d = new Date(date + 'T12:00:00Z')
  const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${label} (${monthDay})`
}

function buildTimelinePhases() {
  let raw
  try {
    raw = execSync('git log --format="%aI;;%s" --reverse', {
      cwd: ROOT,
      encoding: 'utf-8',
      timeout: 15000,
    })
  } catch {
    return []
  }

  const commits = raw
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const sep = line.indexOf(';;')
      return { date: line.slice(0, 10), message: line.slice(sep + 2) }
    })
  if (!commits.length) return []

  // Build issue→epic mapping from task files
  const epicsDir = join(ROOT, '.claude/epics')
  const issueToEpic = new Map()
  const epicMeta = new Map()

  if (existsSync(epicsDir)) {
    for (const d of readdirSync(epicsDir)) {
      const epicDir = join(epicsDir, d)
      if (!statSync(epicDir).isDirectory()) continue
      const epicPath = join(epicDir, 'epic.md')
      if (!existsSync(epicPath)) continue

      const content = readFileSync(epicPath, 'utf-8')
      const name = (content.match(/name:\s*(.+)/)?.[1] || d).trim()
      const status = (content.match(/status:\s*(.+)/)?.[1] || 'unknown').trim()
      const created = (content.match(/created:\s*(.+)/)?.[1] || '').trim().slice(0, 10)
      epicMeta.set(d, { name, status, created })

      for (const f of readdirSync(epicDir)) {
        if (/^\d+\.md$/.test(f)) {
          issueToEpic.set(parseInt(f.replace('.md', ''), 10), d)
        }
      }
    }
  }

  // Pre-scan: find merge commits that create new phases (not matching any epic dir)
  const mergePhases = []
  for (const c of commits) {
    const m = c.message.match(
      /Merge (?:pull request #\d+ from \S+\/|branch ')epic\/(.+?)(?:'|$)/
    )
    if (!m) continue
    const branchNorm = m[1].toLowerCase().replace(/-/g, '')
    const matchingEpic = [...epicMeta.keys()].find(
      (d) => d.toLowerCase().replace(/-/g, '') === branchNorm
    )
    if (!matchingEpic) {
      mergePhases.push({
        label: humanizeBranchName(m[1]),
        startDate: c.date,
        endDate: c.date,
        status: 'done',
        commitCount: 1,
      })
    }
  }

  // Assign commits to epics or merge phases
  const epicCommits = new Map()
  const unassigned = []

  for (const c of commits) {
    // Skip merge commits — assign epic merges to their epic
    if (/^Merge /.test(c.message)) {
      const m = c.message.match(
        /Merge (?:pull request #\d+ from \S+\/|branch ')epic\/(.+?)(?:'|$)/
      )
      if (m) {
        const branchNorm = m[1].toLowerCase().replace(/-/g, '')
        const matchingEpic = [...epicMeta.keys()].find(
          (d) => d.toLowerCase().replace(/-/g, '') === branchNorm
        )
        if (matchingEpic) {
          if (!epicCommits.has(matchingEpic)) epicCommits.set(matchingEpic, [])
          epicCommits.get(matchingEpic).push(c)
        }
      }
      continue
    }

    // 1. "Issue #N:" → epic via task file mapping
    const issueMatch = c.message.match(/Issue #(\d+):/)
    if (issueMatch) {
      const epicDir = issueToEpic.get(parseInt(issueMatch[1], 10))
      if (epicDir) {
        if (!epicCommits.has(epicDir)) epicCommits.set(epicDir, [])
        epicCommits.get(epicDir).push(c)
        continue
      }
    }

    // 2. "Epic N:" → nearest merge phase (pre-scanned)
    if (/^Epic \d+:/.test(c.message)) {
      const nearest = mergePhases
        .filter(
          (p) =>
            Math.abs(new Date(c.date) - new Date(p.startDate)) <=
            2 * 86400000
        )
        .sort(
          (a, b) =>
            Math.abs(new Date(c.date) - new Date(a.startDate)) -
            Math.abs(new Date(c.date) - new Date(b.startDate))
        )[0]
      if (nearest) {
        nearest.commitCount++
        if (c.date < nearest.startDate) nearest.startDate = c.date
        if (c.date > nearest.endDate) nearest.endDate = c.date
        continue
      }
    }

    // 3. Commit message contains epic directory name → that epic
    const msgLower = c.message.toLowerCase()
    let epicMatched = false
    for (const [epicDir] of epicMeta) {
      const phrase = epicDir.replace(/-/g, ' ')
      if (msgLower.includes(phrase)) {
        if (!epicCommits.has(epicDir)) epicCommits.set(epicDir, [])
        epicCommits.get(epicDir).push(c)
        epicMatched = true
        break
      }
    }
    if (epicMatched) continue

    unassigned.push(c)
  }

  // Build phases from epics
  const phases = []
  for (const [epicDir, meta] of epicMeta) {
    const eCommits = epicCommits.get(epicDir) || []
    const dates = eCommits.map((c) => c.date).sort()
    phases.push({
      label: humanizeEpicName(meta.name),
      startDate: dates.length ? dates[0] : meta.created,
      endDate: dates.length ? dates[dates.length - 1] : meta.created,
      status: meta.status === 'completed' ? 'done' : 'active',
      commitCount: eCommits.length,
    })
  }

  // Add merge-detected phases
  phases.push(...mergePhases)
  phases.sort((a, b) => a.startDate.localeCompare(b.startDate))

  // Cluster unassigned commits
  if (unassigned.length > 0) {
    const sorted = [...unassigned].sort((a, b) =>
      a.date.localeCompare(b.date)
    )
    const firstPhaseDate =
      phases.length > 0 ? phases[0].startDate : sorted[sorted.length - 1].date

    // Foundation: commits before any named phase
    const foundation = sorted.filter((c) => c.date < firstPhaseDate)
    if (foundation.length > 0) {
      const dates = foundation.map((c) => c.date).sort()
      phases.unshift({
        label: 'Foundation',
        startDate: dates[0],
        endDate: dates[dates.length - 1],
        status: 'done',
        commitCount: foundation.length,
      })
    }

    // Remaining: group by calendar day (each day = own cluster)
    const remaining = sorted.filter((c) => c.date >= firstPhaseDate)
    if (remaining.length > 0) {
      const dayMap = new Map()
      for (const c of remaining) {
        if (!dayMap.has(c.date)) dayMap.set(c.date, [])
        dayMap.get(c.date).push(c)
      }

      for (const [date, dayCommits] of [...dayMap].sort(([a], [b]) =>
        a.localeCompare(b)
      )) {
        phases.push({
          label: clusterLabel(dayCommits, date),
          startDate: date,
          endDate: date,
          status: 'done',
          commitCount: dayCommits.length,
        })
      }
    }
  }

  phases.sort((a, b) => a.startDate.localeCompare(b.startDate))
  return phases
}

function generateGanttMarkup(phases, stats) {
  const today = new Date().toISOString().slice(0, 10)
  const lines = [
    "%%{init: {'theme': 'dark', 'themeVariables': {'primaryColor': '#4004DA', 'primaryTextColor': '#FEFCFD', 'lineColor': '#FF6C1D', 'background': '#36312E', 'mainBkg': '#36312E'}}}%%",
    'gantt',
    '    title ComplianceFlow Development Timeline',
    '    dateFormat YYYY-MM-DD',
    '    axisFormat %b %d',
  ]

  for (let i = 0; i < phases.length; i++) {
    const p = phases[i]
    const id = `p${i + 1}`
    const desc =
      p.commitCount > 1
        ? `${p.label} — ${p.commitCount} commits`
        : p.label
    const statusTag = p.status === 'done' ? 'done, ' : ''
    lines.push('')
    lines.push(`    section ${p.label}`)
    lines.push(
      `    ${desc.padEnd(44)}:${statusTag}${id}, ${p.startDate}, ${p.endDate}`
    )
  }

  // Current milestone
  const milestoneLabel = `${stats.nodes} nodes, ${stats.issues} open issues`
  lines.push('')
  lines.push('    section Current')
  lines.push(
    `    ${milestoneLabel.padEnd(44)}:milestone, now, ${today}, 0d`
  )

  return lines.join('\n')
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

  // Replace entire gantt chart in timeline section
  if (stats.phases.length > 0) {
    const ganttMarkup = generateGanttMarkup(stats.phases, stats)
    html = html.replace(
      /(id="chart-timeline"[\s\S]*?<pre class="mermaid">\n)[\s\S]*?(\n\s*<\/pre>)/,
      `$1${ganttMarkup}$2`
    )
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
  phases: buildTimelinePhases(),
  date: formatDate(),
}

console.log(`  Nodes:      ${stats.nodes}`)
console.log(`  Categories: ${stats.categories}`)
console.log(`  Epics:      ${stats.epics.completed}/${stats.epics.total}`)
console.log(`  Open Issues: ${stats.issues}`)
console.log(`  Infra:      ${stats.infra}`)
console.log(`  Commits:    ${stats.commits.length}`)
console.log(`  Phases:     ${stats.phases.length}`)
console.log(`  Date:       ${stats.date}`)

updateHTML(stats)
console.log('project-overview.html updated.')
