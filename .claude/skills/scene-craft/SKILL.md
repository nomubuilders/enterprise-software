---
name: scene-craft
description: Four-phase workflow for shipping Apple-tier video scenes in Remotion. Brainstorm > Map > Resource > Build. Use whenever starting a new scene, transition, animation, or major visual effect that must be production-ready without further editing. Enforces "no safe ideas," bans flat-2D-as-3D, and forbids writing code until phases 1-3 are complete.
metadata:
  tags: video, remotion, scene, workflow, brainstorming, apple-tier, three.js, sfx, voiceover, elevenlabs
---

# Scene-Craft

Four-phase workflow for video scene work that must ship without further editing. Designed for the Compliance Flow pitch video and any other Remotion-based deliverable held to keynote-tier production quality.

## When to use

Invoke at the start of any of:

- A new Remotion scene (composition, sub-composition, or major refactor of an existing scene)
- A new scene-to-scene transition
- A new visual effect or animation that anchors a moment in the video
- Any creative direction conversation about how a scene should look or play out
- Any time the user says "build a scene," "make a transition," "add an animation," "redo this scene," or rejects existing work as not good enough

Do NOT invoke for:

- Pure bug fixes in existing scenes (no creative direction at stake)
- Renames, refactors, or restructuring code without changing visuals
- Render-time / performance tuning

## Hard rules

These apply at every phase. Violating any of them resets you to phase 1.

1. **No safe ideas.** If an idea sounds reasonable to most product teams, it is too safe. Lead with the boldest direction. If you are convincing yourself a direction is "bold enough," it is not.
2. **Apple-tier bar.** Output must be shippable as a Steve-Jobs-keynote lead visual without further editing. If not, redo. The test: would this run as the lead visual at a $10M product launch? If no, do not propose it.
3. **Real 3D, not flat-2D-as-3D.** When the work calls for depth, use `@remotion/three` with React Three Fiber. CSS `perspective` plus `rotateY` on flat HTML is forbidden when the brief is "3D."
4. **No overlapping text or competing focal points.** Sequential reveals only. The viewer always knows where to look.
5. **No defaults that "work" but feel generic.** Every motion choice, color choice, and timing choice must be justifiable in one sentence.
6. **No code until phases 1-3 are complete.** Do not jump to implementation. Do not "sketch some code while we brainstorm." That is a violation.

## The four phases

Each phase has explicit inputs, work, and outputs. Move forward only when the output is locked.

### Phase 1: Brainstorm

**Tool:** the `brainstorming` skill (Skill tool).

**Work:**

1. Invoke the `brainstorming` skill via the Skill tool.
2. Engage its question-by-question process. Ask the FEELING question first: "What should the viewer feel the moment this scene ends?" The feeling decides every metaphor downstream. Never start with "what should it look like."
3. Propose 2 or 3 directions that are bold by construction. If the boldest direction would be approved by a generic product team, throw it out and dig harder. A useful gut check: would this direction cause an executive to lean forward in their seat?
4. Get explicit user approval on one named direction before moving to Phase 2. Do not proceed on implicit approval.

**Output:** one named creative direction with (a) a clear emotional target, (b) a dominant metaphor, and (c) a tonal axis (gravitas, drama, wonder, defiance, etc.).

### Phase 2: Map

**Tool:** the `remotion-best-practices` skill plus deep reading of relevant rule files.

**Work:**

1. Invoke `remotion-best-practices`. Read all rule files relevant to the chosen direction. At minimum:
   - `rules/animations.md`. For any motion.
   - `rules/timing.md`. For pacing math and easings.
   - `rules/3d.md`. Mandatory when real 3D is involved.
   - `rules/sfx.md`. For any per-beat sound design.
   - `rules/voiceover.md`. Mandatory when narration is involved (uses ElevenLabs TTS plus dynamic composition duration via `calculateMetadata`).
   - `rules/transitions.md`. For scene-to-scene cuts.
   - `rules/sequencing.md`. For layered timing.
   - `rules/text-animations.md`. For any typography reveal.
2. Write the spec in detail. Vague gestures are forbidden.

**Spec must include:**

1. **Frame budget.** Total frames, fps, per-beat allocation. Numbers, not "around X."
2. **Beat list.** Every named moment with frame range, what is on screen, and why it lands emotionally.
3. **Per-element motion math.** Interpolated values, easings (`Easing.bezier(...)` only, no springs), transform compositions, normalized 0..1 progresses per beat.
4. **Audio cues (sfx).** Which sfx fires on which frame and what mood it sets. Discovery is via the **soundcn MCP** (`mcp__soundcn__soundcn_search_sounds`, `mcp__soundcn__soundcn_preview_sound`) over the 813-sound CC0 library. Cite each chosen sound by its registry name (e.g. `bong-001`, `whoosh-001`) and confirm it was previewed, not guessed. Remotion-hosted built-ins via `https://remotion.media/<name>.wav` are still available for fallback.
5. **Narration (voiceover) if applicable.** Per-scene script text, the chosen ElevenLabs voice id with the voice's name and tonal axis ("George `JBFqnCBsd6RMkjVDRZzb` deep UK male, gravitas"), the model id (`eleven_v3` for expressive or `eleven_multilingual_v2` for fast/cheap), and the target spoken duration per line. Voice discovery and audition is via the **elevenlabs MCP**. Sample 2-3 voices on a representative line before locking. Cite the voice id and confirm it was auditioned, not picked from name alone. The composition uses `calculateMetadata` to size itself to the generated audio durations (see `rules/voiceover.md`).
6. **3D scene graph if applicable.** Meshes, materials, lights, camera, frame-driven animation paths. Drei components if any.
7. **Failure modes.** What could go wrong at render time, what to verify mid-build.

**Output:** the spec as a written document, presented to the user for explicit approval before Phase 3. Locked specs do not change without an explicit user-approved revision.

### Phase 3: Resource

**Tool:** read-only reconnaissance.

**Work:** find what already exists before writing anything new. Search in this order:

1. **`remotion-bits` MCP** is the primary discovery tool for animation primitives. Two-step: call `mcp__remotion-bits__find_remotion_bits` with a query or tags to scan the published catalog (lightweight summaries with id, exportName, dimensions, components, registry deps), then `mcp__remotion-bits__fetch_remotion_bit` on the top one or two matches to retrieve full source code. Adapt examples before composing from raw Remotion primitives. Local fallback if the MCP is offline: `node_modules/remotion-bits/dist/components/` (catalog includes `AnimatedCounter`, `AnimatedText`, `CodeBlock`, `GradientTransition`, `MatrixRain`, `ParticleSystem`, `Scene3D`, `ScrollingImages`, `StaggeredMotion`, `TypeWriter`).
2. **`@remotion/three`** + `@react-three/fiber` + Drei for 3D scene work. Confirm install via `package.json`. Check `node_modules/@remotion/three/dist/index.d.ts` for the `<ThreeCanvas>` API.
3. **soundcn MCP** for sfx discovery and preview. Use `mcp__soundcn__soundcn_list_categories` for the navigable index (96 categories, 813 sounds), `mcp__soundcn__soundcn_search_sounds` to find by intent ("button click", "success fanfare", "swoosh") with optional `category` and `max_duration_sec` filters, `mcp__soundcn__soundcn_get_sound_info` for full metadata plus install command, and `mcp__soundcn__soundcn_preview_sound` to actually hear the candidate through system audio before locking it into the spec. Remotion-hosted built-ins still available via `https://remotion.media/<name>.wav`: whoosh, whip, page-turn, switch, mouse-click, shutter-modern, shutter-old, ding, vine-boom, windows-xp-error.
4. **elevenlabs MCP** for narration voice selection and voiceover generation. Use it to browse the voice library, audition 2-3 voices on a representative line from the script, and produce final per-scene MP3s into `public/voiceover/<comp>/<scene-id>.mp3`. Free pre-made voices (work without paid plan): George `JBFqnCBsd6RMkjVDRZzb` (deep UK male), Rachel `21m00Tcm4TlvDq8ikWAM` (calm US female), Adam `pNInz6obpgDQGcFmaJgB` (deep US male narrator), plus Antoni, Bella, Domi, Josh, Sam. Library voices require a paid plan. Models: `eleven_v3` for max expressiveness, `eleven_multilingual_v2` for cheaper/faster bulk. The composition uses `calculateMetadata` to size to the generated audio (`rules/voiceover.md`). Confirm the voice was auditioned, not chosen from name alone.
5. **Existing project components** in `src/components/` (in this repo: `BrandWordmark`, `WorkflowNode`, `AnimatedEdge`, `ArticleStack`).
6. **Unread skill rule files** that touch the chosen direction. Read them now.

**Output:** a resource map. For every beat from Phase 2, mark either (a) which existing component handles it OR (b) "build new" with a one-line rationale. No beat may be left unresolved.

### Phase 4: Build

Now and only now, write code.

**Constraints:**

- Drive every animation by `useCurrentFrame()`. Use `Easing.bezier(...)` for cinematic motion. Springs only on explicit user request.
- Express timing in seconds and multiply by `fps` from `useVideoConfig()`. Never hardcode raw frame numbers (e.g., `0.5 * fps`, not `15`).
- Each beat gets one normalized 0..1 progress. Multiple visual properties derive from that single progress. Do not interpolate the same beat in three places.
- CSS transitions FORBIDDEN. Tailwind animation utility classes FORBIDDEN. Both will silently break frame-by-frame rendering.
- For 3D, animate via `useCurrentFrame()`. Never via `useFrame()` from `@react-three/fiber`. Wrap content in `<ThreeCanvas width={width} height={height}>` and include lighting.
- Verify against the Phase 2 map after every milestone. If the result drifts from the spec, stop and reconcile.
- Render still frames at the end of each beat to catch composition issues early: `npx remotion still <id> --frame=<N> --scale=0.25`.
- Run `tsc --noEmit` before declaring done. Pre-existing errors in other files are acceptable; new errors are not.

**Output:** the working scene plus a one-line note in `SCRIPT.md` documenting any deviation from the original script. Deviations require user awareness.

## Anti-patterns

- **"Let me just sketch some code first."** Forbidden. Phases 1-3 first.
- **"This direction is bold enough."** If you have to convince yourself, it is not.
- **"CSS rotateY is essentially 3D."** No. Real 3D uses `@remotion/three`.
- **"We can fix the timing in post."** There is no post. Ship-ready means ship-ready.
- **"The user will tell me what they want as we go."** No. Get the brief in Phase 1, lock the spec in Phase 2.
- **"This row already has cards, I'll just add rotateY."** No. If the brief calls for depth, the spec uses Three.js.
- **"Let me re-use the existing component to save time."** Re-use only if the existing component matches the spec. Otherwise it is a hidden compromise.

## Workflow output checklist

Before declaring a scene done:

- [ ] All Phase 2 beats present at the specified frame ranges
- [ ] No overlapping text at any frame in the scene
- [ ] No CSS transitions, no springs (unless explicit), no Tailwind animation classes
- [ ] sfx cues fire on the planned frames
- [ ] If voiceover is in scope: per-scene MP3s exist in `public/voiceover/`, `calculateMetadata` reflects the audio durations, and beat pacing aligns with spoken delivery
- [ ] `tsc --noEmit` clean for the scene's files (pre-existing errors elsewhere acceptable)
- [ ] Still-frame render at 0.25 scale matches the map for at least 3 representative frames
- [ ] Total duration matches the budget set in Phase 2 (within 5% tolerance)
- [ ] User reviewed the result and confirmed "ship-ready"

## Phase transitions and re-entry

If Phase 4 reveals a problem the spec did not anticipate:

1. Stop coding immediately.
2. Return to Phase 2 to revise the spec.
3. Re-run Phase 3 if the revision changes which resources are needed.
4. Resume Phase 4.

If the user rejects the result mid-build with "this is not good enough," return to Phase 1. Do not patch a flawed direction.

## Why this exists

Without this workflow, Claude defaults to "safe ideas executed quickly." That produces flat work that requires multiple rebuild cycles. Front-loading the brainstorm and the spec prevents the flat output. The hard rules exist because every one of them has been violated in past sessions and produced rejected work.
