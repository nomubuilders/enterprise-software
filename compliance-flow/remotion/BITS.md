# remotion-bits — local catalog

Quick reference for the 62 bits in `remotion-bits@0.2.0`. Source: `node_modules/remotion-bits/registry.json`.

Use this file as a lookup before reaching for raw imports — most motion needs already have a purpose-built bit.

## How to use a bit

Two paths:

1. **Runtime import** (default, used in this project):
   ```tsx
   import { AnimatedText, MatrixRain, AnimatedCounter } from 'remotion-bits'
   ```
2. **Copy-into-source** (shadcn-style, owned by you, edit freely):
   ```bash
   npx remotion-bits fetch bit-fade-in --json
   npx remotion-bits add animated-text   # once you know the path
   ```

The runtime import works for the **components** category below. The other categories (`bit-*`) are reference scenes you copy in to learn from.

---

## Components (runtime importable)

| Bit | Use it for | Key props |
|---|---|---|
| `AnimatedText` | Headlines, kinetic typography. Splits into characters/words/lines and animates each. | `transition.split` (`'character' \| 'word' \| 'line'`), `splitStagger`, `opacity`, `translateY`, `duration` |
| `TypeWriter` | Closing taglines, terminal-feel text. | `text` (string or array), `typeSpeed`, `deleteSpeed`, `pauseAfterType`, `errorRate` |
| `AnimatedCounter` | Stat reveals — "38 nodes," "4-hour reporting window," "2.5M records." | `transition.values: [from, to]`, `transition.duration`, `prefix`, `postfix`, `toFixed` |
| `MatrixRain` | "Data flying out" / cyber threat aesthetic. Use as background under hero text. | `fontSize`, `color`, `speed`, `density`, `streamLength`, `charset` |
| `GradientTransition` | Smooth gradient backgrounds (linear / radial / conic), interpolated in Oklch. | `from`, `to`, `type`, `duration` |
| `StaggeredMotion` | Apply staggered enter/exit animations to a list of children. | `transition.staggerDelay`, transform/visual props |
| `ScrollingColumns` | Multi-column infinite image scroll (panning 3D feel). | `columns`, `speed`, `direction` |
| `Particles` + `Spawner` + `Behavior` | Sparkles, snow, fountains, fireflies. Composable particle system. | `Spawner: rate, max`; `Behavior: type` (`gravity`, `drag`, `wiggle`, `scale`) |
| `Scene3D` + `Step` + `Element3D` | impress.js-style 3D scene with camera that moves between steps. Carousels, cube nav, terminal stacks. | `steps`, `Step.position`, `Step.rotation`, `Element3D.transform` |
| `CodeBlock` | Syntax-highlighted code with line-by-line reveal / focus / highlight. | `language`, `code`, `revealStrategy`, `focusedLines` |

## Utilities

| Bit | Use |
|---|---|
| `interpolate` | Drop-in for Remotion's `interpolate` with easing + non-monotonic ranges |
| `motion` | Build keyframes, easings, transform/style strings |
| `color` | Perceptually uniform color interpolation (Oklch via culori) |
| `gradient` | Parse + interpolate CSS gradients (Granim.js math) |
| `transform3d` | Chainable 3D transform API with quaternion interpolation |
| `geometry` | `Rect` class with viewport units (vh/vw/vmin/vmax) |
| `random` | Seeded random floats / ints / array picks |
| `particles-utilities` | Particle behaviors (gravity, drag, wiggle, scale) as standalone fns |

## Hooks

| Hook | Use |
|---|---|
| `use-viewport-rect` | Get current composition's viewport rect with responsive sub-areas |
| `step-context` (`useScene3D`, `useCamera`, `useActiveStep`, `useStepResponsive`) | Read Scene3D timing inside nested children |

## Example bits (copy-into-source via CLI)

These aren't importable — they're reference compositions you `npx remotion-bits add` to learn from.

### Text
- `bit-fade-in` — simple fade-in
- `bit-char-by-char` — character-by-character typing reveal
- `bit-word-by-word` — staggered word reveal
- `bit-blur-slide-word` — fade + unblur + slide-up per word
- `bit-glitch-cycle` — cycling text with glitch transitions
- `bit-glitch-in` — glitches into existence
- `bit-slide-from-left` — slides in from left with fade
- `bit-staggered-fade-in` — sequential element fade-in
- `basic-typewriter` — typing animation with cursor
- `multitext-typewriter` — types multiple sentences in sequence
- `variable-speed-typewriter` — variable speed + error simulation
- `cli-simulation` — full command-line interface mockup

### Counters
- `bit-basic-counter` — interpolate between values
- `bit-counter-confetti` — counter to 1000 with confetti burst

### Code
- `bit-basic-code-block` — syntax highlight with line reveal
- `bit-typing-code-block` — code typed in live

### Gradients
- `bit-conic-gradient` — rotating conic
- `bit-linear-gradient` — linear transition
- `bit-radial-gradient` — radial transition

### Particles
- `bit-fireflies` — wandering glow particles
- `bit-particles-fountain` — bursting fountain
- `bit-particles-grid` — particles snap to grid
- `bit-particles-snow` — falling snow
- `bit-matrix-rain` — Matrix-style rain

### 3D
- `bit-3d-basic` — impress.js-style camera transitions between steps
- `bit-3d-elements` — arbitrary elements in 3D space
- `bit-carousel-3d` — rotating card carousel
- `bit-scene-3d-cube-nav` — navigate cube faces
- `bit-cursor-flyover` — camera flies over screenshot, cursor highlights
- `bit-flying-through-words` — words spawn and fly past camera
- `bit-ken-burns` — slow camera over images (Ken Burns)
- `bit-3d-step-timing-context` — useMotionTiming demo
- `bit-terminal-3d` — multiple terminal windows in 3D
- `bit-transform3d-showcase` — chainable Transform3D demo

### Layout
- `bit-card-stack` — card stack spreads in 3D
- `bit-easings-visualizer` — sliding squares for each easing
- `bit-fracture-reassemble` — grid shatters + reassembles
- `bit-grid-stagger` — grid staggering from center
- `bit-list-reveal` — list scaling into place
- `bit-mosaic-reframe` — grid → feature mosaic → diagonal
- `bit-scrolling-columns` — 4 columns scrolling at different speeds

### Showcase
- `bit-remotion-bits-promo` — promotional showcase

---

## Picking bits for this project — what we already use

| Scene | Bit used | Why |
|---|---|---|
| `HookScene` | `MatrixRain` (background), `AnimatedText` (title) | Literalize "data leaving the perimeter"; kinetic title for the three-problems beat |
| `SolutionScene` | `Particles` + `Spawner` + `Behavior` (wiggle + drag) | Subtle ambient sparkle around the logo reveal |
| `VennScene` | `AnimatedText` (title) | Word-staggered "Three things have to be true at once." |
| `WorkflowScene` | `AnimatedText` (title), `AnimatedCounter` (the "38" in "38 nodes") | Title kinetic; counter punches up the breadth claim |
| `OutroScene` | `TypeWriter` (tagline) | Deliberate, considered closing line |

## Bits to consider for V2

- `Scene3D` with `bit-cursor-flyover` pattern — fly the camera over actual app screenshots (Canvas, Sidebar, Service Dashboard) with a cursor highlighting features. Replaces the abstract WorkflowScene with real product footage.
- `CodeBlock` — show the workflow as code (`Trigger → Document → PII Filter → LLM`) in a terminal-style block, then the GUI version. Demonstrates "this is what you'd write by hand vs. what we made into a drag-drop."
- `bit-counter-confetti` — for a "10,000 audit events captured" beat in a customer-success cut.
- `GradientTransition` — replace the radial backgrounds with smoother gradient transitions between scenes.

## Updating this catalog

When `remotion-bits` releases new bits:

```bash
cd compliance-flow/remotion
npm update remotion-bits
node -e "console.log(JSON.stringify(require('remotion-bits/registry.json').items.map(i => i.name), null, 2))" > /tmp/new-bits.txt
# Diff against this file's component table to spot additions
```

Or run the official MCP if you want it queryable:

```json
// add to ~/.claude.json or your MCP config
{
  "mcpServers": {
    "remotion-bits": {
      "command": "npx",
      "args": ["-y", "remotion-bits", "mcp"]
    }
  }
}
```
