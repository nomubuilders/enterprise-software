import { AbsoluteFill, Easing, interpolate, Sequence, useCurrentFrame } from 'remotion'
import { theme } from './theme'
import { QuestionScene } from './scenes/QuestionScene'
import { AnswerScene } from './scenes/AnswerScene'
import { PivotScene } from './scenes/PivotScene'
import { AudienceScene } from './scenes/AudienceScene'
import { BrandIntroScene } from './scenes/BrandIntroScene'
import { ContrastSceneV2 } from './scenes/ContrastSceneV2'
import { WorkflowSceneV2 } from './scenes/WorkflowSceneV2'
import { OutroSceneV2 } from './scenes/OutroSceneV2'

// Fade-through-bg transition overlay. Paints an off-white wash on top of
// the scene stack that ramps 0 → 1 → 0 across (fadeStart, fadeMid,
// fadeEnd). Used to soften the two light↔dark boundaries in the master
// timeline (BrandIntro → Contrast at f930, Contrast → Workflow at f1928)
// so the cut between off-white scenes and the dark 3D scene doesn't read
// as a hard slap. Without this the viewer's pupils get whiplashed twice.
const FadeThroughBg: React.FC<{
  fadeStart: number
  fadeMid: number
  fadeEnd: number
}> = ({ fadeStart, fadeMid, fadeEnd }) => {
  const frame = useCurrentFrame()
  const ease = Easing.bezier(0.45, 0, 0.55, 1)
  const opacity = interpolate(
    frame,
    [fadeStart, fadeMid, fadeEnd],
    [0, 1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: ease,
    },
  )
  if (opacity <= 0) return null
  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.colors.bg,
        opacity,
        pointerEvents: 'none',
      }}
    />
  )
}

// PitchVideo v2 · 8-scene wired composition per SCRIPT.md.
//
// Scene 6 (ContrastSceneV2) runs 810 frames standalone after "The Leash"
// rewrite (390 frame 3D leash + 420 frame embedded CostChart, down from
// 998f / 33.27s). Workflow + Outro shifted left by 188f. Total master
// duration drops 2468f / 82.27s → 2280f / 76.0s.
//
//   1 Question     180  ·    0..180
//   2 Answer       300  ·  180..480
//   3 Pivot        150  ·  480..630
//   4 Audience     150  ·  630..780
//   5 BrandIntro   150  ·  780..930
//   6 Contrast     810  ·  930..1740   (was 998 · "The Leash" rewrite)
//   7 Workflow     360  · 1740..2100   (was 1928..2288)
//   8 Outro        180  · 2100..2280   (was 2288..2468)
//
// Total: 2280 frames at 30fps = 76.0 seconds.

export const PITCH_V2_TIMINGS = {
  question:    { from: 0,    durationInFrames: 180 },
  answer:      { from: 180,  durationInFrames: 300 },
  pivot:       { from: 480,  durationInFrames: 150 },
  audience:    { from: 630,  durationInFrames: 150 },
  brandIntro:  { from: 780,  durationInFrames: 150 },
  contrast:    { from: 930,  durationInFrames: 810 },  // "The Leash" · 390 leash + 420 chart
  workflow:    { from: 1740, durationInFrames: 360 },
  outro:       { from: 2100, durationInFrames: 180 },
} as const

export const PITCH_V2_TOTAL_FRAMES = 2280

export const PitchVideoV2: React.FC = () => {
  const t = PITCH_V2_TIMINGS
  return (
    <AbsoluteFill style={{ background: theme.colors.bg }}>
      <Sequence from={t.question.from} durationInFrames={t.question.durationInFrames}>
        <QuestionScene />
      </Sequence>

      <Sequence from={t.answer.from} durationInFrames={t.answer.durationInFrames}>
        <AnswerScene />
      </Sequence>

      <Sequence from={t.pivot.from} durationInFrames={t.pivot.durationInFrames}>
        <PivotScene />
      </Sequence>

      <Sequence from={t.audience.from} durationInFrames={t.audience.durationInFrames}>
        <AudienceScene />
      </Sequence>

      <Sequence from={t.brandIntro.from} durationInFrames={t.brandIntro.durationInFrames}>
        <BrandIntroScene />
      </Sequence>

      <Sequence from={t.contrast.from} durationInFrames={t.contrast.durationInFrames}>
        <ContrastSceneV2 />
      </Sequence>

      <Sequence from={t.workflow.from} durationInFrames={t.workflow.durationInFrames}>
        <WorkflowSceneV2 />
      </Sequence>

      <Sequence from={t.outro.from} durationInFrames={t.outro.durationInFrames}>
        <OutroSceneV2 />
      </Sequence>

      {/* Light → dark transition · BrandIntro (off-white) → Contrast (dark).
          24-frame fade-through-bg centered on the cut at f930. */}
      <FadeThroughBg fadeStart={918} fadeMid={930} fadeEnd={942} />

      {/* Dark → light transition · Contrast (dark) → Workflow (off-white).
          24-frame fade-through-bg centered on the new cut at f1740 (was
          1928 before "The Leash" compression shifted Workflow left by 188f). */}
      <FadeThroughBg fadeStart={1728} fadeMid={1740} fadeEnd={1752} />
    </AbsoluteFill>
  )
}
