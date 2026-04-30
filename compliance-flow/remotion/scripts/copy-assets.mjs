import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const frontendPublic = resolve(root, '..', 'frontend', 'public')
const remotionPublic = resolve(root, 'public')

const assets = ['nomu-logo.png', 'nomu-logo-word.png', 'nomu-symbol.png']

if (!existsSync(remotionPublic)) {
  mkdirSync(remotionPublic, { recursive: true })
}

let copied = 0
let missing = 0

for (const asset of assets) {
  const src = join(frontendPublic, asset)
  const dst = join(remotionPublic, asset)
  if (!existsSync(src)) {
    console.warn(`[copy-assets] missing source: ${src}`)
    missing += 1
    continue
  }
  copyFileSync(src, dst)
  copied += 1
}

console.log(`[copy-assets] copied ${copied}/${assets.length} brand assets to public/${missing ? ` (${missing} missing)` : ''}`)
