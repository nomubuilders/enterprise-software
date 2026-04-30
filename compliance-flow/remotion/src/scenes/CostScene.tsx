import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion'
import { AnimatedText } from 'remotion-bits'
import { z } from 'zod'
import { zColor } from '@remotion/zod-types'
import { theme } from '../theme'

// 12 months of monthly bills. Cloud climbs as usage scales + price hikes.
// Local stays at $0/month after initial hardware purchase (one-time).
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const CLOUD_COSTS = [200, 280, 380, 520, 720, 980, 1280, 1620, 1980, 2200, 2350, 2400]
const Y_MAX = 2500

// Chart geometry
const CHART_X = 240
const CHART_Y = 320
const CHART_W = 1440
const CHART_H = 540

const xAt = (i: number) => CHART_X + (i / (MONTHS.length - 1)) * CHART_W
const yAt = (cost: number) => CHART_Y + CHART_H - (cost / Y_MAX) * CHART_H

const cloudPath =
  `M ${xAt(0)} ${yAt(CLOUD_COSTS[0])} ` +
  CLOUD_COSTS.slice(1)
    .map((c, i) => `L ${xAt(i + 1)} ${yAt(c)}`)
    .join(' ')

const cloudArea = `${cloudPath} L ${xAt(MONTHS.length - 1)} ${yAt(0)} L ${xAt(0)} ${yAt(0)} Z`

const localPath = `M ${xAt(0)} ${yAt(0)} L ${xAt(MONTHS.length - 1)} ${yAt(0)}`

const approxLength = (() => {
  let total = 0
  for (let i = 1; i < CLOUD_COSTS.length; i++) {
    const dx = xAt(i) - xAt(i - 1)
    const dy = yAt(CLOUD_COSTS[i]) - yAt(CLOUD_COSTS[i - 1])
    total += Math.sqrt(dx * dx + dy * dy)
  }
  return total
})()
const LOCAL_LENGTH = CHART_W

export const costSceneSchema = z.object({
  titleLead: z.string(),
  titleAccent: z.string(),
  subtitle: z.string(),
  cloudFinalValue: z.string(),
  cloudLabel: z.string(),
  localFinalValue: z.string(),
  localLabel: z.string(),
  accentColor: zColor(),
  primaryColor: zColor(),
})

export type CostSceneProps = z.infer<typeof costSceneSchema>

export const costSceneDefaults: CostSceneProps = {
  titleLead: 'And every month',
  titleAccent: 'the bill grows.',
  subtitle: 'Monthly cost (USD) · 12 months',
  cloudFinalValue: '$2,400/mo',
  cloudLabel: 'Cloud LLM · still rising',
  localFinalValue: '$0/mo',
  localLabel: 'Local · hardware paid once',
  accentColor: theme.colors.orange,
  primaryColor: theme.colors.purple,
}

export const CostScene: React.FC<Partial<CostSceneProps>> = (props) => {
  const {
    titleLead,
    titleAccent,
    subtitle,
    cloudFinalValue,
    cloudLabel,
    localFinalValue,
    localLabel,
    accentColor,
    primaryColor,
  } = { ...costSceneDefaults, ...props }

  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const cloudDraw = interpolate(frame, [30, 130], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const cloudFill = interpolate(frame, [80, 140], [0, 0.18], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const localDraw = interpolate(frame, [60, 110], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const cloudCalloutSpring = spring({
    frame: frame - 130,
    fps,
    config: { damping: 14, mass: 0.6 },
  })
  const localCalloutSpring = spring({
    frame: frame - 140,
    fps,
    config: { damping: 14, mass: 0.6 },
  })

  const exitOpacity = interpolate(frame, [156, 180], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 50%, ${theme.colors.bg}, ${theme.colors.bgEdge} 95%)`,
        fontFamily: theme.fonts.body,
        color: theme.colors.ink,
        opacity: exitOpacity,
      }}
    >
      {/* Title */}
      <div
        style={{
          position: 'absolute',
          top: 90,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: theme.fonts.heading,
          fontSize: 56,
          fontWeight: 700,
          letterSpacing: -1,
          color: theme.colors.ink,
          display: 'flex',
          justifyContent: 'center',
          gap: 14,
        }}
      >
        <AnimatedText
          transition={{
            split: 'word',
            splitStagger: 4,
            opacity: [0, 1],
            translateY: [12, 0],
            duration: 18,
          }}
        >
          {titleLead}
        </AnimatedText>
        <span style={{ color: accentColor }}>
          <AnimatedText
            transition={{
              split: 'word',
              splitStagger: 4,
              opacity: [0, 1],
              translateY: [12, 0],
              duration: 18,
              delay: 8,
            }}
          >
            {titleAccent}
          </AnimatedText>
        </span>
      </div>

      {/* Subtitle */}
      <div
        style={{
          position: 'absolute',
          top: 180,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: theme.fonts.body,
          fontSize: 22,
          color: theme.colors.inkMuted,
          letterSpacing: 2,
          textTransform: 'uppercase',
          opacity: interpolate(frame, [20, 40], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        {subtitle}
      </div>

      {/* SVG chart */}
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        {[0, 500, 1000, 1500, 2000, 2500].map((tick) => {
          const y = yAt(tick)
          const tickOpacity = interpolate(frame, [10, 30], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })
          return (
            <g key={tick} opacity={tickOpacity}>
              <line
                x1={CHART_X}
                y1={y}
                x2={CHART_X + CHART_W}
                y2={y}
                stroke="rgba(26, 22, 20, 0.06)"
                strokeWidth={1}
                strokeDasharray={tick === 0 ? '0' : '4 6'}
              />
              <text
                x={CHART_X - 16}
                y={y + 5}
                textAnchor="end"
                style={{
                  fontFamily: theme.fonts.body,
                  fontSize: 16,
                  fill: theme.colors.inkSubtle,
                }}
              >
                ${tick === 0 ? '0' : `${tick / 1000}K`.replace('.0K', 'K')}
              </text>
            </g>
          )
        })}

        {MONTHS.map((m, i) => {
          if (i % 2 !== 0 && i !== MONTHS.length - 1) return null
          const labelOpacity = interpolate(frame, [15, 35], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })
          return (
            <text
              key={m}
              x={xAt(i)}
              y={CHART_Y + CHART_H + 30}
              textAnchor="middle"
              opacity={labelOpacity}
              style={{
                fontFamily: theme.fonts.body,
                fontSize: 16,
                fill: theme.colors.inkSubtle,
                letterSpacing: 1,
              }}
            >
              {m}
            </text>
          )
        })}

        <path d={cloudArea} fill={accentColor} opacity={cloudFill} />

        <path
          d={cloudPath}
          fill="none"
          stroke={accentColor}
          strokeWidth={5}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={approxLength}
          strokeDashoffset={approxLength * (1 - cloudDraw)}
          style={{ filter: `drop-shadow(0 4px 12px ${theme.colors.orangeEdge})` }}
        />

        <path
          d={localPath}
          fill="none"
          stroke={primaryColor}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={LOCAL_LENGTH}
          strokeDashoffset={LOCAL_LENGTH * (1 - localDraw)}
        />

        <circle
          cx={xAt(MONTHS.length - 1)}
          cy={yAt(CLOUD_COSTS[CLOUD_COSTS.length - 1])}
          r={cloudDraw >= 1 ? 9 : 0}
          fill={accentColor}
          stroke={theme.colors.bg}
          strokeWidth={3}
        />
        <circle
          cx={xAt(MONTHS.length - 1)}
          cy={yAt(0)}
          r={localDraw >= 1 ? 9 : 0}
          fill={primaryColor}
          stroke={theme.colors.bg}
          strokeWidth={3}
        />
      </svg>

      {/* Cloud line callout */}
      <div
        style={{
          position: 'absolute',
          left: xAt(MONTHS.length - 1) - 280,
          top: yAt(CLOUD_COSTS[CLOUD_COSTS.length - 1]) - 90,
          width: 260,
          textAlign: 'right',
          opacity: cloudCalloutSpring,
          transform: `translateY(${(1 - cloudCalloutSpring) * 12}px)`,
          fontFamily: theme.fonts.heading,
        }}
      >
        <div
          style={{
            fontSize: 38,
            fontWeight: 700,
            color: accentColor,
            letterSpacing: -1,
          }}
        >
          {cloudFinalValue}
        </div>
        <div
          style={{
            fontSize: 16,
            color: theme.colors.inkMuted,
            fontFamily: theme.fonts.body,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            marginTop: 2,
          }}
        >
          {cloudLabel}
        </div>
      </div>

      {/* Local line callout */}
      <div
        style={{
          position: 'absolute',
          left: xAt(MONTHS.length - 1) - 280,
          top: yAt(0) + 24,
          width: 260,
          textAlign: 'right',
          opacity: localCalloutSpring,
          transform: `translateY(${(1 - localCalloutSpring) * 12}px)`,
          fontFamily: theme.fonts.heading,
        }}
      >
        <div
          style={{
            fontSize: 38,
            fontWeight: 700,
            color: primaryColor,
            letterSpacing: -1,
          }}
        >
          {localFinalValue}
        </div>
        <div
          style={{
            fontSize: 16,
            color: theme.colors.inkMuted,
            fontFamily: theme.fonts.body,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            marginTop: 2,
          }}
        >
          {localLabel}
        </div>
      </div>
    </AbsoluteFill>
  )
}
