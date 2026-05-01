import { RoundedBox } from '@react-three/drei'
import { interpolate, useCurrentFrame } from 'remotion'
import { EASE_ENTER, EASE_IMPACT } from './easings'
import { TL } from './timeline'

// LocalObject · the answer side. Brand purple, machined, owned.
// Static rotation (does not turn — Local holds its ground per spec section 3).
// Gets a subtle scale "claim" pulse 1.0 → 1.05 after Row 5 lock-in (frame 460).

export const LocalObject: React.FC = () => {
  const frame = useCurrentFrame()

  // === Establish ===
  const establishP = interpolate(frame, [TL.establishStart, TL.establishEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_ENTER,
  })
  const opacity = establishP * establishP
  const yLanded = interpolate(establishP, [0, 1], [0.45, 0.55])

  // === Claim pulse (after Row 5 lock-in) ===
  // Frames 460→490 · scale 1.0 → 1.05 with overshoot bezier.
  const claimP = interpolate(frame, [460, 490], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_IMPACT,
  })
  const claimScale = interpolate(claimP, [0, 1], [1.0, 1.05])

  // Combined scale: establish ramp × claim multiplier
  const scale = establishP * claimScale

  return (
    <group position={[1.6, yLanded, 0]} rotation={[0, 0, 0]} scale={scale}>
      <RoundedBox args={[1.7, 1.05, 1.25]} radius={0.06} smoothness={6} castShadow receiveShadow>
        <meshPhysicalMaterial
          color="#4004DA"
          metalness={0.9}
          roughness={0.15}
          clearcoat={1.0}
          clearcoatRoughness={0.05}
          transparent
          opacity={opacity}
        />
      </RoundedBox>
    </group>
  )
}
