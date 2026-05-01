// Floor · stage plane.
// Originally used Drei MeshReflectorMaterial (offscreen render-target for
// reflections). That hangs the headless render. Swapped to a plain physical
// material with low roughness for "polished but not mirrored" feel.
// Re-enable MeshReflectorMaterial later if/when headless rendering supports it.

export const Floor: React.FC = () => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
    <planeGeometry args={[20, 20]} />
    <meshPhysicalMaterial
      // Was #0a0807 · same as bg color, made the floor and bg
      // indistinguishable so the cubes appeared to float in void. Lifted
      // to a deep charcoal that still reads as "stage in shadow" but
      // gives the cubes a ground plane to sit on.
      color="#1f1a18"
      metalness={0.5}
      roughness={0.4}
      clearcoat={0.4}
      clearcoatRoughness={0.6}
    />
  </mesh>
)
