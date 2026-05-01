import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Easing, interpolate, useCurrentFrame } from 'remotion'
import { TL } from './timeline'

// ExplainabilityGrid · faint white grid lines overlaid on the monolith front
// face during B8 (row 5 · "built-in explainability"). 3 vertical + 3
// horizontal short segments. Reads as "the structure is visible."
//
// Mechanics:
//   - Reveal across frames 342..360 · opacity ramps 0 → 0.35
//   - B10 fade out (372..390): opacity → 0
//
// Implementation: <lineSegments> with a <bufferGeometry> built once at
// module scope from a flat positions array. lineBasicMaterial honors
// `transparent` and `opacity`.

const EASE_ENTER = Easing.bezier(0.16, 1, 0.3, 1)
const EASE_EXIT = Easing.bezier(0.7, 0, 0.84, 0)

const REVEAL_START = 342
const REVEAL_END = 360

// 3 vertical and 3 horizontal segments inside a 0.6 × 0.9 area (smaller than
// monolith front face 1.0 × 1.6 so the grid sits inside).
const buildPositions = (): Float32Array => {
  const positions: number[] = []
  const w = 0.6
  const h = 0.9
  // Vertical lines · 3 of them at x ∈ {-w/3, 0, +w/3}
  const vXs = [-w / 3, 0, w / 3]
  for (const x of vXs) {
    positions.push(x, -h / 2, 0, x, h / 2, 0)
  }
  // Horizontal lines · 3 of them at y ∈ {-h/3, 0, +h/3}
  const hYs = [-h / 3, 0, h / 3]
  for (const y of hYs) {
    positions.push(-w / 2, y, 0, w / 2, y, 0)
  }
  return new Float32Array(positions)
}

const POSITIONS = buildPositions()

export const ExplainabilityGrid: React.FC = () => {
  const frame = useCurrentFrame()
  const matRef = useRef<THREE.LineBasicMaterial>(null)

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(POSITIONS, 3))
    return geo
  }, [])

  if (frame < REVEAL_START) return null

  const revealP = interpolate(frame, [REVEAL_START, REVEAL_END], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_ENTER,
  })

  const fadeOutP =
    frame >= TL.morphStart
      ? interpolate(frame, [TL.morphStart, TL.morphEnd], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: EASE_EXIT,
        })
      : 0

  const opacity = revealP * 0.35 * (1 - fadeOutP)
  // Opacity applied via prop below · ref-mutation in render body misses
  // Remotion's mount-per-frame model.

  // Grid sits on the monolith front face just below the version plate.
  // Monolith center (1.8, 0.84, 0), front face z=0.35. Grid at z=0.361 so
  // it floats just in front of the version plate's z=0.36.
  return (
    <lineSegments geometry={geometry} position={[1.8, 0.6, 0.361]}>
      <lineBasicMaterial
        ref={matRef}
        color="#FEFCFD"
        transparent
        opacity={opacity}
        toneMapped={false}
      />
    </lineSegments>
  )
}
