import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion'
import { theme } from '../theme'
import { BrandWordmark } from '../components/BrandWordmark'

export const SolutionScene: React.FC = () => {
  const frame = useCurrentFrame()

  const bgOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' })

  // Soft purple sweep — ambient brand presence on light bg
  const sweepX = interpolate(frame, [10, 90], [-400, 1920], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const sweepOpacity = interpolate(
    frame,
    [10, 40, 90, 110],
    [0, 0.15, 0.15, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 50%, ${theme.colors.bg} 0%, ${theme.colors.bgSubtle} 70%, ${theme.colors.bgEdge} 100%)`,
        opacity: bgOpacity,
      }}
    >
      {/* Soft ambient brand wash */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: sweepX,
          width: 800,
          height: '100%',
          background: `linear-gradient(90deg, transparent, ${theme.colors.purpleSoft}, transparent)`,
          opacity: sweepOpacity,
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
