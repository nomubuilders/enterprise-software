import { ThreeCanvas } from '@remotion/three'
import { EffectComposer, Bloom, Vignette, Noise, ChromaticAberration } from '@react-three/postprocessing'
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion'
import { CameraRig } from './CameraRig'
import { Lights } from './Lights'
import { Floor } from './Floor'
import { Cable } from './Cable'
import { Orb } from './Orb'
import { ParticleSiphon } from './ParticleSiphon'
import { Monolith } from './Monolith'
import { VersionPlate } from './VersionPlate'
import { AuditTicks } from './AuditTicks'
import { ExplainabilityGrid } from './ExplainabilityGrid'
import { LEDRing } from './LEDRing'
import { FinalWipeRing } from './FinalWipeRing'
import { TL } from './timeline'
import { EASE_ENTER, EASE_EDITORIAL } from './easings'

// ProductStage · the <ThreeCanvas> and full 3D scene graph for "The Leash".
//
// Per Phase 2 §5 scene graph:
//   color · camera · lights · floor · cloud-side (orb + cable + particles)
//   · local-side (monolith + version plate + audit ticks + grid + LED ring)
//   · final wipe · post-processing
//
// Postprocessing envelope is computed here per frame and passed to
// EffectComposer as props (no useFrame, no internal animation).
//
// All hardcoded frame constants for bloom / vignette / chromatic aberration
// are remapped to the new 390-frame budget per Phase 2 §6 failure mode #7.

export const ProductStage: React.FC = () => {
  const frame = useCurrentFrame()
  const { width, height } = useVideoConfig()

  // === Bloom envelope (retimed to 390-frame budget) ===
  // 0 → 0.6 over establish. Holds. Peaks 0.85 at f366. Spikes to 1.4 at f378.
  // Falls to 0.3 at f390.
  let bloomIntensity = 0
  const establishP = interpolate(frame, [TL.establishStart, TL.establishEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_ENTER,
  })
  bloomIntensity = 0.6 * establishP

  // Pre-morph rise · bloom inches up across B8-B9 as the LED ring approaches
  // peak. Peak at f366 (6 frames before morph).
  if (frame >= TL.lockStart) {
    const peakP = interpolate(frame, [TL.lockStart, 366], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: EASE_EDITORIAL,
    })
    bloomIntensity = 0.6 + (0.85 - 0.6) * peakP
  }
  // Settle from 366 to morph start
  if (frame >= 366) {
    const settleP = interpolate(frame, [366, TL.morphStart], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
    bloomIntensity = 0.85 + (0.7 - 0.85) * settleP
  }
  // Morph spike to 1.4 at f378 (color flip crescendo)
  if (frame >= TL.morphStart) {
    const spikeP = interpolate(frame, [TL.morphStart, 378], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: EASE_EDITORIAL,
    })
    bloomIntensity = 0.7 + (1.4 - 0.7) * spikeP
  }
  // Final fade to 0.3 by f390
  if (frame >= 378) {
    const fadeP = interpolate(frame, [378, TL.morphEnd], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
    bloomIntensity = 1.4 + (0.3 - 1.4) * fadeP
  }

  // === Vignette darkness ===
  // Base 0.42. Morph window pulls toward 0.85 for cinematic close.
  const vignetteDarkness = interpolate(frame, [TL.morphStart, TL.morphEnd], [0.42, 0.85], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // === Chromatic aberration · tight to morph window only (372..390) ===
  // Peak at f378 to land WITH the color flip crescendo, then settle so the
  // orange line at f389 reads cleanly without RGB-fringing distortion. The
  // hand-off frame must look like an orange line, not a smeared rainbow.
  let caX = 0
  let caY = 0
  if (frame >= TL.morphStart) {
    if (frame <= 378) {
      const enterP = interpolate(frame, [TL.morphStart, 378], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
      caX = 0.0022 * enterP
      caY = 0.0011 * enterP
    } else {
      const exitP = interpolate(frame, [378, TL.morphEnd], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
      caX = 0.0022 * (1 - exitP)
      caY = 0.0011 * (1 - exitP)
    }
  }

  return (
    <ThreeCanvas
      width={width}
      height={height}
      camera={{ position: [0, 1.4, 7.4], fov: 32, near: 0.1, far: 100 }}
    >
      <color attach="background" args={['#0a0807']} />

      <CameraRig />
      <Lights />
      {/* <Environment> intentionally absent · HDRI CDN fetch hangs headless
          render per rules/3d.md. Direct lights from <Lights /> carry the
          illumination signature. */}
      <Floor />

      {/* === Cloud side · the leash === */}
      <Orb />
      <Cable />
      <ParticleSiphon />

      {/* === Local side · the sovereign === */}
      <Monolith />
      <VersionPlate />
      <AuditTicks />
      <ExplainabilityGrid />
      <LEDRing />

      {/* === Hand-off backstop === */}
      <FinalWipeRing />

      <EffectComposer>
        <Bloom intensity={bloomIntensity} luminanceThreshold={0.85} luminanceSmoothing={0.3} />
        <ChromaticAberration offset={[caX, caY]} radialModulation={false} modulationOffset={0} />
        <Vignette offset={0.3} darkness={vignetteDarkness} />
        <Noise opacity={0.025} />
      </EffectComposer>
    </ThreeCanvas>
  )
}
