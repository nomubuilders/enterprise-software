import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion'
import { AnimatedText, MatrixRain } from 'remotion-bits'
import { theme } from '../theme'

const PROBLEMS = [
  {
    headline: 'Your data leaves the perimeter.',
    sub: 'Every cloud LLM call ships your prompt to someone else’s GPU.',
  },
  {
    headline: 'There is no audit trail.',
    sub: 'Regulators ask what the model saw. Cloud APIs return a string.',
  },
  {
    headline: 'The model is a black box.',
    sub: 'You can’t sign off on a decision you can’t reproduce.',
  },
]

export const HookScene: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const matrixOpacity = interpolate(frame, [0, 24, 156, 180], [0, 0.35, 0.35, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const titleExit = interpolate(frame, [156, 180], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 30% 20%, ${theme.colors.darkGray}, ${theme.colors.black})`,
        fontFamily: theme.fonts.body,
        color: theme.colors.offWhite,
      }}
    >
      {/* Data-leaving-the-perimeter aesthetic — Matrix rain tinted with brand purple */}
      <AbsoluteFill style={{ opacity: matrixOpacity, mixBlendMode: 'screen' }}>
        <MatrixRain
          fontSize={20}
          color={theme.colors.purple}
          speed={1.4}
          density={0.85}
          streamLength={18}
        />
      </AbsoluteFill>

      <div
        style={{
          position: 'absolute',
          top: 120,
          left: 0,
          right: 0,
          textAlign: 'center',
          opacity: titleExit,
          fontFamily: theme.fonts.heading,
          fontSize: 64,
          fontWeight: 700,
          letterSpacing: -1,
        }}
      >
        <AnimatedText
          transition={{
            split: 'character',
            splitStagger: 1,
            opacity: [0, 1],
            translateY: [20, 0],
            duration: 24,
          }}
        >
          Cloud AI has <span style={{ color: theme.colors.orange }}>three problems.</span>
        </AnimatedText>
      </div>

      <div
        style={{
          position: 'absolute',
          top: 280,
          left: 160,
          right: 160,
          bottom: 120,
          display: 'flex',
          flexDirection: 'column',
          gap: 40,
          justifyContent: 'center',
        }}
      >
        {PROBLEMS.map((p, i) => {
          const appearAt = 30 + i * 40
          const exitAt = 156

          const slide = spring({
            frame: frame - appearAt,
            fps,
            config: { damping: 16, mass: 0.6 },
          })

          const exitOpacity = interpolate(frame, [exitAt, exitAt + 20], [1, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })

          return (
            <div
              key={i}
              style={{
                opacity: slide * exitOpacity,
                transform: `translateX(${(1 - slide) * -40}px)`,
                display: 'flex',
                alignItems: 'center',
                gap: 32,
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 18,
                  background: theme.colors.orange,
                  color: theme.colors.offWhite,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: theme.fonts.heading,
                  fontSize: 40,
                  fontWeight: 700,
                  flexShrink: 0,
                  boxShadow: `0 0 24px ${theme.colors.orangeEdge}`,
                }}
              >
                {i + 1}
              </div>
              <div>
                <div
                  style={{
                    fontFamily: theme.fonts.heading,
                    fontSize: 44,
                    fontWeight: 700,
                    lineHeight: 1.1,
                    marginBottom: 8,
                  }}
                >
                  {p.headline}
                </div>
                <div
                  style={{
                    fontSize: 22,
                    color: theme.colors.grayMuted,
                    maxWidth: 1100,
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
