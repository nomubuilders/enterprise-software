# Compliance Flow — Remotion Pitch Video

A 25-second motion pitch for Compliance Ready AI, built with [Remotion](https://www.remotion.dev/).

## Install

```bash
cd compliance-flow/remotion
npm install   # or: pnpm install
```

`postinstall` automatically copies the Nomu brand assets from `../frontend/public/` into `./public/` so Remotion can `staticFile()` them. Re-run manually with `npm run copy-assets` if you update the source assets.

> **Important:** install **inside** `compliance-flow/remotion/`, not at the repo root. If you accidentally ran `pnpm add remotion-bits` from `/enterprise-software/`, you'll have a stray `package.json`, `pnpm-lock.yaml`, and `node_modules/` at the repo root. Either delete them, or move the dep here (it's already listed in this `package.json`). See `BITS.md` for the catalog of available bits.

> **Upstream bug workaround:** `remotion-bits@0.2.0` ships `culori` as a `devDependency` instead of a runtime `dependency`, but its `dist/utils/color.js` and `dist/utils/gradient.js` import from it at bundle time. Symptom: `Module not found: Error: Can't resolve 'culori'` when starting the studio. We declare `culori` directly in our `dependencies` to work around this. If a future `remotion-bits` release fixes it, this line can be removed.

## Preview interactively

```bash
npm run studio
```

Opens the Remotion Studio in the browser at <http://localhost:3000>. Edit any file under `src/` and the preview hot-reloads.

## Render the video

```bash
# H.264 MP4 (recommended for sharing)
npm run render

# VP9 WebM (transparent-friendly, smaller)
npm run render:webm

# Single-frame poster (for thumbnails / previews)
npm run render:still
```

Output files land in `./out/` and are gitignored.

## What the video shows

1. **Hook (0–6s):** Three things wrong with cloud AI for regulated industries.
2. **Solution (6–10s):** Nomu logo reveal + tagline.
3. **Venn diagram (10–18s):** Local-first × Audit-native × Governance primitives = ComplianceFlow.
4. **Workflow (18–24s):** Animated node graph — Trigger → Document → PII Filter → LLM → Audit → Output.
5. **Outro (24–25s):** "Run AI on your terms."

Total: 750 frames @ 30fps = 25 seconds.

## File map

```text
remotion/
├── src/
│   ├── index.ts             # Remotion entry — registers the Root
│   ├── Root.tsx             # Composition registry (1080p, 30fps, 750 frames)
│   ├── theme.ts             # Nomu palette, typography, easing helpers
│   ├── PitchVideo.tsx       # Sequences the five scenes
│   ├── scenes/
│   │   ├── HookScene.tsx    # Three cloud AI problems
│   │   ├── SolutionScene.tsx# Logo reveal
│   │   ├── VennScene.tsx    # 3-circle diagram
│   │   ├── WorkflowScene.tsx# Animated node graph
│   │   └── OutroScene.tsx   # CTA
│   └── components/
│       ├── BrandWordmark.tsx
│       ├── WorkflowNode.tsx
│       └── AnimatedEdge.tsx
├── public/                  # Brand assets (copied from frontend, gitignored)
├── scripts/
│   └── copy-assets.mjs
├── out/                     # Rendered videos (gitignored)
├── package.json
├── tsconfig.json
└── remotion.config.ts
```

## Editing tips

- **Tune scene timing:** edit the `Sequence` `from` / `durationInFrames` props in `PitchVideo.tsx`.
- **Change palette:** edit `src/theme.ts`. Every scene reads from the same exported `theme` object.
- **Swap copy:** the three cloud-AI problems live in `HookScene.tsx`, the tagline in `OutroScene.tsx`.
- **Add a scene:** create a new file under `src/scenes/`, import in `PitchVideo.tsx`, drop into the sequence.

## Constraints / honesty notes

- The video is motion-graphic only — no live screen capture of the actual app yet. A V2 should record real Canvas / Sidebar / Service Dashboard footage and overlay the pitch text.
- The workflow scene shows a stylized representation; node labels and palette match the real app, but the layout is for video readability, not app fidelity.
- The PII redaction beat in the workflow scene is **aspirational for the database path** — see `compliance-flow/CONCEPT.md` section 9. Either fix `frontend/src/store/workflowStore.ts:498` first, or keep the visual abstract enough that it doesn't promise something the demo can't deliver.
