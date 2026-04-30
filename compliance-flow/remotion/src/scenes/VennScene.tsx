import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion'
import { AnimatedText } from 'remotion-bits'
import { z } from 'zod'
import { zColor } from '@remotion/zod-types'
import { theme } from '../theme'

// Geometry + color slot per circle. Editable text comes from props; layout stays locked.
const CIRCLE_GEOMETRY = [
  { color: 'purple' as const, cx: 760, cy: 480, appearAt: 0 },
  { color: 'orange' as const, cx: 1160, cy: 480, appearAt: 24 },
  { color: 'teal' as const, cx: 960, cy: 740, appearAt: 48 },
]

const COLOR_MAP = {
  purple: { color: theme.colors.purple, fill: theme.colors.purpleSoft, edge: theme.colors.purpleEdge },
  orange: { color: theme.colors.orange, fill: theme.colors.orangeSoft, edge: theme.colors.orangeEdge },
  teal: { color: theme.colors.teal, fill: theme.colors.tealSoft, edge: theme.colors.tealEdge },
}

const RADIUS = 280

const LABEL_OFFSETS = [
  { dx: -RADIUS - 220, dy: -40, align: 'right' as const },
  { dx: RADIUS + 40, dy: -40, align: 'left' as const },
  { dx: -130, dy: RADIUS + 40, align: 'left' as const },
]

export const vennSceneSchema = z.object({
  title: z.string(),
  centerLead: z.string(),
  centerAccent: z.string(),
  circles: z
    .array(
      z.object({
        label: z.string(),
        sub: z.string(),
      }),
    )
    .length(3),
  accentColor: zColor(),
})

export type VennSceneProps = z.infer<typeof vennSceneSchema>

export const vennSceneDefaults: VennSceneProps = {
  title: 'Three things have to be true at once.',
  centerLead: 'Compliance',
  centerAccent: 'Flow',
  circles: [
    { label: 'Local-first', sub: 'Data never leaves the box' },
    { label: 'Audit-native', sub: 'Every step emits evidence' },
    { label: 'Governance', sub: 'Bias · drift · explainability' },
  ],
  accentColor: theme.colors.orange,
}

export const VennScene: React.FC<Partial<VennSceneProps>> = (props) => {
  const { title, centerLead, centerAccent, circles, accentColor } = {
    ...vennSceneDefaults,
    ...props,
  }
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
        background: `radial-gradient(circle at 50% 50%, ${theme.colors.bg}, ${theme.colors.bgEdge} 95%)`,
        fontFamily: theme.fonts.body,
        color: theme.colors.ink,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 100,
          left: 0,
          right: 0,
          textAlign: 'center',
          opacity: titleOpacity,
          fontFamily: theme.fonts.heading,
          fontSize: 56,
          fontWeight: 700,
          letterSpacing: -1,
          color: theme.colors.ink,
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
          {title}
        </AnimatedText>
      </div>

      <svg
        width={1920}
        height={1080}
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        {CIRCLE_GEOMETRY.map((g, i) => {
          const palette = COLOR_MAP[g.color]
          const appear = spring({
            frame: frame - g.appearAt,
            fps,
            config: { damping: 14, mass: 0.7 },
          })
          return (
            <g key={i} opacity={appear}>
              <circle
                cx={g.cx}
                cy={g.cy}
                r={RADIUS}
                fill={palette.fill}
                stroke={palette.edge}
                strokeWidth={2.5}
              />
            </g>
          )
        })}
      </svg>

      {CIRCLE_GEOMETRY.map((g, i) => {
        const palette = COLOR_MAP[g.color]
        const content = circles[i]
        const labelOpacity = interpolate(
          frame - g.appearAt,
          [12, 28],
          [0, 1],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
        )
        const offset = LABEL_OFFSETS[i]
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: g.cx + offset.dx,
              top: g.cy + offset.dy,
              width: 280,
              textAlign: offset.align,
              opacity: labelOpacity,
              fontFamily: theme.fonts.body,
            }}
          >
            <div
              style={{
                fontFamily: theme.fonts.heading,
                fontSize: 30,
                fontWeight: 700,
                color: palette.color,
                marginBottom: 4,
                letterSpacing: -0.5,
              }}
            >
              {content.label}
            </div>
            <div
              style={{
                fontSize: 17,
                color: theme.colors.inkMuted,
                letterSpacing: 0.2,
              }}
            >
              {content.sub}
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
          color: theme.colors.ink,
          background: theme.colors.bg,
          padding: '14px 32px',
          borderRadius: 16,
          border: `2px solid ${accentColor}`,
          boxShadow: `0 12px 32px rgba(255, 108, 29, 0.25)`,
        }}
      >
        {centerLead}
        <span style={{ color: accentColor }}>{centerAccent}</span>
      </div>
    </AbsoluteFill>
  )
}
