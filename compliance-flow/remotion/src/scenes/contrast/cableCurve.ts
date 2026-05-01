import * as THREE from 'three'
import { Easing, interpolate } from 'remotion'
import { TL, yankStartFrame } from './timeline'

// Cable curve sampler · pure function of `frame` returning the 5 control
// points the cable's CatmullRomCurve3 should use this frame.
//
// Why a shared module: the cable mesh AND the particle siphon both need the
// SAME curve to look correct (particles must travel along the cable visibly).
// Single source of truth keeps them in lockstep.

export type Vec3 = [number, number, number]

const EASE_IMPACT = Easing.bezier(0.34, 1.56, 0.64, 1)
const EASE_ENTER = Easing.bezier(0.16, 1, 0.3, 1)
const EASE_EXIT = Easing.bezier(0.7, 0, 0.84, 0)
const EASE_MORPH = Easing.bezier(0.45, 0, 0.55, 1)

// Base 5 control points · cable disappears off-frame at the top, drapes down
// to the orb's top at (-1.8, 2.0, 0). Slight S-curve for organic drape.
const BASE: readonly Vec3[] = [
  [0.0, 6.5, 0.0],
  [-0.4, 5.0, 0.1],
  [-0.9, 3.7, -0.1],
  [-1.4, 2.7, 0.05],
  [-1.8, 2.0, 0.0],
]

// B10 morph target · single straight diagonal line. 5 points still kept so
// the CatmullRomCurve3 has consistent control-point count; placed on a
// straight diagonal so the curve degenerates to a line.
//
// Sized to FIT inside the K1 camera framing (camera at z=6.9, fov=32 →
// visible width ~3.9 units, height ~2.2 units around lookAt y=0.7). Line
// spans (-1.0, 2.0) to (1.6, 0.6) · about 2.6 units diagonal, fully visible
// without any dolly. This was originally a 4-unit line spanning to (2.6,0.4)
// which exited the frustum at K1; the dolly attempt to follow it pushed the
// orange line off-screen at the f390 hand-off.
const COST_TARGET: readonly Vec3[] = [
  [-1.0, 2.0, 0.0],
  [-0.35, 1.65, 0.0],
  [0.3, 1.3, 0.0],
  [0.95, 0.95, 0.0],
  [1.6, 0.6, 0.0],
]

const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
]

// Idle sway (B2..B9). Returns the orb's swayAngle in radians, ~3°.
// Used both for cable bottom-control offsets and orb rotation.
export const getSwayAngle = (frame: number): number => {
  if (frame < TL.titleInStart || frame > TL.morphStart) return 0
  return Math.sin(frame * 0.18) * 0.052
}

// Computes the live 5 control points for the cable at the given frame.
// Caller passes points to a CatmullRomCurve3.
export const getCableControlPoints = (frame: number): Vec3[] => {
  // === B1 establish · cable extends from top to bottom ===
  // We don't actually shorten the curve · we keep all 5 control points
  // alive but lerp the bottom 3 from "tucked above" positions to their
  // base positions. Visually reads as the cable lowering into the orb.
  let pts: Vec3[] = BASE.map((p) => [p[0], p[1], p[2]])

  if (frame < TL.establishStart) {
    // Pre-establish · cable not visible yet (caller should hide mesh)
    pts = BASE.map((p, i) => (i < 2 ? [p[0], p[1], p[2]] : [p[0], 6.5, p[2]]))
    return pts
  }

  if (frame >= TL.establishStart && frame < TL.establishEnd) {
    const extP = interpolate(frame, [TL.establishStart, TL.establishEnd], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: EASE_ENTER,
    })
    // Bottom 3 points lerp from "all bunched at y=6.5" to BASE positions
    pts = BASE.map((p, i) => {
      if (i < 2) return [p[0], p[1], p[2]]
      const tucked: Vec3 = [p[0], 6.5, p[2]]
      return lerp3(tucked, p as Vec3, extP)
    })
    return pts
  }

  // === Idle sway (B2..B9) · bottom 2 points track orb position ===
  const sway = getSwayAngle(frame)
  pts[3] = [pts[3]![0] + sway * 0.5, pts[3]![1], pts[3]![2]]
  pts[4] = [pts[4]![0] + sway * 0.7, pts[4]![1], pts[4]![2]]

  // === Per-row yanks (B4 · row 1 only · gentle yank) ===
  // Row 1 yanks frame 120..134 (yankStartFrame(0) is 120)
  const r1Yank = yankStartFrame(0) // 120
  if (frame >= r1Yank && frame <= r1Yank + 14) {
    const yankP = interpolate(frame, [r1Yank, r1Yank + 6], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: EASE_IMPACT,
    })
    const recoverP = interpolate(frame, [r1Yank + 6, r1Yank + 14], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: EASE_ENTER,
    })
    const yank = yankP * (1 - recoverP)
    pts[3] = [pts[3]![0] + yank * 0.12, pts[3]![1] - yank * 0.05, pts[3]![2]]
    pts[4] = [pts[4]![0] + yank * 0.12, pts[4]![1] - yank * 0.05, pts[4]![2]]
  }

  // === B6 sag (row 3 · cable droops as orb dims and shrinks) ===
  // Frames 228..250
  if (frame >= 228) {
    const sagP = interpolate(frame, [228, 250], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: EASE_EXIT,
    })
    pts[3] = [pts[3]![0], pts[3]![1] - sagP * 0.08, pts[3]![2]]
    pts[4] = [pts[4]![0], pts[4]![1] - sagP * 0.17, pts[4]![2]]
  }

  // === B10 morph · lerp all 5 control points to COST_TARGET ===
  if (frame >= TL.morphStart) {
    const morphP = interpolate(frame, [TL.morphStart, TL.morphEnd], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: EASE_MORPH,
    })
    pts = pts.map((p, i) => lerp3(p, COST_TARGET[i] as Vec3, morphP))
  }

  return pts
}

// Convenience · build a Three.js CatmullRomCurve3 from the live points.
export const getCableCurve = (frame: number): THREE.CatmullRomCurve3 => {
  const pts = getCableControlPoints(frame).map(
    (p) => new THREE.Vector3(p[0], p[1], p[2]),
  )
  return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5)
}
