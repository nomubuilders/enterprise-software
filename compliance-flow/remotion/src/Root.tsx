import { Composition } from 'remotion'
import { PitchVideo } from './PitchVideo'
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
    </>
  )
}
