import { Composition } from 'remotion'
import { PitchVideo, pitchVideoSchema, pitchVideoDefaults } from './PitchVideo'
import { PitchVideoV2, PITCH_V2_TOTAL_FRAMES } from './PitchVideoV2'
import { ContrastSceneV2 } from './scenes/ContrastSceneV2'
import { CostChart } from './scenes/CostChart'
import { HookScene, hookSceneSchema, hookSceneDefaults } from './scenes/HookScene'
import { AnswerScene } from './scenes/AnswerScene'
import { PivotScene, pivotSceneDefaults } from './scenes/PivotScene'
import { QuestionScene, questionSceneDefaults } from './scenes/QuestionScene'
import { AudienceScene, audienceSceneDefaults } from './scenes/AudienceScene'
import { BrandIntroScene, brandIntroSceneDefaults } from './scenes/BrandIntroScene'
import { OutroSceneV2, outroSceneV2Defaults } from './scenes/OutroSceneV2'
import { WorkflowSceneV2, workflowSceneV2Defaults } from './scenes/WorkflowSceneV2'
import { theme, TOTAL_FRAMES, sceneTimings } from './theme'

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="PitchVideo"
        component={PitchVideo}
        durationInFrames={TOTAL_FRAMES}
        fps={theme.scene.fps}
        width={theme.scene.width}
        height={theme.scene.height}
        schema={pitchVideoSchema}
        defaultProps={pitchVideoDefaults}
      />

      {/* PitchVideoV2 · the full 8-scene v2 cut per SCRIPT.md.
          QuestionScene · AnswerScene · PivotScene · AudienceScene ·
          BrandIntroScene · ContrastSceneV2 · WorkflowSceneV2 · OutroSceneV2.
          Total: 2348 frames at 30fps = 78.3 seconds. */}
      <Composition
        id="PitchVideoV2"
        component={PitchVideoV2}
        durationInFrames={PITCH_V2_TOTAL_FRAMES}
        fps={theme.scene.fps}
        width={theme.scene.width}
        height={theme.scene.height}
      />

      <Composition
        id="HookScene"
        component={HookScene}
        durationInFrames={sceneTimings.hook.durationInFrames}
        fps={theme.scene.fps}
        width={theme.scene.width}
        height={theme.scene.height}
        schema={hookSceneSchema}
        defaultProps={hookSceneDefaults}
      />

      {/* Standalone preview · ContrastScene · 27.0s
          390 frames @remotion/three "The Leash" 3D stage (orb tethered by a
          cable on the left, sovereign monolith on the right), then 420
          frames embedded CostChart at frame 390. */}
      <Composition
        id="ContrastScene"
        component={ContrastSceneV2}
        durationInFrames={810}
        fps={theme.scene.fps}
        width={theme.scene.width}
        height={theme.scene.height}
      />

      {/* Standalone CostChart · 18s · 8 quarters over 2 years · 4-phase camera with forever creep */}
      <Composition
        id="CostChart"
        component={CostChart}
        durationInFrames={420}
        fps={theme.scene.fps}
        width={theme.scene.width}
        height={theme.scene.height}
      />

      {/* Standalone Scene 3 · PivotScene · 5s · the breath between problem and pivot.
          150 frames @ 30fps. Pure off-white, no accents. Headline fade + TypeWriter subtitle. */}
      <Composition
        id="PivotScene"
        component={PivotScene}
        durationInFrames={150}
        fps={theme.scene.fps}
        width={theme.scene.width}
        height={theme.scene.height}
        defaultProps={pivotSceneDefaults}
      />

      {/* Standalone Scene 1 · QuestionScene · 6s · "The Indictment Roll-Call".
          180 frames @ 30fps. Off-white radial bg. Four AI provider logo+name
          rows reveal sequentially in the left third, then a centered question
          types in to the right two-thirds. Calm setup, building curiosity. */}
      <Composition
        id="QuestionScene"
        component={QuestionScene}
        durationInFrames={180}
        fps={theme.scene.fps}
        width={theme.scene.width}
        height={theme.scene.height}
        defaultProps={questionSceneDefaults}
      />

      {/* Standalone Scene 2 · AnswerScene · 10s · "The Verdict" (v5).
          300 frames @ 30fps. Off-white with a hairline darken under the
          evidence dump. Empty stage breath, answer types in centered + holds,
          then swipes up as 14 article cards cascade across the FULL canvas
          (spread 500×355 half-extents). Cards retreat outward to clear the
          stage. Verdict words "Banned. Nerfed. Repriced." stamp in BIG
          (scale 2.2→1.0 with overshoot, shake, orange glow pulse, thud per
          word) at f216, f228, f240. Verdict + "Without notice." subtitle
          HOLD at full strength for 30f, then a left-to-right wipe + blur
          erases everything for the silent relief beat into PivotScene. */}
      <Composition
        id="AnswerScene"
        component={AnswerScene}
        durationInFrames={300}
        fps={theme.scene.fps}
        width={theme.scene.width}
        height={theme.scene.height}
      />

      {/* Standalone Scene 4 · AudienceScene · 5s · "Naming the audience".
          150 frames @ 30fps. Off-white room with a subtle perspective-grid
          floor receding toward the horizon. Six industry names fly through
          the camera in brand purple (frames 10..110, ~14 frames apart, 28
          frame lifetime each). After the cascade clears, an ink hold-line
          fades in (frames 110..130) and holds to scene end. Pure 2D scene
          with CSS perspective; no @remotion/three. All animation is frame-
          driven via useCurrentFrame() + interpolate, Easing.bezier only. */}
      <Composition
        id="AudienceScene"
        component={AudienceScene}
        durationInFrames={150}
        fps={theme.scene.fps}
        width={theme.scene.width}
        height={theme.scene.height}
        defaultProps={audienceSceneDefaults}
      />

      {/* Standalone Scene 5 · BrandIntroScene · 5s · "Brand presence + product
          summary". 150 frames @ 30fps. Off-white with a soft brand-purple
          radial wash. BrandWordmark springs in centered (its built-in spring),
          three feature pillars stagger in below using Easing.bezier overshoot,
          tagline fades in last. Pure 2D · no 3D, no springs added beyond the
          pre-existing BrandWordmark spring. */}
      <Composition
        id="BrandIntroScene"
        component={BrandIntroScene}
        durationInFrames={150}
        fps={theme.scene.fps}
        width={theme.scene.width}
        height={theme.scene.height}
        defaultProps={brandIntroSceneDefaults}
      />

      {/* Standalone Scene 8 · OutroSceneV2 · 6s · "Considered close."
          180 frames @ 30fps. Pure off-white. BrandWordmark settles in
          (showTagline=false), then a TypeWriter tagline in brand orange,
          then a smaller TypeWriter URL in muted ink. Sequential reveals,
          single accent (orange) carries the close, no em-dashes. */}
      <Composition
        id="OutroSceneV2"
        component={OutroSceneV2}
        durationInFrames={180}
        fps={theme.scene.fps}
        width={theme.scene.width}
        height={theme.scene.height}
        defaultProps={outroSceneV2Defaults}
      />

      {/* Standalone Scene 7 · WorkflowSceneV2 · 12s · "The Demo Beat."
          360 frames @ 30fps. Off-white with subtle grid. User question types
          in centered (TypeWriter), then a fake cursor drags 7 nodes from a
          left sidebar palette onto the canvas (Trigger, Database, PHI Classify,
          PII Filter, Local LLM, Audit Trail, Output). Edges in brand purple
          stitch the chain. Camera pulls wide, then a result card grid-staggers
          in over the chain (2,847 records / All PHI redacted / 12 evidence
          points / HIPAA: PASS in brand orange). All animation frame-driven
          via useCurrentFrame() + Easing.bezier; no 3D, no Tailwind animation
          classes, no CSS transitions. WorkflowNode legacy spring is the only
          carryover spring (component-internal, accepted). */}
      <Composition
        id="WorkflowSceneV2"
        component={WorkflowSceneV2}
        durationInFrames={360}
        fps={theme.scene.fps}
        width={theme.scene.width}
        height={theme.scene.height}
        defaultProps={workflowSceneV2Defaults}
      />
    </>
  )
}
