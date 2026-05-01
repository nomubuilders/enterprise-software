import { AbsoluteFill, Sequence } from 'remotion'
import { loadFont } from '@remotion/google-fonts/Barlow'
import { ProductStage } from './contrast/ProductStage'
import { RowOverlay } from './contrast/RowOverlay'
import { AudioCues } from './contrast/AudioCues'
import { CostChart } from './CostChart'
import { TL } from './contrast/timeline'

// Pre-load Barlow so Drei <Text> can render the font deterministically.
// (Drei <Text> consumes the font URL directly; the loadFont call ensures
// the font is in the document for fallback / FOIT prevention.)
loadFont('normal', { weights: ['500', '700', '900'] })

// ContrastSceneV2 · "The Leash" (Phase 2/4 redesign)
//
// Total composition: 810 frames @ 30fps · 27.0s
//   [0,   390]  Part 1 · 3D leash + monolith contrast (this rewrite)
//   [390, 810]  Part 2 · CostChart embed (unchanged)
//
// Part 1 was previously 578f / 19.27s with two abstract cubes. Compressed
// to 390f / 13.0s with a leash metaphor: tethered cloud orb on the left,
// sovereign purple monolith on the right. Cable yanks, particles siphon
// up the cable, orb dims on "nerfed overnight," version etches into the
// monolith on "you own it forever." See SCRIPT.md changelog.
//
// Hand-off at frame 390: cable's color flips to brand orange and its curve
// straightens into a single rising diagonal line · this seeds CostChart's
// first segment so the visual continues without a cut.
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
        {/* 2D row overlay layered on top of the 3D scene · carries the
            actual comparison text. Drei <Text> in the 3D scene fails to
            render in headless mode (troika-three-text font shaping is
            async and races the snapshot), so the comparison content
            lives at the React layer where it always renders. */}
        <RowOverlay />
        <AudioCues />
      </Sequence>

      {/* Part 2 · CostChart embed at frame 390 (unchanged · 420f duration) */}
      <Sequence from={TL.handoff} durationInFrames={420}>
        <CostChart />
      </Sequence>
    </AbsoluteFill>
  )
}
