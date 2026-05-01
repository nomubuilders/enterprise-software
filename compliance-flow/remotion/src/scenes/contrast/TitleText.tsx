import { Text } from '@react-three/drei'
import { interpolate, staticFile, useCurrentFrame } from 'remotion'
import { EASE_ENTER, EASE_EXIT } from './easings'
import { TL, TL_LEGACY } from './timeline'

// DEPRECATED · this component is no longer mounted in ProductStage after the
// "The Leash" rebuild (Phase 2/4). Headers now render via RowOverlay's <Headers>
// instead of a 3D Drei <Text>. File retained per project no-delete-without-
// confirmation rule. References to titleHoldEnd / titleOutEnd map to TL_LEGACY
// stubs in timeline.ts so this file still typechecks.

// TitleText · "Let's compare." Drei Text in 3D world space.
//
// Original version was camera-locked via useThree + getWorldDirection +
// camera.quaternion. That coupled the title to CameraRig's per-frame camera
// mutations, which hung Drei Text's SDF init at first paint (NaN / stale
// quaternion during the first render before CameraRig's layoutEffect ran).
//
// Replaced with a static world position above the stage. Faces forward (no
// rotation). The "drift up + fade" still feels right, just without the
// camera-locked wobble.
//
// Per spec section 2 · B2:
//   60..82  · fade in + scale 0.92 → 1.0
//   82..110 · hold
//   110..130 · accelerate-out · drift up + opacity → 0
//
// Frame-gated: returns null outside B2 window.

// Barlow Bold via local woff (shipped by @fontsource/barlow into public/fonts/).
// Using staticFile() resolves to a local URL the bundler embeds, so headless
// Chromium does not need to fetch from a remote CDN. Remote font fetches
// hang Drei Text's SDF init in the still-render path.
const BARLOW_FONT = staticFile('fonts/Barlow-Bold.woff')

export const TitleText: React.FC = () => {
  const frame = useCurrentFrame()

  if (frame < TL.titleInStart || frame > TL_LEGACY.titleOutEnd) return null

  const inP = interpolate(frame, [TL.titleInStart, TL.titleInEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_ENTER,
  })
  const outP = interpolate(frame, [TL_LEGACY.titleHoldEnd, TL_LEGACY.titleOutEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_EXIT,
  })
  const opacity = inP * (1 - outP)
  const scale = interpolate(inP, [0, 1], [0.92, 1.0])
  const yDrift = outP * 0.6

  // Static world-space position. Y above the stage, in front of the objects.
  // The camera spline arcs around this point, so the title reads centered for
  // most of B2 and naturally drifts out of frame during the camera move to K2.
  return (
    <Text
      position={[0, 2.4 + yDrift, 0.5]}
      scale={scale}
      fontSize={0.42}
      font={BARLOW_FONT}
      color="#FEFCFD"
      anchorX="center"
      anchorY="middle"
      fillOpacity={opacity}
      letterSpacing={-0.04}
    >
      Let&apos;s compare.
    </Text>
  )
}
