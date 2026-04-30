import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion'
import { Particles, Spawner, Behavior } from 'remotion-bits'
import { theme } from '../theme'
import { BrandWordmark } from '../components/BrandWordmark'

export const SolutionScene: React.FC = () => {
  const frame = useCurrentFrame()

  const bgOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' })

  const sweepOpacity = interpolate(
    frame,
    [10, 40, 90, 110],
    [0, 0.3, 0.3, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )

  const sweepX = interpolate(frame, [10, 90], [-400, 1920], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const particleOpacity = interpolate(frame, [40, 70, 110, 120], [0, 0.6, 0.6, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 50%, ${theme.colors.purple} 0%, ${theme.colors.black} 70%)`,
        opacity: bgOpacity,
      }}
    >
      {/* Sparkle particles ambient around the logo */}
      <AbsoluteFill style={{ opacity: particleOpacity }}>
        <Particles>
          <Spawner rate={6} max={80}>
            <Behavior type="wiggle" amount={20} />
            <Behavior type="drag" coefficient={0.04} />
          </Spawner>
        </Particles>
      </AbsoluteFill>

      <div
        style={{
          position: 'absolute',
          top: 0,
          left: sweepX,
          width: 600,
          height: '100%',
          background: `linear-gradient(90deg, transparent, ${theme.colors.orange}, transparent)`,
          opacity: sweepOpacity,
          mixBlendMode: 'screen',
        }}
      />

      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <BrandWordmark delay={20} showTagline />
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
