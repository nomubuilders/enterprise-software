# PitchVideo · Script v2

> Single source of truth for the next rebuild of the Compliance Flow pitch video. Edit this file before changing scene code; all motion implementations should derive from the beats here.

| | |
|---|---|
| Version | v2 (post-degradation, contrast-driven) |
| Length | 56 seconds |
| Frames | 1680 @ 30fps |
| Resolution | 1920×1080 |
| Audio | None for v2 (text + motion only). VO captions equivalent to on-screen text. |
| Audience | Generalist tech founder / CTO at a mid-size company in a regulated-adjacent industry |
| Composition ID | `PitchVideo` |

## Visual style (recap)

- Light theme: Off-White `#FEFCFD` bg · Ink `#1A1614` text · Brand Purple `#4004DA` and Brand Orange `#FF6C1D` accents · Teal `#0891B2` for tertiary (replaces cyan)
- Headings: Barlow 700, body: Work Sans
- Shadows over glows
- Sequential reveal preferred over simultaneous

## Bits used

| Bit | Where |
|---|---|
| `TypeWriter` | Scenes 1, 3, 7, 8 |
| `bit-grid-stagger` (or `StaggeredMotion` runtime) | Scenes 2, 5, 6, 7 |
| `bit-flying-through-words` | Scene 4 |
| `bit-card-stack` / `ScrollingColumns` | Scene 7 |
| `AnimatedCounter` | Scene 6 |
| Existing custom: `BrandWordmark`, `WorkflowNode`, `AnimatedEdge`, `ArticleStack` | Scenes 2, 5, 6, 7, 8 |

---

## Scene 1 · The Question · `QuestionScene`

**Frames:** 0–180 (6s)
**Background:** Off-white radial · `bg → bgEdge`
**Mood:** Calm setup, building curiosity

**Layout:** Four rows on the LEFT THIRD of the canvas. Each row = `[logo SVG]  [provider name typed via TypeWriter]`. Logos sit ~80px square, names in 64pt Barlow alongside.

**On-screen sequential reveal:**

| Frame range | Logo asset | Name (typed via `TypeWriter`) |
|---|---|---|
| 6–24   | `openailogo.svg`         | ChatGPT. |
| 24–42  | `anthropiclogo.svg`      | Claude.  |
| 42–60  | `geminilogo.svg`         | Gemini.  |
| 60–78  | `Microsoft_Symbol_0.svg` | Copilot. |

Each logo fades in 4 frames before its name starts typing · so the logo is "waiting" while the name appears letter-by-letter beside it.

[All four logo+name pairs hold from frame 78 onward.]

**Question types in centered (`TypeWriter`), frames 90–130:**
> What do they have in common?

The question is large (64pt Barlow), centered horizontally, vertically positioned in the right two-thirds of the canvas (so it sits to the right of the four-pair list).

**Hold on full frame:** 130–180 (the silence before the answer)

**Color treatment:** Provider names in **brand purple**. Question in ink.

---

## Scene 2 · The Answer · `AnswerScene`

**Frames:** 180–360 (6s)
**Background:** Off-white, slight darken to set up chaos
**Mood:** Reveal punch + evidence dump

**Pacing rule:** Strictly sequential. Text comes in → graphics come in → both hold → graphics dissolve → next text types in. No layered overlap of competing focal points. The viewer always knows where to look.

**Beat-by-beat:**

| Frames | What's on screen | What happens |
|---|---|---|
| 180–195 | (Scene 1 dissolves) | Provider list and question dissolve out |
| 195–230 | Big answer typing in | `TypeWriter`: **You don't control any of them.** |
| 230–260 | Answer holds, articles flash in | `bit-grid-stagger` for 13 article cards · fast (<1.5s total) |
| 260–300 | Answer + articles both visible | Hold full evidence dump |
| 300–320 | Articles dissolve out | Cards fade to 0% over 20 frames; answer fades with them |
| 320–340 | Empty stage | Brief breath |
| 340–360 | Verdict types in (centered) | `TypeWriter`: **Banned.   Nerfed.   Repriced.** with subtitle *Without notice.* |

**Colors:** "You don't control any of them." in **ink**. "Banned. Nerfed. Repriced." in **brand orange**. Subtitle in muted ink.
---

## Scene 3 · The Pivot · `PivotScene`

**Frames:** 360–510 (5s)
**Background:** Pure off-white. No texture. Maximum restraint.
**Mood:** Calm beat. The pause IS the point.

**Centered, fades in slowly, frames 370–400:**
> There's another way.

**Below, types in (`TypeWriter`) frames 410–470:**
> Especially if you work in an industry that needs AI · and needs to keep control of it.

**Hold:** 470–510

**Colors:** Headline in ink. Subtitle in muted ink. No accent colors · this scene is the breath.

---

## Scene 4 · The Audience · `AudienceScene`

**Frames:** 510–660 (5s)
**Background:** Off-white with very subtle perspective grid (3D feel)
**Mood:** Naming the audience

**Industry names fly through the camera (`bit-flying-through-words`):**
- Healthcare
- Finance
- Government
- Insurance
- Legal
- Education

(List stays close to evidence in the article stack. Defense and Pharma omitted.)

Words spawn near camera, fly past in brand purple, ~6 frames apart. Total reveal: frames 520–620.

**Final text holds, frames 620–660:**
> *Industries that can't put their data in someone else's cloud.*

**Colors:** Industries in **brand purple**, deep 3D. Holding text in ink.

---

## Scene 5 · The Brand Intro · `BrandIntroScene`

**Frames:** 660–810 (5s)
**Background:** Off-white with soft brand-purple wash
**Mood:** Brand presence + product summary

**`BrandWordmark` springs in centered, frames 660–700.**

**Three feature pillars stagger in below (`bit-grid-stagger`), frames 710–760:**
> Local LLM.    Node-based.    Built-in compliance.

**Tagline below, frames 770–800:**
> *We make data speak · without it ever leaving your hardware.*

**Colors:** Wordmark with orange "Flow." Pillars in ink. Tagline in muted ink.

---

## Scene 6 · The Contrast · `ContrastScene`

**Frames:** 810–1170 (12s)
**Background:** Off-white, vertical divider line down center
**Mood:** Direct comparison. The visual centerpiece.

**Headers grid-stagger in, frames 810–840:**

| **Cloud AI** *(left, gray)* | **ComplianceFlow** *(right, brand purple)* |

**Then 6 rows reveal sequentially (`bit-grid-stagger`, ~52 frames each):**

| Frame range | Cloud AI (left) | ComplianceFlow (right) |
|---|---|---|
| 840–892   | Locked into one model | Pick any open model |
| 892–944   | Your data leaves the box | Stays on your hardware |
| 944–996   | $2,400/mo and climbing *(`AnimatedCounter` 0→2400, suffix "/mo")* | $0/mo after hardware *(`AnimatedCounter` stays 0)* |
| 996–1048  | Model can be nerfed overnight | You own the version forever |
| 1048–1100 | No audit trail | Every step is evidence |
| 1100–1150 | Black-box decisions | Built-in explainability |

**Hold final state:** 1150–1170

(Row 1 is the new opener. "Locked into one model" sets up everything that follows: pricing volatility, nerfs, audit gaps, and lack of explainability all flow from not choosing the model.)

**Bit detail:**
- Left column appears 8 frames before right column on each row · the *delay* is what makes the comparison emotional
- Left column items in **muted ink** (`#4D4D4D`)
- Right column items in **brand purple** for value, **brand orange** for the "$0/mo" punchline
- Counter on row 2 ramps over ~40 frames

### Visual hierarchy: right column dominates by the end

Across the duration of the scene, the **right column physically grows larger than the left** to convey ComplianceFlow's relative value. This is the central visual argument · we don't just describe value, we *show it dominating the frame*.

Mechanic:
- Both columns start at equal size (1.0x scale)
- After all 5 rows have revealed, frames 1110–1170: right column scales up to ~1.35x while left column scales down to ~0.85x
- The vertical divider shifts left as the right side claims canvas space
- Right column gets a subtle brand-purple drop shadow that intensifies during the scale-up
- Left column items lose color saturation slightly, going further into gray-out territory

The viewer reads this as: "Compliance Flow is in the position to dictate terms."

### Embedded cost graph · row 2 special treatment

Row 2 (the cost row) is not just a counter pair. It contains a small embedded line graph showing both cost trajectories side-by-side over 12 months:

- A small chart, ~600px wide, ~180px tall, sits inside row 2 spanning both columns
- **Two lines:** orange (cloud, climbing exponentially) and purple (local, flat at $0)
- **Two labels/tags** floating at line endpoints: `$2,400/mo` (orange, top-right) and `$0/mo` (purple, bottom-right)
- As the line climbs, the **graph viewport zooms slightly** (1.0x → 1.08x scale on the chart container) emphasizing the dramatic ascent
- The `AnimatedCounter` values in the row text update in sync with the line endpoints

This row carries the entire cost-scene message in a compressed form.
---

## Scene 7 · The Workflow · `WorkflowScene` (refactored)

**Frames:** 1170–1530 (12s)
**Background:** Off-white with subtle grid texture
**Mood:** Show how it actually works, anchored by a real-world question

**User question types in centered (`TypeWriter`), frames 1170–1230:**
> How do we audit our patient records for HIPAA compliance?

**Hold question:** 1230–1260 (the beat that primes purpose)

### Mouse-cursor drag-and-drop interaction

**The whole node assembly is animated as if a real user is dragging nodes from a sidebar palette onto the canvas.** A fake cursor moves across the screen, picks up each node, drops it in place, then drags edges between them. This makes the demo feel like the actual product.

**Layout during this scene:**
- Left edge: a thin sidebar palette showing node icons (~120px wide). Stays in place throughout.
- Center: the canvas where dragged nodes land.
- A custom mouse-cursor SVG (white arrow with brand-orange outline + soft drop shadow) is animated via interpolated position.

**Cursor choreography per node:**

For each node in the assembly sequence:
1. Cursor moves to the sidebar palette (frames N to N+8)
2. Cursor "presses down" · small scale pulse on cursor + node icon (frames N+8 to N+10)
3. Cursor drags node from sidebar to canvas position (frames N+10 to N+22) · the node is attached to the cursor with a slight trailing offset
4. Cursor "releases" · node snaps to grid position with a small bounce (frame N+22)
5. Cursor moves to next node-source position

After all nodes are placed:
6. Cursor draws each edge by clicking on a source node's output handle, dragging to the target node's input handle (frames 1380–1410, ~6 frames per edge)

### Camera focus / zoom behavior

While the cursor drops each node, the canvas viewport **zooms in** on that node so the action is large and clear. Once the node is placed, viewport **zooms back out** slightly to make room for the next.

After all nodes and edges are in place, the camera **zooms all the way out** to show the full chain in one wide shot, frames 1410–1430.

Then the **result card** flies in over the chain (zoomed-out), frames 1430–1490.

Implementation: a single `transform: scale() translate()` on the canvas container, interpolated based on the active node. Easier than `Scene3D` for this case since we only need 2D zoom-pan, not 3D.

**Node sequence (each ~22 frames including cursor travel + drag + drop):**

| Frame | Node | Cursor action |
|---|---|---|
| 1260–1282 | **Trigger** · Manual / patient_records.csv | Drag from sidebar to leftmost canvas position |
| 1282–1304 | **Database** · source connects | Drag from sidebar |
| 1304–1326 | **PHI Classification** · flags health data | Drag from sidebar |
| 1326–1348 | **PII Filter** · redacts names + IDs | Drag from sidebar |
| 1348–1370 | **Local LLM (Llama 3.2)** · analyzes | Drag from sidebar |
| 1370–1392 | **Audit Trail** · logs every step | Drag from sidebar |
| 1392–1414 | **Output: Compliance Report** | Drag from sidebar |

**Edges drawn (cursor click-drag):** frames 1410–1430

**Camera zooms out for full-chain shot:** frames 1430–1450

**Final result card grid-staggers in (`bit-grid-stagger`):** frames 1450–1500
> ✓ 2,847 records reviewed
> ✓ All PHI redacted
> ✓ Audit trail: 12 evidence points
> ✓ HIPAA: **PASS**

**Hold:** 1500–1530

**Colors:** Question in ink. Cursor in white with orange outline + soft shadow. Nodes in their accent colors (orange/teal/purple). Edges in brand purple. Result checkmarks in green-ink contrast (`#0F8F45`). HIPAA: PASS in brand orange.
---

## Scene 8 · The Outro · `OutroScene`

**Frames:** 1530–1710 (6s, extended from 5s to fit the longer tagline)
**Background:** Pure off-white
**Mood:** Considered close

**`BrandWordmark` (no tagline beneath the symbol this time), frames 1530–1570.**

**`TypeWriter` below, frames 1580–1670 (~90 frames at typeSpeed 2 for 45 chars):**
> Build AI workflows that work without internet.

**Smaller URL line, typed (`TypeWriter`), frames 1675–1710:**
> nomu.com/compliance-flow

**Colors:** Wordmark with brand orange "Flow". Tagline in brand orange. URL in muted ink.

**Why this tagline:** Testable claim. Anyone can verify by unplugging. ChatGPT, Claude, Copilot all fail without internet. ComplianceFlow does not. Forces the differentiation that "Run AI on your terms" left abstract, and that "Build AI workflows on your own machine" left ambiguous (someone could mistakenly think Claude Code qualifies).

---

# Asset checklist

- [x] `nomu-logo-word.png` · in `public/`
- [x] `nomu-logo.png` · in `public/`
- [x] `nomu-symbol.png` · in `public/`
- [x] `articles/article-6.png` through `article-18.png` · 13 files in `public/articles/`
- [ ] **NEW:** Result card mock for Scene 7 · 4 checkmark items, can be CSS, no asset needed
- [ ] **NEW:** Optional industry-name pre-render or font-size tuning for `flying-through-words` (decide during implementation)

---

# Implementation map (post-script-approval)

When we rebuild, this is what changes:

| Action | File |
|---|---|
| **NEW** | `src/scenes/QuestionScene.tsx` (S1) |
| **NEW** | `src/scenes/AnswerScene.tsx` (S2) |
| **NEW** | `src/scenes/PivotScene.tsx` (S3) |
| **NEW** | `src/scenes/AudienceScene.tsx` (S4) |
| **REFACTOR** | `src/scenes/SolutionScene.tsx` → `BrandIntroScene` (S5) · add three pillars |
| **NEW** | `src/scenes/ContrastScene.tsx` (S6) |
| **REFACTOR** | `src/scenes/WorkflowScene.tsx` (S7) · start with question, sequential node assembly, result card |
| **REFACTOR** | `src/scenes/OutroScene.tsx` (S8) · add URL line |
| **DROP** | `src/scenes/HookScene.tsx` (replaced by Question + Answer) |
| **DROP** | `src/scenes/CostScene.tsx` (folded into Contrast row 2) |
| **DROP** | `src/scenes/VennScene.tsx` (replaced by Contrast) |
| **UPDATE** | `src/theme.ts` · new `sceneTimings`, `TOTAL_FRAMES = 1710` |
| **UPDATE** | `src/PitchVideo.tsx` · new sequence wiring |
| **KEEP** | `src/components/{BrandWordmark, WorkflowNode, AnimatedEdge, ArticleStack}.tsx` |

---

# Decisions locked

All five creative calls confirmed. The script is the spec.

1. **Workflow demo question:** *"How do we audit our patient records for HIPAA compliance?"* Healthcare. Confirmed.
2. **Industries list (Scene 4):** Healthcare, Finance, Government, Insurance, Legal, Education. Defense and Pharma dropped to stay close to article evidence.
3. **Contrast rows (Scene 6):** 6 rows. Row 1 is the new opener: *"Locked into one model" / "Pick any open model"*.
4. **Cost scene:** Folded into Contrast row 2 (counter pair plus embedded chart with growing line and zoom). No standalone scene.
5. **Tagline:** *"Build AI workflows that work without internet."* The whole pitch compresses to a falsifiable claim.

---

# Sign-off

When this script is approved, the next change to this file should be `## Changelog` entries documenting any post-implementation deviations from the script. Code follows the script, not the other way around.

---

## Changelog

- **Scene 6 Part 1 rebuilt as @remotion/three direction "Two Boxes, One Room".** 5 contrast rows (cost row stays in CostChart, not duplicated as text). Title morph + Cloud/Local typed headers replaced by a 3D-scene-native title beat ("Let's compare." via Drei `<Text>`) plus the two stylized objects acting as the headers themselves. Circle wipe replaced by an LED ring radial expansion that fills the frame and hands off to CostChart at frame 578.
- **Scene 6 Part 1 rewritten as "The Leash" (Phase 2/4 redesign).** The two abstract cubes (CloudObject + LocalObject) read as decorative sculptures, not metaphors. Replaced with: a tethered cloud orb on the left (held by a cable disappearing offscreen above the frame, with per-row cable yanks, particle siphon up the cable on "your data leaves the box," orb dim + shrink on "model can be nerfed overnight," cable opacity-fog on "no audit trail," orb crossfade-to-fog on "black-box decisions"); and a sovereign purple monolith on the right (with version plate `v3.2.1` etched on the front face, audit-tick column on "every step is evidence," internal grid lines on "built-in explainability"). Hand-off at frame 390: cable color flips brand-orange and curve straightens into a single rising diagonal that seeds CostChart's first segment. Part 1 compressed 578f / 19.27s → 390f / 13.0s. Master pitch shifts: ContrastSceneV2 998→810, Workflow.from 1928→1740, Outro.from 2288→2100, PITCH_V2_TOTAL_FRAMES 2468→2280, master Contrast→Workflow FadeThroughBg 1916-1940→1728-1752. Total master duration 82.27s → 76.0s. Cloud-side fill light shifted from brand teal `#0891B2` to gray-teal `#3a5560` for "fluorescent server-room" tone (keeps brand teal as tertiary out of the contrast punchline). RowOverlay (2D HTML cards) survives unchanged in content; row clock retimed to new TL.rowStart array. CostChart hand-off framing intentionally intimate / single-account · the team-of-10 multiply remains a future CostChart redesign.
