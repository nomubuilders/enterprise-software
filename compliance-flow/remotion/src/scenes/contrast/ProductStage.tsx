import { ThreeCanvas } from '@remotion/three'
import { Environment } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, Noise, ChromaticAberration } from '@react-three/postprocessing'
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion'
import { CameraRig } from './CameraRig'
import { Lights } from './Lights'
import { Floor } from './Floor'
import { CloudObject } from './CloudObject'
import { LocalObject } from './LocalObject'
import { LEDRing } from './LEDRing'
import { CardPair } from './CardPair'
import { TitleText } from './TitleText'
import { FinalWipeRing } from './FinalWipeRing'
import { TL, ROW_TEXT } from './timeline'
import { EASE_ENTER, EASE_EDITORIAL } from './easings'

// ProductStage · the <ThreeCanvas> and full 3D scene graph.
// Postprocessing envelope is computed here and passed to EffectComposer's
// children as props (frame-driven, NOT via useFrame).
//
// Per spec section 4 · scene graph:
//   color · camera · lights · environment · floor · objects · cards · title · wipe · effects

export const ProductStage: React.FC = () => {
  const frame = useCurrentFrame()
  const { width, height } = useVideoConfig()

  // === Bloom envelope ===
  // 0 → 0.6 over establish. Holds. Peaks 0.85 at f490. Spikes to 1.4 at 555.
  // Falls to 0.3 at 578.
  let bloomIntensity = 0
  const establishP = interpolate(frame, [TL.establishStart, TL.establishEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_ENTER,
  })
  bloomIntensity = 0.6 * establishP

  // Peak at frame 490
  if (frame >= TL.ledMaxStart) {
    const peakP = interpolate(frame, [TL.ledMaxStart, 490], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: EASE_EDITORIAL,
    })
    bloomIntensity = 0.6 + (0.85 - 0.6) * peakP
  }
  // Falloff toward 510
  if (frame >= 490) {
    const settleP = interpolate(frame, [490, TL.wipeStart], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
    bloomIntensity = 0.85 + (0.6 - 0.85) * settleP
  }
  // Wipe spike to 1.4 at 555
  if (frame >= TL.wipeStart) {
    const spikeP = interpolate(frame, [TL.wipeStart, 555], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: EASE_EDITORIAL,
    })
    bloomIntensity = 0.6 + (1.4 - 0.6) * spikeP
  }
  // Final fade to 0.3 by 578
  if (frame >= 555) {
    const fadeP = interpolate(frame, [555, TL.wipeEnd], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
    bloomIntensity = 1.4 + (0.3 - 1.4) * fadeP
  }

  // === Vignette darkness ===
  const vignetteDarkness = interpolate(frame, [540, TL.wipeEnd], [0.6, 0.92], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // === Chromatic aberration ===
  let caX = 0
  let caY = 0
  if (frame >= 530) {
    if (frame <= 548) {
      const enterP = interpolate(frame, [530, 548], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
      caX = 0.003 * enterP
      caY = 0.0015 * enterP
    } else {
      const exitP = interpolate(frame, [548, TL.wipeEnd], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
      caX = 0.003 * (1 - exitP)
      caY = 0.0015 * (1 - exitP)
    }
  }

  return (
    <ThreeCanvas
      width={width}
      height={height}
      camera={{ position: [0, 1.4, 7.0], fov: 32, near: 0.1, far: 100 }}
    >
      <color attach="background" args={['#0a0807']} />

      <CameraRig />
      <Lights />
      {/* <Environment preset="studio" background={false} /> · disabled: HDRI CDN fetch hangs the headless render. Direct lights carry illumination for now. */}
      <Floor />

      <CloudObject />
      <LocalObject />
      <LEDRing />

      <CardPair rowIndex={0} cloudText={ROW_TEXT[0].cloud} localText={ROW_TEXT[0].local} />
      <CardPair rowIndex={1} cloudText={ROW_TEXT[1].cloud} localText={ROW_TEXT[1].local} />
      <CardPair rowIndex={2} cloudText={ROW_TEXT[2].cloud} localText={ROW_TEXT[2].local} />
      <CardPair rowIndex={3} cloudText={ROW_TEXT[3].cloud} localText={ROW_TEXT[3].local} />
      <CardPair rowIndex={4} cloudText={ROW_TEXT[4].cloud} localText={ROW_TEXT[4].local} />

      <TitleText />
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
