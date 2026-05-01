import { interpolate } from 'remotion'
import { EASE_EDITORIAL } from './easings'

// Camera spline for ContrastScene Part 1 · "The Leash".
// Pure function: getCameraState(frame) -> { position, lookAt }.
//
// Phase 2 §3 camera math:
//   K0 establish entry (f6) → K1 establish settle (f48) → hold through B9 (f372)
//   → K2 morph dolly along the cable (f390 · intimate single-line framing).
//
// The camera is mostly static so the choreography on the orb/monolith reads
// without distraction. Only the establish push-in (6%) and the f372..f390
// dolly are non-trivial moves. Editorial bezier across all segments.

export type Vec3 = [number, number, number]

interface Keyframe {
  frame: number
  position: Vec3
  lookAt: Vec3
}

// Cable/orb live around (-1.8, 1.6, 0). Monolith around (1.8, 0.7, 0).
// Default camera frames the pair across center.
//
// Camera holds at K1 (0, 1.4, 6.9) lookAt (0, 0.7, 0) from f48 through f390.
// The cable's morph target line was sized to FIT inside this framing
// (cableCurve.ts COST_TARGET) so no dolly is needed at the hand-off · the
// orange line resolves into view at the same camera the rest of the scene
// has been holding. Steady camera + everything else fading out makes the
// final orange line the only focal point.
const KEYFRAMES: readonly Keyframe[] = [
  { frame: 6,   position: [0.0, 1.4, 7.4], lookAt: [0.0, 0.7, 0.0] }, // K0 stage entry
  { frame: 48,  position: [0.0, 1.4, 6.9], lookAt: [0.0, 0.7, 0.0] }, // K1 establish settle
  { frame: 390, position: [0.0, 1.4, 6.9], lookAt: [0.0, 0.7, 0.0] }, // hold through morph
] as const

const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
]

export const getCameraState = (frame: number): { position: Vec3; lookAt: Vec3 } => {
  if (frame <= KEYFRAMES[0].frame) {
    return { position: KEYFRAMES[0].position, lookAt: KEYFRAMES[0].lookAt }
  }
  const last = KEYFRAMES[KEYFRAMES.length - 1]
  if (frame >= last.frame) {
    return { position: last.position, lookAt: last.lookAt }
  }

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
  return { position: last.position, lookAt: last.lookAt }
}
