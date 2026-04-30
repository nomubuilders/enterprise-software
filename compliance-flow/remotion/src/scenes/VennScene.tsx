import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion'
import { AnimatedText } from 'remotion-bits'
import { theme } from '../theme'

const CIRCLES = [
  {
    label: 'Local-first',
    sub: 'Data never leaves the box',
    color: theme.colors.purple,
    fill: theme.colors.purpleSoft,
    edge: theme.colors.purpleEdge,
    cx: 760,
    cy: 480,
    appearAt: 0,
  },
  {
    label: 'Audit-native',
    sub: 'Every step emits evidence',
    color: theme.colors.orange,
    fill: theme.colors.orangeSoft,
    edge: theme.colors.orangeEdge,
    cx: 1160,
    cy: 480,
    appearAt: 24,
  },
  {
    label: 'Governance primitives',
    sub: 'Bias, drift, explainability',
    color: theme.colors.cyan,
    fill: 'rgba(0, 229, 255, 0.18)',
    edge: 'rgba(0, 229, 255, 0.45)',
    cx: 960,
    cy: 740,
    appearAt: 48,
  },
]

const RADIUS = 280

export const VennScene: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const titleOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateRight: 'clamp',
  })

  const intersectionAppear = spring({
    frame: frame - 110,
    fps,
    config: { damping: 14, mass: 0.6 },
  })

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 50%, ${theme.colors.darkGray}, ${theme.colors.black} 80%)`,
        fontFamily: theme.fonts.body,
        color: theme.colors.offWhite,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 80,
          left: 0,
          right: 0,
          textAlign: 'center',
          opacity: titleOpacity,
          fontFamily: theme.fonts.heading,
          fontSize: 56,
          fontWeight: 700,
          letterSpacing: -1,
        }}
      >
        <AnimatedText
          transition={{
            split: 'word',
            splitStagger: 3,
            opacity: [0, 1],
            translateY: [12, 0],
            duration: 16,
          }}
        >
          Three things have to be true at once.
        </AnimatedText>
      </div>

      <svg
        width={1920}
        height={1080}
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        {CIRCLES.map((c) => {
          const appear = spring({
            frame: frame - c.appearAt,
            fps,
            config: { damping: 14, mass: 0.7 },
          })
          return (
            <g key={c.label} opacity={appear}>
              <circle
                cx={c.cx}
                cy={c.cy}
                r={RADIUS}
                fill={c.fill}
                stroke={c.edge}
                strokeWidth={3}
              />
            </g>
          )
        })}
      </svg>

      {CIRCLES.map((c, i) => {
        const labelOpacity = interpolate(
          frame - c.appearAt,
          [12, 28],
          [0, 1],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        )
        const labelOffsets = [
          { dx: -RADIUS - 200, dy: -40, align: 'right' as const },
          { dx: RADIUS + 40, dy: -40, align: 'left' as const },
          { dx: -110, dy: RADIUS + 30, align: 'left' as const },
        ]
        const offset = labelOffsets[i]
        return (
          <div
            key={c.label}
            style={{
              position: 'absolute',
              left: c.cx + offset.dx,
              top: c.cy + offset.dy,
              width: 260,
              textAlign: offset.align,
              opacity: labelOpacity,
              fontFamily: theme.fonts.body,
            }}
          >
            <div
              style={{
                fontFamily: theme.fonts.heading,
                fontSize: 28,
                fontWeight: 700,
                color: c.color,
                marginBottom: 4,
              }}
            >
              {c.label}
            </div>
            <div
              style={{
                fontSize: 16,
                color: theme.colors.grayMuted,
              }}
            >
              {c.sub}
            </div>
          </div>
        )
      })}

      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 580,
          transform: `translate(-50%, -50%) scale(${intersectionAppear})`,
          opacity: intersectionAppear,
          fontFamily: theme.fonts.heading,
          fontSize: 44,
          fontWeight: 700,
          color: theme.colors.offWhite,
          background: theme.colors.black,
          padding: '14px 32px',
          borderRadius: 16,
          border: `2px solid ${theme.colors.orange}`,
          boxShadow: `0 0 32px ${theme.colors.orangeEdge}`,
        }}
      >
        Compliance<span style={{ color: theme.colors.orange }}>Flow</span>
      </div>
    </AbsoluteFill>
  )
}
