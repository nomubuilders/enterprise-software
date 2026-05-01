import { interpolate, useCurrentFrame } from 'remotion'
import { EASE_ENTER, EASE_EXIT } from './easings'
import { TL, LED_LEVELS, ledStepEndFrame, ROW_BEATS } from './timeline'

// LEDRing · slim torus around the monolith's pedestal. Emissive purple.
// Intensity stepped per row (0.30 → 0.55 → 0.78 → 1.05 → 1.30 → 1.65).
//
// In B10 (morph 372..390), scale ramps 1.0 → 5.0 as a soft purple halo.
// Tuned DOWN from previous 28× full-frame wipe per Phase 2 spec · the new
// hand-off is intimate (single-account framing for CostChart) so the ring
// should not dominate. FinalWipeRing remains as ink-disc backstop.
//
// Geometry: torus radius 0.95, tube 0.04 (slim), 16×64 segs.

export const LEDRing: React.FC = () => {
  const frame = useCurrentFrame()

  // === Establish · the torus body fades in with the stage ===
  const establishP = interpolate(frame, [TL.establishStart, TL.establishEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_ENTER,
  })
  const bodyOpacity = establishP

  // === B2 idle breath · single slow pulse from f48..f78 ===
  let breathBoost = 0
  if (frame >= TL.titleInStart && frame <= TL.titleInEnd) {
    const breathP = (frame - TL.titleInStart) / (TL.titleInEnd - TL.titleInStart)
    breathBoost = Math.sin(breathP * Math.PI) * 0.12
  }

  // === Stepped emissive intensity ===
  let emissive = LED_LEVELS[0] * establishP + breathBoost
  for (let i = 0; i < 5; i++) {
    const prev = LED_LEVELS[i]
    const next = LED_LEVELS[i + 1]
    const stepStart = TL.rowStart[i] + ROW_BEATS.ledStepStart
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

  // === B10 morph · scale 1.0 → 5.0 (was 28 · intimate hand-off framing) ===
  const wipeP =
    frame >= TL.morphStart
      ? interpolate(frame, [TL.morphStart, TL.morphEnd], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: EASE_EXIT,
        })
      : 0
  // Final scale 2.0 (was 5.0 · 5x occluded the cable's morph diagonal at f389
  // because torus at scale 5 covers ~4.8 units around the monolith pedestal,
  // wider than the cable's morph target. 2.0 = soft halo only, no occlusion).
  const scale = interpolate(wipeP, [0, 1], [1.0, 2.0])

  // Position matches new monolith location (1.8, 0.05, 0).
  return (
    <group position={[1.8, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]} scale={scale}>
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
