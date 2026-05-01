import { AbsoluteFill, Sequence } from 'remotion'
import { loadFont } from '@remotion/google-fonts/Barlow'
import { ProductStage } from './contrast/ProductStage'
import { AudioCues } from './contrast/AudioCues'
import { CostChart } from './CostChart'
import { TL } from './contrast/timeline'

// Pre-load Barlow so Drei <Text> can render the font deterministically.
// (Drei <Text> consumes the font URL directly; the loadFont call ensures
// the font is in the document for fallback / FOIT prevention.)
loadFont('normal', { weights: ['500', '700', '900'] })

// ContrastSceneV2 · "Two Boxes, One Room"
//
// Total composition: 998 frames @ 30fps · 33.27s
//   [0, 578]    Part 1 · 3D product-stage contrast (this rewrite)
//   [578, 998]  Part 2 · CostChart embed (frozen, unchanged)
//
// Hand-off at frame 578: B10 wipe completes; CostChart begins on a fully
// inked frame. Continuous energy — no rest, no cut.
//
// All animation is driven by useCurrentFrame(). No springs, no CSS transitions,
// no Tailwind animation classes. Per scene-craft hard rules.

export const ContrastSceneV2: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: '#0a0807' }}>
      {/* Part 1 · 3D stage. ThreeCanvas owns its own root. AudioCues sits
          alongside as a 2D overlay ( <Audio> + <Sequence> ). */}
      <Sequence from={0} durationInFrames={TL.handoff} layout="none">
        <ProductStage />
        <AudioCues />
      </Sequence>

      {/* Part 2 · CostChart embed at frame 578 (unchanged from previous build) */}
      <Sequence from={TL.handoff} durationInFrames={420}>
        <CostChart />
      </Sequence>
    </AbsoluteFill>
  )
}
