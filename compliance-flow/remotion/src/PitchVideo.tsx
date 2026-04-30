import { AbsoluteFill, Sequence } from 'remotion'
import { sceneTimings, theme } from './theme'
import { HookScene } from './scenes/HookScene'
import { CostScene } from './scenes/CostScene'
import { SolutionScene } from './scenes/SolutionScene'
import { VennScene } from './scenes/VennScene'
import { WorkflowScene } from './scenes/WorkflowScene'
import { OutroScene } from './scenes/OutroScene'

export const PitchVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: theme.colors.bg }}>
      <Sequence from={sceneTimings.hook.from} durationInFrames={sceneTimings.hook.durationInFrames}>
        <HookScene />
      </Sequence>

      <Sequence from={sceneTimings.cost.from} durationInFrames={sceneTimings.cost.durationInFrames}>
        <CostScene />
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
    </AbsoluteFill>
  )
}
