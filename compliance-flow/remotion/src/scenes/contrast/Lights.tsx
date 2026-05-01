import { interpolate, useCurrentFrame } from 'remotion'
import { EASE_ENTER } from './easings'
import { TL } from './timeline'

// Lights · 5 light sources, all frame-driven during B1 establish, static after.
// REVISED v2 · the Cloud cube was unreadable at the original intensities
// (ambient 0.25, key 0.9). Net result: viewer "can't see shit" for the scene's
// 33-second centerpiece. Bumped ambient + key + added a back rim to carve the
// objects out from the near-black bg.
//   ambient        0   → 0.55  (was 0.25 · lifts shadows so cube faces read)
//   directional    0   → 1.4   (was 0.9 · brighter key for surface definition)
//   teal pointL    0   → 0.55  (was 0.4 · Cloud-side cool fill)
//   purple pointR  0   → 0.7   (was 0.5 · Local-side warm fill)
//   white rim      0   → 0.7   (NEW · backlight from above-behind for silhouette)
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
      <ambientLight intensity={0.55 * establishP} />
      <directionalLight
        position={[5, 6, 4]}
        intensity={1.4 * establishP}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight
        position={[-3, 2, 3]}
        intensity={0.55 * establishP}
        // Was teal #0891B2 · shifted to desaturated gray-teal so the cloud
        // side reads "fluorescent server-room" rather than "neon brand". Keeps
        // brand teal as a tertiary color out of the contrast punchline.
        color="#3a5560"
        distance={12}
        decay={1.5}
      />
      <pointLight
        position={[3, 2, 3]}
        intensity={0.7 * establishP}
        color="#4004DA"
        distance={12}
        decay={1.5}
      />
      {/* Rim light · positioned above and behind the cubes. Adds a thin
          highlight along the back edges so the silhouettes read against
          the near-black bg. White (slightly cool) to preserve neutral
          surface color while carving form. */}
      <directionalLight
        position={[0, 5, -6]}
        intensity={0.7 * establishP}
        color="#e8eef5"
      />
    </>
  )
}
