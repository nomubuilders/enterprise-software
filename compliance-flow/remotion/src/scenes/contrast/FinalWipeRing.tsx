import { interpolate, useCurrentFrame } from 'remotion'
import { EASE_EXIT } from './easings'
import { TL } from './timeline'

// FinalWipeRing · ink-colored disc that scales from 0 to 30 across B10.
// Guarantees full ink coverage by frame 578 even if the LED ring's tube has
// gaps where the camera could see past it. Positioned at Local's hero spot
// (matches LEDRing position), oriented to face the camera at frame 568.
//
// Starts later than LED ring scale (520, not 510) so the ring's emissive halo
// is the lead visual — the inner disc closes the curtain behind it.

export const FinalWipeRing: React.FC = () => {
  const frame = useCurrentFrame()

  if (frame < 520) return null

  const wipeP = interpolate(frame, [520, TL.wipeEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_EXIT, // accelerate-in: closes hard
  })
  const scale = interpolate(wipeP, [0, 1], [0, 30])

  // Position matches Local hero, faces the camera (which by K5 is at +Z facing
  // through Local toward the LED). A circle plane normal-aligned to camera-fwd.
  return (
    <group position={[1.6, 0.5, 0]} scale={scale} rotation={[0, 0, 0]}>
      <mesh>
        <circleGeometry args={[1, 64]} />
        <meshBasicMaterial color="#0a0807" toneMapped={false} />
      </mesh>
    </group>
  )
}
