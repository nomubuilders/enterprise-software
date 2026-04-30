import { Composition } from 'remotion'
import { PitchVideo } from './PitchVideo'
import { ContrastScene } from './scenes/ContrastScene'
import { theme, TOTAL_FRAMES } from './theme'

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
      />

      {/* Standalone preview · script Scene 6 v3 (15s cinematic cut with screen crack + chart escape) */}
      <Composition
        id="ContrastScene"
        component={ContrastScene}
        durationInFrames={450}
        fps={theme.scene.fps}
        width={theme.scene.width}
        height={theme.scene.height}
      />
    </>
  )
}
