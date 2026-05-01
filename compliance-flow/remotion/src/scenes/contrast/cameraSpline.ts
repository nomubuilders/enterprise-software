import { interpolate } from 'remotion'
import { EASE_EDITORIAL } from './easings'

// Camera spline · 6 keyframes. Pure function: getCameraState(frame) -> { position, lookAt }.
// Segment-based interpolation with editorial bezier easing.
//
// Justification per spec: editorial in-out for camera (the camera moves like film,
// not like a UI element). Single curve across all segments keeps the orbit feel coherent.

export type Vec3 = [number, number, number]

interface Keyframe {
  frame: number
  position: Vec3
  lookAt: Vec3
}

// Spec section 3 · 6-keyframe spline.
const KEYFRAMES: readonly Keyframe[] = [
  { frame: 8,   position: [ 0.0, 1.4, 7.0], lookAt: [0.0, 0.5, 0.0] }, // K0 · stage entry
  { frame: 60,  position: [-0.6, 1.4, 5.5], lookAt: [0.0, 0.5, 0.0] }, // K1 · 3/4 view, title beat
  { frame: 158, position: [-0.4, 1.5, 5.3], lookAt: [0.0, 0.5, 0.0] }, // K2 · pre-row settle
  { frame: 286, position: [ 0.0, 1.5, 5.0], lookAt: [0.0, 0.5, 0.0] }, // K3 · centered for Row 3
  { frame: 472, position: [ 1.2, 1.5, 4.8], lookAt: [0.6, 0.5, 0.0] }, // K4 · Local-favored hero
  { frame: 568, position: [ 1.6, 1.4, 3.8], lookAt: [1.6, 0.5, 0.0] }, // K5 · through LED ring core
] as const

const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
]

export const getCameraState = (frame: number): { position: Vec3; lookAt: Vec3 } => {
  // Before first keyframe · clamp to K0
  if (frame <= KEYFRAMES[0].frame) {
    return { position: KEYFRAMES[0].position, lookAt: KEYFRAMES[0].lookAt }
  }
  // After last keyframe · clamp to K5
  const last = KEYFRAMES[KEYFRAMES.length - 1]
  if (frame >= last.frame) {
    return { position: last.position, lookAt: last.lookAt }
  }

  // Find segment
  for (let i = 0; i < KEYFRAMES.length - 1; i++) {
    const k0 = KEYFRAMES[i]
    const k1 = KEYFRAMES[i + 1]
    if (frame >= k0.frame && frame <= k1.frame) {
      const t = interpolate(frame, [k0.frame, k1.frame], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: EASE_EDITORIAL,
      })
      return {
        position: lerp3(k0.position, k1.position, t),
        lookAt: lerp3(k0.lookAt, k1.lookAt, t),
      }
    }
  }
  // Fallback (unreachable)
  return { position: last.position, lookAt: last.lookAt }
}
