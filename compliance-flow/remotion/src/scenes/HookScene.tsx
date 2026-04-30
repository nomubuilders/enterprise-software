import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion'
import { AnimatedText } from 'remotion-bits'
import { theme } from '../theme'
import { ArticleStack } from '../components/ArticleStack'

const PROBLEMS = [
  {
    headline: 'Your data leaves the perimeter.',
    sub: 'Every prompt ships to someone else’s GPU.',
  },
  {
    headline: 'There is no audit trail.',
    sub: 'Regulators ask what the model saw. Cloud APIs return a string.',
  },
  {
    headline: 'You don’t control the model.',
    sub: 'It can be banned, repriced, or quietly nerfed — overnight.',
  },
]

export const HookScene: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const exitOpacity = interpolate(frame, [156, 180], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // Top title timing — providers list comes in early, then shrinks/moves up
  const titleSpring = spring({
    frame: frame - 4,
    fps,
    config: { damping: 18, mass: 0.7 },
  })

  // Subtitle reveal after articles have stacked
  const subtitleOpacity = interpolate(frame, [60, 80], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 50%, ${theme.colors.bg}, ${theme.colors.bgEdge} 95%)`,
        fontFamily: theme.fonts.body,
        color: theme.colors.ink,
      }}
    >
      {/* Article pile — full opacity 0-60, dims to backdrop after */}
      <div style={{ opacity: exitOpacity }}>
        <ArticleStack startAt={0} dimAfter={60} dimTo={0.18} />
      </div>

      {/* Top title — provider names */}
      <div
        style={{
          position: 'absolute',
          top: 80,
          left: 0,
          right: 0,
          textAlign: 'center',
          opacity: titleSpring * exitOpacity,
          transform: `translateY(${(1 - titleSpring) * -20}px)`,
          fontFamily: theme.fonts.heading,
          fontSize: 64,
          fontWeight: 700,
          letterSpacing: -1.5,
          color: theme.colors.ink,
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
          ChatGPT · Claude · Gemini · Copilot
        </AnimatedText>
      </div>

      {/* Subtitle — appears after pile lands */}
      <div
        style={{
          position: 'absolute',
          top: 180,
          left: 0,
          right: 0,
          textAlign: 'center',
          opacity: subtitleOpacity * exitOpacity,
          fontFamily: theme.fonts.heading,
          fontSize: 44,
          fontWeight: 700,
          letterSpacing: -1,
          color: theme.colors.ink,
          display: 'flex',
          justifyContent: 'center',
          gap: 12,
        }}
      >
        <span>all share</span>
        <span style={{ color: theme.colors.orange }}>three problems.</span>
      </div>

      {/* Problems list — over dimmed article backdrop */}
      <div
        style={{
          position: 'absolute',
          top: 320,
          left: 220,
          right: 220,
          bottom: 100,
          display: 'flex',
          flexDirection: 'column',
          gap: 36,
          justifyContent: 'center',
        }}
      >
        {PROBLEMS.map((p, i) => {
          const appearAt = 80 + i * 22
          const slide = spring({
            frame: frame - appearAt,
            fps,
            config: { damping: 16, mass: 0.6 },
          })

          return (
            <div
              key={i}
              style={{
                opacity: slide * exitOpacity,
                transform: `translateX(${(1 - slide) * -32}px)`,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 28,
                padding: '20px 28px',
                background: 'rgba(254, 252, 253, 0.92)',
                backdropFilter: 'blur(2px)',
                borderRadius: 18,
                border: `1px solid ${theme.colors.divider}`,
                boxShadow: '0 8px 24px rgba(26, 22, 20, 0.08)',
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  background: theme.colors.orange,
                  color: theme.colors.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: theme.fonts.heading,
                  fontSize: 28,
                  fontWeight: 700,
                  flexShrink: 0,
                  boxShadow: `0 6px 16px ${theme.colors.orangeEdge}`,
                  marginTop: 2,
                }}
              >
                {i + 1}
              </div>
              <div>
                <div
                  style={{
                    fontFamily: theme.fonts.heading,
                    fontSize: 36,
                    fontWeight: 700,
                    lineHeight: 1.15,
                    marginBottom: 6,
                    color: theme.colors.ink,
                    letterSpacing: -0.5,
                  }}
                >
                  {p.headline}
                </div>
                <div
                  style={{
                    fontSize: 19,
                    color: theme.colors.inkMuted,
                    lineHeight: 1.4,
                  }}
                >
                  {p.sub}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </AbsoluteFill>
  )
}
