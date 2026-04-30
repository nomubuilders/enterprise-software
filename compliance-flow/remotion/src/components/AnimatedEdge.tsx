import { useCurrentFrame, interpolate } from 'remotion'
import { theme } from '../theme'

interface Props {
  from: { x: number; y: number }
  to: { x: number; y: number }
  startAt: number
  durationInFrames?: number
  color?: string
}

export const AnimatedEdge: React.FC<Props> = ({
  from,
  to,
  startAt,
  durationInFrames = 18,
  color = theme.colors.cyan,
}) => {
  const frame = useCurrentFrame()

  const progress = interpolate(
    frame - startAt,
    [0, durationInFrames],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )

  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.sqrt(dx * dx + dy * dy)

  // Bezier curve with slight horizontal-first bias for the "flowy" workflow look
  const cp1x = from.x + dx * 0.5
  const cp1y = from.y
  const cp2x = from.x + dx * 0.5
  const cp2y = to.y

  const path = `M ${from.x} ${from.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${to.x} ${to.y}`

  const dashOffset = interpolate(frame, [0, 60], [0, -40], {
    extrapolateRight: 'identity',
  })

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    >
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray={length}
        strokeDashoffset={length * (1 - progress)}
        opacity={progress > 0 ? 0.95 : 0}
        style={{ filter: `drop-shadow(0 0 8px ${color})` }}
      />
      {progress >= 1 && (
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeDasharray="6 12"
          strokeDashoffset={dashOffset}
          opacity={0.6}
        />
      )}
    </svg>
  )
}
