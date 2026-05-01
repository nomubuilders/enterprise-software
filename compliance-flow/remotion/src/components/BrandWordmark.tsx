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
        <div
          style={{
            width: 180,
            height: 180,
            borderRadius: 32,
            // White squarcle with subtle purple shadow for separation from the
            // off-white scene background. Inner padding keeps the wave icon
            // off the edges so it can breathe.
            background: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            boxShadow: `0 12px 40px ${theme.colors.purpleEdge}, 0 0 0 1px ${theme.colors.purpleSoft}`,
          }}
        >
          <Img
            src={staticFile('nomu-symbol.png')}
            style={{ width: 128, height: 128, objectFit: 'contain' }}
          />
        </div>
      </div>

      <div
        style={{
          opacity: wordmarkOpacity,
          fontFamily: theme.fonts.heading,
          fontSize: 96,
          fontWeight: 700,
          color: theme.colors.ink,
          letterSpacing: -2,
        }}
      >
        Compliance<span style={{ color: theme.colors.purple }}>Flow</span>
      </div>

      {showTagline && (
        <div
          style={{
            opacity: taglineOpacity,
            fontFamily: theme.fonts.body,
            fontSize: 28,
            color: theme.colors.inkSubtle,
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
