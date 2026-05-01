import { useMemo, useRef, useLayoutEffect } from 'react'
import * as THREE from 'three'
import { useCurrentFrame } from 'remotion'
import { TL } from './timeline'
import { getCableCurve } from './cableCurve'

// ParticleSiphon · 64 instanced glowing spheres traveling up the cable curve.
// Active during B5 row 2 (frame range computed from row start) so it visually
// reads as data being siphoned out of the orb.
//
// Determinism: per-instance position derived only from `frame` and instance
// index. No useFrame, no useState, no random in render path.

const PARTICLE_COUNT = 64
const PARTICLE_RADIUS = 0.018

// B5 row 2 · particles spawn from frame 170 to 220, each lives 60 frames.
// First particle at f170, last birth at f170 + 63 = f233. Last death f293.
// We hide the instanced mesh outside [170, 295] for cheap culling.
const SIPHON_START = 170
const SIPHON_END = 295

// Pre-allocated objects to avoid per-frame allocations
const _matrix = new THREE.Matrix4()
const _position = new THREE.Vector3()
const _scale = new THREE.Vector3()
const _quat = new THREE.Quaternion(0, 0, 0, 1)

export const ParticleSiphon: React.FC = () => {
  const frame = useCurrentFrame()
  const meshRef = useRef<THREE.InstancedMesh>(null)

  // === Initial blank instances · all hidden at scale 0 ===
  const initialMatrices = useMemo(() => {
    const arr: Float32Array[] = []
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const m = new THREE.Matrix4()
      m.makeScale(0, 0, 0)
      arr.push(new Float32Array(m.elements))
    }
    return arr
  }, [])

  // === Per-frame matrix update (useLayoutEffect so it fires synchronously
  // before paint, matching the determinism contract) ===
  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return

    if (frame < SIPHON_START || frame > SIPHON_END) {
      // All hidden
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        _matrix.makeScale(0, 0, 0)
        mesh.setMatrixAt(i, _matrix)
      }
      mesh.instanceMatrix.needsUpdate = true
      return
    }

    const curve = getCableCurve(frame)

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Stagger births by 1 frame each. Particle i is born at SIPHON_START + i.
      const birth = SIPHON_START + i
      const ageFrame = frame - birth
      const lifespan = 60

      if (ageFrame < 0 || ageFrame > lifespan) {
        _matrix.makeScale(0, 0, 0)
        mesh.setMatrixAt(i, _matrix)
        continue
      }

      const ageP = ageFrame / lifespan // 0..1, bottom → top of cable

      // Sample curve. Curve param u ∈ [0,1] where u=0 is the TOP (first control
      // point at y=6.5) and u=1 is the BOTTOM (orb position). Particles travel
      // FROM bottom TO top, so they go from u=1 to u=0 as ageP goes 0→1.
      const u = 1 - ageP
      const point = curve.getPointAt(Math.max(0, Math.min(1, u)))

      // Slight per-instance jitter for swarm feel · deterministic on (i, ageFrame)
      const jitter = Math.sin(i * 7.31 + ageFrame * 0.4) * 0.04
      const jitterY = Math.cos(i * 5.17 + ageFrame * 0.31) * 0.02

      _position.set(point.x + jitter, point.y + jitterY, point.z)

      // Opacity arc baked into scale (since we use meshBasicMaterial without
      // per-instance opacity) · fade in 0..0.1, fade out 0.85..1.
      let alpha = 1
      if (ageP < 0.1) alpha = ageP / 0.1
      if (ageP > 0.85) alpha = 1 - (ageP - 0.85) / 0.15
      const visScale = Math.max(0, Math.min(1, alpha))

      _scale.set(visScale, visScale, visScale)
      _matrix.compose(_position, _quat, _scale)
      mesh.setMatrixAt(i, _matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  })

  // Always render the mesh (frame-driven hiding is via per-instance scale=0
  // above), but suppress entirely outside the active window for safety.
  if (frame < SIPHON_START - 1 || frame > SIPHON_END + 1) return null

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, PARTICLE_COUNT]}
      frustumCulled={false}
    >
      <sphereGeometry args={[PARTICLE_RADIUS, 8, 8]} />
      <meshBasicMaterial color="#FF6C1D" toneMapped={false} transparent opacity={0.95} />
    </instancedMesh>
  )
}
