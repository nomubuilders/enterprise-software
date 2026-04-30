import { useCurrentFrame, spring, useVideoConfig, interpolate } from 'remotion'
import { theme } from '../theme'

interface Props {
  label: string
  sublabel?: string
  accent: string
  appearAt: number
  x: number
  y: number
  active?: boolean
  activeAt?: number
}

export const WorkflowNode: React.FC<Props> = ({
  label,
  sublabel,
  accent,
  appearAt,
  x,
  y,
  active,
  activeAt,
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const appear = spring({
    frame: frame - appearAt,
    fps,
    config: { damping: 14, mass: 0.5 },
  })

  const activeProgress =
    active && activeAt !== undefined
      ? interpolate(frame - activeAt, [0, 12], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 0

  const shadowSize = interpolate(activeProgress, [0, 1], [10, 28])
  const shadowAlpha = interpolate(activeProgress, [0, 1], [0.08, 0.22])

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `translate(-50%, -50%) scale(${appear})`,
        opacity: appear,
        width: 220,
        padding: '20px 24px',
        borderRadius: 18,
        background: theme.colors.bg,
        border: `2px solid ${hexToRgba(accent, 0.85)}`,
        boxShadow: `0 ${shadowSize / 2}px ${shadowSize * 1.5}px rgba(26, 22, 20, ${shadowAlpha})`,
        fontFamily: theme.fonts.body,
        color: theme.colors.ink,
      }}
    >
      <div
        style={{
          fontFamily: theme.fonts.heading,
          fontSize: 22,
          fontWeight: 700,
          color: accent,
          marginBottom: sublabel ? 6 : 0,
          letterSpacing: 0.5,
        }}
      >
        {label}
      </div>
      {sublabel && (
        <div
          style={{
            fontSize: 14,
            color: theme.colors.inkMuted,
            letterSpacing: 0.5,
          }}
        >
          {sublabel}
        </div>
      )}
    </div>
  )
}

function hexToRgba(hex: string, alpha: number): string {
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) return hex
  const v = hex.replace('#', '')
  const r = parseInt(v.slice(0, 2), 16)
  const g = parseInt(v.slice(2, 4), 16)
  const b = parseInt(v.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
