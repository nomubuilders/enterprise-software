import { interpolate, useCurrentFrame } from 'remotion'
import { EASE_ENTER, EASE_EXIT } from './easings'
import { TL, LED_LEVELS, ledStepEndFrame } from './timeline'

// LEDRing · slim torus around Local's base. Emissive purple.
// Intensity stepped per row (0.30 → 0.64 → 0.98 → 1.32 → 1.66 → 2.00).
// In B10 (wipe), scale ramps 1.0 → 28.0 to fill the frame.
//
// Per spec section 3, geometry: torus radius 0.95, tube 0.04 (slim), 16×64 segs.

export const LEDRing: React.FC = () => {
  const frame = useCurrentFrame()

  // === Establish · the torus body fades in with the stage ===
  const establishP = interpolate(frame, [TL.establishStart, TL.establishEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_ENTER,
  })
  const bodyOpacity = establishP

  // === Stepped emissive intensity ===
  // Base level applied from establish onward, then each row's LED step ramps
  // up to the next level.
  let emissive = LED_LEVELS[0] * establishP // ramps in with establish
  for (let i = 0; i < 5; i++) {
    const prev = LED_LEVELS[i]
    const next = LED_LEVELS[i + 1]
    const stepStart = TL.rowStart[i] + 34 // ledStepStart relative offset
    const stepEnd = ledStepEndFrame(i)
    const stepP = interpolate(frame, [stepStart, stepEnd], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: EASE_ENTER,
    })
    if (stepP > 0) {
      emissive = prev + (next - prev) * stepP
    }
  }

  // === B10 wipe · scale 1.0 → 28.0 ===
  const wipeP = interpolate(frame, [TL.wipeStart, TL.wipeStart + 58], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_EXIT, // accelerate-in: ring snaps shut
  })
  const scale = interpolate(wipeP, [0, 1], [1.0, 28.0])

  return (
    <group position={[1.6, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]} scale={scale}>
      <mesh>
        <torusGeometry args={[0.95, 0.04, 16, 64]} />
        <meshStandardMaterial
          color="#1a0030"
          emissive="#7C4DFF"
          emissiveIntensity={emissive}
          metalness={0.4}
          roughness={0.3}
          transparent
          opacity={bodyOpacity}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}
