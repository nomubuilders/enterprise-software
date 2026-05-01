import { Easing, interpolate, useCurrentFrame } from 'remotion'
import { TL } from './timeline'

// Monolith · the answer side. Tall purple slab on a thin pedestal.
//
// Mechanics in scope:
//   - B1 establish: slides up from y=-0.6 to y=0.0, opacity 0→1
//   - B2..B9 idle: static (Local holds its ground · stillness IS the punch)
//   - B10 fade out (372..390): opacity → 0
//
// Material: meshPhysicalMaterial · brand purple, machined.
// Box geometry: portrait 1.0 × 1.6 × 0.7 (taller than wide, more "monolith"
// than "lockbox").

const EASE_ENTER = Easing.bezier(0.16, 1, 0.3, 1)
const EASE_EXIT = Easing.bezier(0.7, 0, 0.84, 0)

export const Monolith: React.FC = () => {
  const frame = useCurrentFrame()

  if (frame < TL.establishStart) return null

  const establishP = interpolate(frame, [TL.establishStart, TL.establishEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_ENTER,
  })

  // Slide up from below the floor
  const yPos = interpolate(establishP, [0, 1], [-0.6, 0.0])
  const opacity = establishP * establishP

  // B10 fade out
  const fadeOutP =
    frame >= TL.morphStart
      ? interpolate(frame, [TL.morphStart, TL.morphEnd], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: EASE_EXIT,
        })
      : 0
  const finalOpacity = opacity * (1 - fadeOutP)

  return (
    <group position={[1.8, yPos, 0]}>
      {/* Pedestal · thin disc the monolith sits on */}
      <mesh position={[0, 0.02, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.7, 0.7, 0.04, 32]} />
        <meshStandardMaterial
          color="#181513"
          metalness={0.6}
          roughness={0.45}
          transparent
          opacity={finalOpacity}
        />
      </mesh>

      {/* Monolith · brand purple slab */}
      <mesh position={[0, 0.84, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.0, 1.6, 0.7]} />
        <meshPhysicalMaterial
          color="#4004DA"
          metalness={0.92}
          roughness={0.18}
          clearcoat={1.0}
          clearcoatRoughness={0.05}
          transparent
          opacity={finalOpacity}
        />
      </mesh>
    </group>
  )
}
