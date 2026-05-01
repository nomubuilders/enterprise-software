import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion'
import { loadFont as loadBarlow } from '@remotion/google-fonts/Barlow'
import { loadFont as loadWorkSans } from '@remotion/google-fonts/WorkSans'
import { theme } from '../theme'
import { BrandWordmark } from '../components/BrandWordmark'

// Pre-load fonts so studio preview metrics match the rendered MP4. Barlow for
// the wordmark + pillars (heavy display weight), Work Sans for the tagline
// (calm reading weight).
const { fontFamily: barlow } = loadBarlow('normal', {
  weights: ['400', '500', '700'],
})
const { fontFamily: workSans } = loadWorkSans('normal', {
  weights: ['400', '500'],
})

// Scene 5 · The Brand Intro · `BrandIntroScene`
// Frame 0..150 (5s @ 30fps).
// Standalone composition starts at frame 0; in master PitchVideo this scene
// begins at master frame 660 (see SCRIPT.md lines 133..148).
//
// Beat budget (frames are LOCAL to this composition):
//   0..40    BrandWordmark "springs" in centered (existing component owns
//            the spring — we delay-mount it so the symbol pop and the wordmark
//            opacity ride together inside this 40-frame window).
//   50..100  Three feature pillars stagger in below the wordmark, 12 frames
//            apart, each pillar: 30-frame fade + Y-rise via Easing.bezier
//            overshoot for a "settling" arrival.
//   110..140 Tagline fades in via interpolated opacity. Linear bezier ease-out
//            so it lands quietly under the pillars.
//
// Hard constraints honored:
//   - background: off-white with soft brand-purple radial wash (~10% alpha)
//   - Pillars in INK · tagline in MUTED INK · wordmark uses orange "Flow"
//   - Easing.bezier(0.34, 1.56, 0.64, 1) for pillar overshoot (the "spring
//     feel" without using spring())
//   - U+00B7 middle dot in the tagline · NOT an em-dash
//   - sequential reveal: wordmark → pillars → tagline. No overlap.
//   - no CSS transitions, no Tailwind animation classes

export const brandIntroSceneDefaults = {
  pillars: ['Local LLM.', 'Node-based.', 'Built-in compliance.'] as readonly string[],
  // U+00B7 middle dot. Do NOT replace with an em-dash.
  tagline: 'We make data speak · without it ever leaving your hardware.',
} as const

export type BrandIntroSceneProps = {
  pillars?: readonly string[]
  tagline?: string
}

// Overshoot bezier for the three pillars · settles past 1.0 then returns. This
// gives the "spring feel" without invoking spring() · keeps every motion
// driven by useCurrentFrame and Easing.bezier per project rules.
const PILLAR_EASING = Easing.bezier(0.34, 1.56, 0.64, 1)

// Calm "arrival" curve for the tagline · same family as the rest of the deck
// (matches PivotScene). Decelerating ease-out, no overshoot.
const TAGLINE_EASING = Easing.bezier(0.16, 1, 0.3, 1)

// Pillar timing. First pillar starts at frame 50, each next pillar 12 frames
// later. Each pillar takes 30 frames to fully settle.
const PILLAR_FIRST_FRAME = 50
const PILLAR_STAGGER = 12
const PILLAR_DURATION = 30
const PILLAR_RISE_PX = 28 // Y-offset distance for the "rise" portion.

// Tagline timing. Frames 110..140 · 30-frame opacity fade.
const TAGLINE_IN = 110
const TAGLINE_OUT = 140

export const BrandIntroScene: React.FC<BrandIntroSceneProps> = (props) => {
  const { pillars, tagline } = { ...brandIntroSceneDefaults, ...props }
  const frame = useCurrentFrame()

  // Tagline fade-in · simple opacity ramp via Easing.bezier ease-out.
  const taglineOpacity = interpolate(frame, [TAGLINE_IN, TAGLINE_OUT], [0, 1], {
    easing: TAGLINE_EASING,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <AbsoluteFill
      style={{
        // Off-white base so the wordmark contrast holds even before the wash
        // overlays compose.
        backgroundColor: theme.colors.bg,
        fontFamily: barlow,
        color: theme.colors.ink,
      }}
    >
      {/* Soft brand-purple wash · radial, centered, ~10% alpha at the core,
          fades to transparent by 70% radius. Sits ABOVE the off-white base
          and BELOW the content stack so it tints the canvas without muddying
          text. Static (no per-frame animation) · brand presence is the point,
          not motion. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 50%, ${theme.colors.purpleSoft} 0%, rgba(64, 4, 218, 0.04) 35%, transparent 70%)`,
        }}
      />

      {/* Centered content stack · wordmark on top, pillars below, tagline
          beneath. flex column so vertical centering is a single property. */}
      <AbsoluteFill
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          paddingLeft: 200,
          paddingRight: 200,
          textAlign: 'center',
          gap: 72,
        }}
      >
        {/* BrandWordmark · existing component, owns its own spring entrance.
            We hide its built-in tagline ("We Make Data Speak") because Scene 5
            has its own purpose-built tagline below the pillars. */}
        <BrandWordmark delay={0} showTagline={false} />

        {/* Three feature pillars · horizontal row, sized 36pt Barlow 700 in
            ink. Each pillar staggers in with a 30-frame opacity ramp + Y-rise
            using the overshoot bezier. */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 96,
            // Width cap so the pillars feel like a tight three-up rather than
            // wall-hugging columns at 1920px.
            maxWidth: 1400,
          }}
        >
          {pillars.map((pillar, i) => {
            const start = PILLAR_FIRST_FRAME + i * PILLAR_STAGGER
            const end = start + PILLAR_DURATION

            const opacity = interpolate(frame, [start, end], [0, 1], {
              easing: PILLAR_EASING,
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            })

            const translateY = interpolate(
              frame,
              [start, end],
              [PILLAR_RISE_PX, 0],
              {
                easing: PILLAR_EASING,
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              },
            )

            return (
              <div
                key={pillar}
                style={{
                  fontFamily: barlow,
                  fontSize: 36,
                  fontWeight: 700,
                  letterSpacing: -0.5,
                  lineHeight: 1.1,
                  color: theme.colors.ink,
                  opacity,
                  transform: `translateY(${translateY}px)`,
                  // Fixed line so vertical centering of the row is stable
                  // regardless of which pillars have arrived yet.
                  whiteSpace: 'nowrap',
                }}
              >
                {pillar}
              </div>
            )
          })}
        </div>

        {/* Tagline · 32pt Work Sans 400 in muted ink. Simple opacity fade.
            Cap width so the U+00B7 lands as a mid-sentence pivot, not a
            line-end orphan. */}
        <div
          style={{
            fontFamily: workSans,
            fontSize: 32,
            fontWeight: 400,
            letterSpacing: -0.2,
            lineHeight: 1.4,
            color: theme.colors.inkMuted,
            opacity: taglineOpacity,
            maxWidth: 1280,
          }}
        >
          {tagline}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
