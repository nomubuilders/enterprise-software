import { useMemo, useRef, useLayoutEffect } from 'react'
import * as THREE from 'three'
import { Easing, interpolate, useCurrentFrame } from 'remotion'
import { TL } from './timeline'
import { getCableCurve } from './cableCurve'

// Cable · the leash. Tube along a CatmullRomCurve3, sampled per frame.
//
// Mechanics in scope (all driven by useCurrentFrame, no useFrame):
//   - B1 establish: mesh visible, geometry rebuilt as control points lerp in
//   - B2..B9 idle: organic sway, occasional yanks (handled by curve module)
//   - B7 fog (frames 282..318): alphaMap noise modulates · cable surface
//     looks turbulent and partially translucent ("can't see what flows")
//   - B10 morph (372..390): color & emissive flip dark→orange, tube radius
//     thickens 0.045→0.18, curve straightens to diagonal
//
// Per-frame tube geometry strategy:
// We allocate ONE TubeGeometry up front with N tubular segments × M radial
// segments, then mutate its position attribute in place each frame using
// the live curve. This avoids per-frame allocations and matches the
// rules/3d.md determinism constraint (no useFrame, no internal animation).

const EASE_ENTER = Easing.bezier(0.16, 1, 0.3, 1)
const EASE_MORPH = Easing.bezier(0.45, 0, 0.55, 1)

// Tube geometry resolution. 96 tubular × 12 radial = 2304 verts. Cheap.
const TUBULAR_SEGMENTS = 96
const RADIAL_SEGMENTS = 12

const ALPHA_W = 32
const ALPHA_H = 128
const ALPHA_PIXEL_COUNT = ALPHA_W * ALPHA_H

// Pre-built solid alpha (255 everywhere). Used outside the fog window so we
// don't pay for a per-frame texture upload when nothing is actually changing.
const buildSolidAlphaData = (): Uint8Array => {
  const data = new Uint8Array(ALPHA_PIXEL_COUNT * 4)
  for (let i = 0; i < ALPHA_PIXEL_COUNT; i++) {
    data[i * 4 + 0] = 255
    data[i * 4 + 1] = 255
    data[i * 4 + 2] = 255
    data[i * 4 + 3] = 255
  }
  return data
}

const SOLID_ALPHA_DATA = buildSolidAlphaData()

// Linear-RGB color interpolation. Three.js Color.lerpColors works in linear
// when called on Color instances · safe for material.color and material.emissive.
const colorLerp = (a: THREE.Color, b: THREE.Color, t: number): THREE.Color => {
  return new THREE.Color().lerpColors(a, b, t)
}

const COLOR_DARK = new THREE.Color('#2a2622')
const COLOR_ORANGE = new THREE.Color('#FF6C1D')
const COLOR_BLACK = new THREE.Color('#000000')

export const Cable: React.FC = () => {
  const frame = useCurrentFrame()
  const meshRef = useRef<THREE.Mesh>(null)
  const matRef = useRef<THREE.MeshStandardMaterial>(null)

  // === Tube geometry · allocate once, mutate per frame ===
  // We build a placeholder curve once to size the geometry buffers, then
  // each frame we rewrite the position attribute from the live curve.
  const geometry = useMemo(() => {
    const placeholderCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 6.5, 0),
      new THREE.Vector3(-0.4, 5.0, 0),
      new THREE.Vector3(-0.9, 3.7, 0),
      new THREE.Vector3(-1.4, 2.7, 0),
      new THREE.Vector3(-1.8, 2.0, 0),
    ])
    return new THREE.TubeGeometry(
      placeholderCurve,
      TUBULAR_SEGMENTS,
      0.045,
      RADIAL_SEGMENTS,
      false,
    )
  }, [])

  // === Alpha texture · DataTexture mutated per frame in fog window ===
  const alphaTexture = useMemo(() => {
    const data = new Uint8Array(SOLID_ALPHA_DATA)
    const tex = new THREE.DataTexture(data, ALPHA_W, ALPHA_H, THREE.RGBAFormat)
    tex.needsUpdate = true
    return tex
  }, [])

  // === Per-frame visibility ===
  if (frame < TL.establishStart) {
    return null
  }

  // === Establish opacity · ramps with the rest of the stage ===
  const establishP = interpolate(frame, [TL.establishStart, TL.establishEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_ENTER,
  })

  // === B10 morph progress ===
  const morphP =
    frame >= TL.morphStart
      ? interpolate(frame, [TL.morphStart, TL.morphEnd], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: EASE_MORPH,
        })
      : 0

  // === Tube radius · thickens during morph ===
  const tubeRadius = interpolate(morphP, [0, 1], [0.045, 0.18])

  // === Rebuild tube geometry positions in place ===
  // We call TubeGeometry's internal generator by allocating a fresh
  // TubeGeometry from the live curve then copying its position buffer
  // over our cached geometry. Allocation is unavoidable at the THREE API
  // level (TubeGeometry doesn't expose an in-place updater), but we
  // immediately dispose to keep memory steady.
  const liveCurve = getCableCurve(frame)
  const fresh = new THREE.TubeGeometry(
    liveCurve,
    TUBULAR_SEGMENTS,
    tubeRadius,
    RADIAL_SEGMENTS,
    false,
  )
  const freshPos = fresh.attributes.position
  const freshNormal = fresh.attributes.normal
  const cachedPos = geometry.attributes.position
  const cachedNormal = geometry.attributes.normal

  if (
    freshPos &&
    cachedPos &&
    freshPos.array.length === cachedPos.array.length
  ) {
    ;(cachedPos.array as Float32Array).set(freshPos.array as Float32Array)
    cachedPos.needsUpdate = true
  }
  if (
    freshNormal &&
    cachedNormal &&
    freshNormal.array.length === cachedNormal.array.length
  ) {
    ;(cachedNormal.array as Float32Array).set(freshNormal.array as Float32Array)
    cachedNormal.needsUpdate = true
  }
  fresh.dispose()

  // === Alpha map (B7 fog window 282..372) ===
  // Inside the fog window, modulate with a deterministic noise field so the
  // cable surface looks turbulent · "can't see what flows through." Outside
  // the window we MUST reset to solid 255 because the texture data persists
  // across frames in Remotion's mount-per-frame model · stale fog data
  // would leak into the morph window and make the cable read translucent
  // when it should be a bold opaque orange line.
  const inFogWindow = frame >= 282 && frame <= 372
  if (!inFogWindow && frame > 372) {
    // Morph window · reset alpha to solid 255 so the orange cable reads bold
    const data = alphaTexture.image.data as Uint8Array
    for (let i = 0; i < ALPHA_PIXEL_COUNT; i++) {
      data[i * 4 + 0] = 255
      data[i * 4 + 1] = 255
      data[i * 4 + 2] = 255
      data[i * 4 + 3] = 255
    }
    alphaTexture.needsUpdate = true
  }
  if (inFogWindow) {
    const fogStartP = interpolate(frame, [282, 300], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: EASE_ENTER,
    })
    const data = alphaTexture.image.data as Uint8Array
    for (let y = 0; y < ALPHA_H; y++) {
      for (let x = 0; x < ALPHA_W; x++) {
        const i = (y * ALPHA_W + x) * 4
        // Deterministic noise field driven by frame · same frame produces
        // identical bytes every render call.
        const noise = Math.abs(
          Math.sin(x * 0.31 + y * 0.17 + frame * 0.07),
        )
        const alpha = 255 * (1 - fogStartP * 0.55 * noise)
        const a = Math.max(0, Math.min(255, alpha))
        data[i + 0] = 255
        data[i + 1] = 255
        data[i + 2] = 255
        data[i + 3] = a
      }
    }
    alphaTexture.needsUpdate = true
  }

  // === Color & emissive (B10 morph color flip) ===
  // Compute target values per frame · APPLIED VIA PROPS BELOW so React
  // reconciles them deterministically. Earlier ref-mutation pattern fails
  // because matRef is null during first render of each frame in Remotion's
  // mount/unmount-per-frame model · the mutation never lands before paint.
  const colorP = Math.min(morphP / 0.33, 1) // color flip in first 1/3 of morph
  const emissiveP = Math.min(morphP / 0.66, 1) // emissive ramps over first 2/3
  const cableColor = colorLerp(COLOR_DARK, COLOR_ORANGE, colorP).getStyle()
  const cableEmissive = colorLerp(COLOR_BLACK, COLOR_ORANGE, emissiveP).getStyle()
  const cableEmissiveIntensity = morphP * 1.4
  // Cable stays full opacity through morph · all OTHER elements (orb,
  // monolith, ticks, plate) fade out via fadeOutP so the cable is the
  // single visual focus by f390. CostChart inherits this orange line.
  const cableOpacity = establishP

  return (
    <mesh ref={meshRef} geometry={geometry} castShadow={false} receiveShadow={false}>
      <meshStandardMaterial
        ref={matRef}
        color={cableColor}
        emissive={cableEmissive}
        emissiveIntensity={cableEmissiveIntensity}
        metalness={0.4}
        roughness={0.7}
        transparent
        opacity={cableOpacity}
        alphaMap={alphaTexture}
        alphaTest={0.05}
        toneMapped={false}
      />
    </mesh>
  )
}
