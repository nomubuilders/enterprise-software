import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion'
import { TypeWriter } from 'remotion-bits'
import { theme } from '../theme'
import { BrandWordmark } from '../components/BrandWordmark'

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame()

  const fadeIn = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill
      style={{
        background: theme.colors.black,
        opacity: fadeIn,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 32,
      }}
    >
      <BrandWordmark delay={0} showTagline={false} />
      <div
        style={{
          fontFamily: theme.fonts.heading,
          fontSize: 36,
          color: theme.colors.orange,
          letterSpacing: 1,
          minHeight: 50,
        }}
      >
        <TypeWriter
          text="Run AI on your terms."
          typeSpeed={2}
          pauseAfterType={9999}
        />
      </div>
    </AbsoluteFill>
  )
}
