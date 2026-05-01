import { AbsoluteFill, Sequence } from 'remotion'
import { theme } from './theme'
import { QuestionScene } from './scenes/QuestionScene'
import { AnswerScene } from './scenes/AnswerScene'
import { PivotScene } from './scenes/PivotScene'
import { AudienceScene } from './scenes/AudienceScene'
import { BrandIntroScene } from './scenes/BrandIntroScene'
import { ContrastSceneV2 } from './scenes/ContrastSceneV2'
import { WorkflowSceneV2 } from './scenes/WorkflowSceneV2'
import { OutroSceneV2 } from './scenes/OutroSceneV2'

// PitchVideo v2 · 8-scene wired composition per SCRIPT.md.
//
// Scene 6 (ContrastSceneV2) runs 998 frames standalone (578 frame 3D contrast
// section + 420 frame embedded CostChart). v5 timing (AnswerScene now 300f
// for the dramatic verdict hold + erase beat):
//   1 Question     180  ·  0..180
//   2 Answer       300  ·  180..480     (+60 vs v4)
//   3 Pivot        150  ·  480..630
//   4 Audience     150  ·  630..780
//   5 BrandIntro   150  ·  780..930
//   6 Contrast     998  ·  930..1928
//   7 Workflow     360  ·  1928..2288
//   8 Outro        180  ·  2288..2468
//
// Total: 2468 frames at 30fps = 82.27 seconds.

export const PITCH_V2_TIMINGS = {
  question:    { from: 0,    durationInFrames: 180 },
  answer:      { from: 180,  durationInFrames: 300 },  // v5: 300f for verdict drama + erase
  pivot:       { from: 480,  durationInFrames: 150 },
  audience:    { from: 630,  durationInFrames: 150 },
  brandIntro:  { from: 780,  durationInFrames: 150 },
  contrast:    { from: 930,  durationInFrames: 998 },
  workflow:    { from: 1928, durationInFrames: 360 },
  outro:       { from: 2288, durationInFrames: 180 },
} as const

export const PITCH_V2_TOTAL_FRAMES = 2468

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
    </AbsoluteFill>
  )
}
