import { useRef } from 'react'
import * as THREE from 'three'
import { Easing, interpolate, useCurrentFrame } from 'remotion'
import { TL } from './timeline'
import { getSwayAngle } from './cableCurve'

// Orb · the constraint side. Held at the end of the cable.
//
// Mechanics in scope:
//   - B1 establish (6..48): scale 0→0.62, opacity 0→1, materializes mid-air at
//     world (-1.8, 1.45, 0)
//   - B2..B5 idle: cable-tension sway (matches getSwayAngle from cableCurve)
//   - B6 dim (228..250): emissive 0.55→0.18, scale 0.62→0.48, position.y sags
//   - B8 fog (332..354): transmission 0.35→0.0, emissive 0.18→0.05
//   - B10 fade out (372..390): opacity → 0
//
// Material: meshPhysicalMaterial with transmission for "held smoke" feel.
// Headless-safe: transmission renders with the standard renderer pipeline,
// no envmap dependency · the direct lights from Lights.tsx provide the
// illumination signature.

const EASE_ENTER = Easing.bezier(0.16, 1, 0.3, 1)
const EASE_EXIT = Easing.bezier(0.7, 0, 0.84, 0)
const EASE_EDITORIAL = Easing.bezier(0.45, 0, 0.55, 1)

export const Orb: React.FC = () => {
  const frame = useCurrentFrame()
  const matRef = useRef<THREE.MeshPhysicalMaterial>(null)

  if (frame < TL.establishStart) return null

  // === Establish ===
  const establishP = interpolate(frame, [TL.establishStart, TL.establishEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_ENTER,
  })
  const baseOpacity = establishP * establishP
  const baseScale = establishP * 0.62

  // === Idle sway · same source-of-truth as cable bottom control points ===
  const sway = getSwayAngle(frame)

  // === B6 dim (frames 228..250) ===
  const dimP =
    frame >= 228
      ? interpolate(frame, [228, 250], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: EASE_EXIT,
        })
      : 0
  const dimEmissive = interpolate(dimP, [0, 1], [0.55, 0.18])
  const dimScale = interpolate(dimP, [0, 1], [1.0, 0.78]) // 0.62 * 0.78 = 0.48
  const dimYOffset = interpolate(dimP, [0, 1], [0, -0.13])

  // === B8 fog (frames 332..354) ===
  const fogP =
    frame >= 332
      ? interpolate(frame, [332, 354], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: EASE_EDITORIAL,
        })
      : 0
  const fogTransmission = interpolate(fogP, [0, 1], [0.35, 0.0])
  const fogEmissiveMult = interpolate(fogP, [0, 1], [1.0, 0.28])

  // === B10 fade out (frames 372..390) ===
  const fadeOutP =
    frame >= TL.morphStart
      ? interpolate(frame, [TL.morphStart, TL.morphEnd], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: EASE_EXIT,
        })
      : 0

  // === Composition ===
  const finalScale = baseScale * dimScale
  const finalOpacity = baseOpacity * (1 - fadeOutP)
  const finalEmissive = dimEmissive * fogEmissiveMult
  const finalY = 1.45 + dimYOffset

  // World position offset on x derived from sway so the orb visually hangs
  // from the cable end (cable's bottom control point also tracks sway).
  const finalX = -1.8 + sway * 0.7

  // Pass animated values as props · React reconciles deterministically.
  // The earlier ref-mutate-in-render-body pattern fails in Remotion's
  // mount-per-frame model (ref is null when render body executes).

  return (
    <group position={[finalX, finalY, 0]} rotation={[0, 0, sway]} scale={finalScale}>
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[0.55, 48, 32]} />
        <meshPhysicalMaterial
          ref={matRef}
          color="#3a5663"
          emissive="#5a7d8c"
          emissiveIntensity={finalEmissive}
          metalness={0.15}
          roughness={0.65}
          transmission={fogTransmission}
          thickness={0.4}
          transparent
          opacity={finalOpacity}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}
