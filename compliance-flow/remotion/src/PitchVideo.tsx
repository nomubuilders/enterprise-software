import { AbsoluteFill, Sequence, useCurrentFrame, interpolate } from 'remotion'
import { sceneTimings, theme } from './theme'
import { HookScene } from './scenes/HookScene'
import { SolutionScene } from './scenes/SolutionScene'
import { VennScene } from './scenes/VennScene'
import { WorkflowScene } from './scenes/WorkflowScene'
import { OutroScene } from './scenes/OutroScene'

export const PitchVideo: React.FC = () => {
  const frame = useCurrentFrame()

  // Subtle vignette over everything for cinematic feel
  const vignetteOpacity = interpolate(
    frame,
    [0, 30, sceneTimings.outro.from + sceneTimings.outro.durationInFrames - 10],
    [0, 0.6, 0.6],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )

  return (
    <AbsoluteFill style={{ background: theme.colors.black }}>
      <Sequence from={sceneTimings.hook.from} durationInFrames={sceneTimings.hook.durationInFrames}>
        <HookScene />
      </Sequence>

      <Sequence from={sceneTimings.solution.from} durationInFrames={sceneTimings.solution.durationInFrames}>
        <SolutionScene />
      </Sequence>

      <Sequence from={sceneTimings.venn.from} durationInFrames={sceneTimings.venn.durationInFrames}>
        <VennScene />
      </Sequence>

      <Sequence from={sceneTimings.workflow.from} durationInFrames={sceneTimings.workflow.durationInFrames}>
        <WorkflowScene />
      </Sequence>

      <Sequence from={sceneTimings.outro.from} durationInFrames={sceneTimings.outro.durationInFrames}>
        <OutroScene />
      </Sequence>

      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.7) 100%)',
          opacity: vignetteOpacity,
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  )
}
