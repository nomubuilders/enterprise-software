import { staticFile, Img, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion'
import { theme } from '../theme'

interface Props {
  delay?: number
  showTagline?: boolean
}

export const BrandWordmark: React.FC<Props> = ({ delay = 0, showTagline = true }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const symbolScale = spring({
    frame: frame - delay,
    fps,
    config: { damping: 12, mass: 0.6 },
  })

  const wordmarkOpacity = interpolate(
    frame - delay,
    [12, 28],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )

  const taglineOpacity = interpolate(
    frame - delay,
    [28, 44],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 24,
      }}
    >
      <div style={{ transform: `scale(${symbolScale})` }}>
        <Img
          src={staticFile('nomu-symbol.png')}
          style={{ width: 180, height: 180, objectFit: 'contain' }}
        />
      </div>

      <div
        style={{
          opacity: wordmarkOpacity,
          fontFamily: theme.fonts.heading,
          fontSize: 96,
          fontWeight: 700,
          color: theme.colors.offWhite,
          letterSpacing: -2,
        }}
      >
        Compliance<span style={{ color: theme.colors.orange }}>Flow</span>
      </div>

      {showTagline && (
        <div
          style={{
            opacity: taglineOpacity,
            fontFamily: theme.fonts.body,
            fontSize: 28,
            color: theme.colors.grayMuted,
            letterSpacing: 4,
            textTransform: 'uppercase',
          }}
        >
          We Make Data Speak
        </div>
      )}
    </div>
  )
}
