import { Composition } from 'remotion'
import { PitchVideo, pitchVideoSchema, pitchVideoDefaults } from './PitchVideo'
import { ContrastScene } from './scenes/ContrastScene'
import { CostChart } from './scenes/CostChart'
import { HookScene, hookSceneSchema, hookSceneDefaults } from './scenes/HookScene'
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

      {/* Standalone preview · ContrastScene · 33.3s
          578 frames cream world (sequential 3D card pairs) + circle wipe,
          then 420 frames embedded CostChart. */}
      <Composition
        id="ContrastScene"
        component={ContrastScene}
        durationInFrames={998}
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
    </>
  )
}
