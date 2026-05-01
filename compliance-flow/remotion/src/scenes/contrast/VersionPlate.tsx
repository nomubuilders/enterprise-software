import { useRef } from 'react'
import * as THREE from 'three'
import { Easing, interpolate, useCurrentFrame } from 'remotion'
import { TL } from './timeline'
import { VERSION_PLATE_TEXTURES } from './leashCanvasTextures'

// VersionPlate · laser-engraved plate on the front face of the monolith.
//
// Renders the version text as a CanvasTexture-backed plane (no Drei <Text>,
// no troika dependency · headless-safe).
//
// Mechanics in scope:
//   - B4 etch #1 appear (132..144): emissive 0 → 0.85, opacity 0 → 1
//   - B5 etch #2 swap (188): swap canvas texture from "v3.2.1" → detail line,
//     brief flicker on emissive
//   - B6 etch #3 brighten (240..252): emissive 0.85 → 1.5 (with overshoot)
//   - B10 fade out (372..390): opacity → 0
//
// Position: in front of monolith's front face. Monolith box center is
// (1.8, 0.84, 0) with depth 0.7, so front face is at z = 0.35. Plate
// sits at z = 0.36 (1 unit forward) so it floats slightly off the surface
// and catches its own lighting.

const EASE_ENTER = Easing.bezier(0.16, 1, 0.3, 1)
const EASE_IMPACT = Easing.bezier(0.34, 1.56, 0.64, 1)
const EASE_EXIT = Easing.bezier(0.7, 0, 0.84, 0)

// Frame ranges
const ETCH_APPEAR_START = 132
const ETCH_APPEAR_END = 144
const ETCH_SWAP_FRAME = 188
const ETCH_BRIGHTEN_START = 240
const ETCH_BRIGHTEN_END = 252

// Active texture index based on row · 0 for rows 1, 1+ for rows 2..5.
const getActiveTextureIndex = (frame: number): number => {
  if (frame < ETCH_SWAP_FRAME) return 0
  return 1
}

export const VersionPlate: React.FC = () => {
  const frame = useCurrentFrame()
  const matRef = useRef<THREE.MeshStandardMaterial>(null)

  if (frame < ETCH_APPEAR_START) return null

  // === Appear (132..144) ===
  const appearP = interpolate(frame, [ETCH_APPEAR_START, ETCH_APPEAR_END], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_ENTER,
  })

  // === Brighten (240..252) ===
  const brightenP =
    frame >= ETCH_BRIGHTEN_START
      ? interpolate(frame, [ETCH_BRIGHTEN_START, ETCH_BRIGHTEN_END], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: EASE_IMPACT,
        })
      : 0

  // === Brief flicker on swap (frame 188..190) ===
  let flickerMult = 1
  if (frame >= ETCH_SWAP_FRAME && frame <= ETCH_SWAP_FRAME + 2) {
    flickerMult = 0.55
  }

  // === Base emissive · ramps to 0.85 then to 1.5 ===
  const baseEmissive = interpolate(brightenP, [0, 1], [0.85, 1.5])
  const emissiveIntensity = appearP * baseEmissive * flickerMult

  // === B10 fade out ===
  const fadeOutP =
    frame >= TL.morphStart
      ? interpolate(frame, [TL.morphStart, TL.morphEnd], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: EASE_EXIT,
        })
      : 0

  const finalOpacity = appearP * (1 - fadeOutP)
  const textureIndex = getActiveTextureIndex(frame)
  const activeTexture = VERSION_PLATE_TEXTURES[textureIndex]

  // Animated values applied as props · React reconciles deterministically.
  // Earlier ref-mutate pattern misses Remotion's mount-per-frame model.

  // Plane sits in front of the monolith front face. Monolith front-face z
  // is 0.7/2 = 0.35 from monolith center; monolith center is at world (1.8,
  // 0.84, 0). Plate sits at world (1.8, 1.05, 0.36) · slightly above center
  // for upper-third placement on the slab.
  return (
    <mesh position={[1.8, 1.15, 0.36]} rotation={[0, 0, 0]}>
      <planeGeometry args={[0.55, 0.12]} />
      <meshStandardMaterial
        ref={matRef}
        map={activeTexture as THREE.Texture}
        emissiveMap={activeTexture as THREE.Texture}
        emissive="#7C4DFF"
        emissiveIntensity={emissiveIntensity}
        transparent
        opacity={finalOpacity}
        toneMapped={false}
      />
    </mesh>
  )
}
