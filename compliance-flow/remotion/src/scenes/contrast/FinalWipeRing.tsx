import { interpolate, useCurrentFrame } from 'remotion'
import { EASE_EXIT } from './easings'
import { TL } from './timeline'

// FinalWipeRing · ink disc that covers the monolith only as it fades out.
//
// Per Phase 2 spec, the hand-off is INTIMATE: the cable's morph target line
// is the focal point, not a frame-filling wipe. The ring is sized to match
// the monolith silhouette so as the monolith's opacity fades the disc covers
// any leftover geometry without intruding on the cable's morph diagonal.
//
// Wipe window: 380..390. Scale 0 → 1.5 (covers monolith only). Earlier
// 6× scale covered the entire frame and occluded the cable.

const WIPE_START = 380

export const FinalWipeRing: React.FC = () => {
  const frame = useCurrentFrame()

  if (frame < WIPE_START) return null

  const wipeP = interpolate(frame, [WIPE_START, TL.morphEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_EXIT,
  })
  const scale = interpolate(wipeP, [0, 1], [0, 1.5])

  // Position matches monolith hero spot. z forward bias so disc sits in
  // front of the slab.
  return (
    <group position={[1.8, 0.84, 0.4]} scale={scale} rotation={[0, 0, 0]}>
      <mesh>
        <circleGeometry args={[1, 64]} />
        <meshBasicMaterial color="#0a0807" toneMapped={false} />
      </mesh>
    </group>
  )
}
