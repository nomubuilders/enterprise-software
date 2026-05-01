import { useRef } from 'react'
import * as THREE from 'three'
import { Easing, interpolate, useCurrentFrame } from 'remotion'
import { TL } from './timeline'

// AuditTicks · 5 thin glowing rectangles on the right edge of the monolith.
// Reveals one-by-one across B7 (row 4 · "every step is evidence"). Each tick
// = one audit checkpoint. Visual reads as "evidence accumulates."
//
// Mechanics:
//   - Tick i appears at frame 294 + i*5 over 4 frames.
//   - All five hold visible from f314 to morph start.
//   - B10 fade out (372..390): all opacity → 0.

const EASE_ENTER = Easing.bezier(0.16, 1, 0.3, 1)
const EASE_EXIT = Easing.bezier(0.7, 0, 0.84, 0)

const TICK_COUNT = 5
const TICK_REVEAL_START = 294

interface TickProps {
  index: number
  fadeOutP: number
}

const Tick: React.FC<TickProps> = ({ index, fadeOutP }) => {
  const frame = useCurrentFrame()
  const matRef = useRef<THREE.MeshStandardMaterial>(null)

  const startFrame = TICK_REVEAL_START + index * 5
  const tickP = interpolate(frame, [startFrame, startFrame + 4], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_ENTER,
  })

  // Reveal opacity attenuated by the global fadeOutP from B10
  const opacity = tickP * (1 - fadeOutP)
  const emissive = tickP * 0.6 * (1 - fadeOutP)

  if (frame < startFrame) return null

  // Tick world position · monolith right face (x = 1.8 + 1.0/2 = 2.3) plus
  // a small forward offset for clearance. y stacks from 0.45 to 1.05 (5 ticks
  // × 0.15 spacing).
  const x = 2.36
  const yBase = 0.45
  const ySpacing = 0.15
  const y = yBase + index * ySpacing
  const z = 0.0

  return (
    <mesh position={[x, y, z]}>
      <boxGeometry args={[0.04, 0.06, 0.02]} />
      <meshStandardMaterial
        ref={matRef}
        color="#4004DA"
        emissive="#7C4DFF"
        emissiveIntensity={emissive}
        transparent
        opacity={opacity}
        toneMapped={false}
      />
    </mesh>
  )
}

export const AuditTicks: React.FC = () => {
  const frame = useCurrentFrame()

  if (frame < TICK_REVEAL_START) return null

  const fadeOutP =
    frame >= TL.morphStart
      ? interpolate(frame, [TL.morphStart, TL.morphEnd], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: EASE_EXIT,
        })
      : 0

  return (
    <>
      {Array.from({ length: TICK_COUNT }).map((_, i) => (
        <Tick key={i} index={i} fadeOutP={fadeOutP} />
      ))}
    </>
  )
}
