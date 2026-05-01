import { interpolate, useCurrentFrame } from 'remotion'
import { EASE_ENTER } from './easings'
import { TL } from './timeline'

// Lights · 4 light sources, all frame-driven during B1 establish, static after.
// Per spec section 3:
//   ambient        0   → 0.25
//   directional    0   → 0.9   (key, casts shadow)
//   teal pointL    0   → 0.4   (Cloud-side cool fill)
//   purple pointR  0   → 0.5   (Local-side warm fill)
//
// Lights start at 0 in B0 (frames 0-8) so the room is dark before the show begins.

export const Lights: React.FC = () => {
  const frame = useCurrentFrame()

  const establishP = interpolate(frame, [TL.establishStart, TL.establishEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_ENTER,
  })

  return (
    <>
      <ambientLight intensity={0.25 * establishP} />
      <directionalLight
        position={[5, 6, 4]}
        intensity={0.9 * establishP}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight
        position={[-3, 2, 3]}
        intensity={0.4 * establishP}
        color="#0891B2"
        distance={12}
        decay={1.5}
      />
      <pointLight
        position={[3, 2, 3]}
        intensity={0.5 * establishP}
        color="#4004DA"
        distance={12}
        decay={1.5}
      />
    </>
  )
}
