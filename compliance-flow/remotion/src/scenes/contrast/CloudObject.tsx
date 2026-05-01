import { RoundedBox, MeshDistortMaterial } from '@react-three/drei'
import { useRef } from 'react'
import * as THREE from 'three'
import { interpolate, useCurrentFrame } from 'remotion'
import { EASE_ENTER } from './easings'
import { TL, CLOUD_DISTORT_LEVELS, cloudDistortStepEndFrame } from './timeline'

// CloudObject · the constraint side. Dark teal-black, surface destabilizes
// across the 5 rows via stepped MeshDistortMaterial intensity.
//
// Continuous slow Y rotation expresses "Cloud is unstable, never settled"
// (spec section 3).
//
// Determinism note (spec section 6 failure mode #1): Drei's MeshDistortMaterial
// internally uses useFrame to advance its noise time, which would flicker on
// render. We work around this by setting a custom uniform value `u_time` via
// a ref each render keyed by Remotion frame. The component's `time` prop is
// IGNORED by passing speed=0 and animating ourselves.

export const CloudObject: React.FC = () => {
  const frame = useCurrentFrame()
  const matRef = useRef<typeof MeshDistortMaterial extends React.ForwardRefExoticComponent<infer P> ? P : never>(null) as React.MutableRefObject<any>

  // === Establish entrance ===
  const establishP = interpolate(frame, [TL.establishStart, TL.establishEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_ENTER,
  })
  // Lag the opacity slightly behind the lights (squared)
  const opacity = establishP * establishP
  // Land Y from 0.4 to 0.5
  const yLanded = interpolate(establishP, [0, 1], [0.4, 0.5])
  // Grow scale 0 → 1.0
  const scale = establishP

  // === Continuous slow rotation ===
  const rotationY = frame * 0.0035

  // === Stepped distort intensity ===
  // Base 1.00. Each row's "both hold" sub-beat ramps to next level.
  // We compute the active distort by interpolating from prior level to next level
  // across that row's distort step window.
  let distort = CLOUD_DISTORT_LEVELS[0]
  for (let i = 0; i < 5; i++) {
    const prev = CLOUD_DISTORT_LEVELS[i]
    const next = CLOUD_DISTORT_LEVELS[i + 1]
    // Step window: last 18 frames of the row (the "both hold" beat).
    const stepStart = TL.rowStart[i] + 42
    const stepEnd = cloudDistortStepEndFrame(i)
    const stepP = interpolate(frame, [stepStart, stepEnd], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: EASE_ENTER,
    })
    if (stepP > 0) {
      distort = prev + (next - prev) * stepP
    }
  }

  // === Frame-driven distort time ===
  // We sidestep useFrame() entirely. MeshDistortMaterial accepts `speed` to
  // advance its noise time internally (via useFrame). Setting speed=0 freezes
  // it. Then we manually advance the underlying uniform `time` (or `uTime`,
  // depending on the material implementation) per frame.
  // Drei's distort material exposes the advancing time as `material.time` if
  // we set it; using a ref allows this to be deterministic.
  if (matRef.current) {
    const t = frame * 0.05 // controls noise speed; deterministic
    // Drei's MeshDistortMaterial stores time via uniforms.time
    if (matRef.current.uniforms?.time) {
      matRef.current.uniforms.time.value = t
    }
    // Some Drei builds accept `time` directly as a property
    matRef.current.time = t
  }

  return (
    <group position={[-1.6, yLanded, 0]} rotation={[0, rotationY, 0]} scale={scale}>
      <RoundedBox args={[1.6, 1.0, 1.2]} radius={0.06} smoothness={6} castShadow receiveShadow>
        {/* speed=0 freezes Drei's internal useFrame loop. We drive time externally. */}
        <MeshDistortMaterial
          ref={matRef}
          // Was #1a2c33 · only one luminance step above the #0a0807 bg, which
          // made the cube vanish into the floor in headless render. Lifted to
          // a readable dark teal-blue · still cool / "shadowed" relative to
          // Local's brand purple, but visible at any vignette setting.
          color="#3e5663"
          metalness={0.35}
          roughness={0.55}
          distort={distort * 0.18}
          speed={0}
          transparent
          opacity={opacity}
        />
      </RoundedBox>
    </group>
  )
}
