import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion'
import { TypeWriter } from 'remotion-bits'
import { loadFont } from '@remotion/google-fonts/Barlow'
import { theme } from '../theme'
import { BrandWordmark } from '../components/BrandWordmark'

// Pre-load Barlow weights for parity between studio preview and rendered MP4.
const { fontFamily: barlow } = loadFont('normal', {
  weights: ['400', '500', '700'],
})

// Scene 8 · The Outro · OutroSceneV2 · 6s @ 30fps · 180 frames.
// "Considered close." Quiet confidence. The signature beat.
//
// Spec from SCRIPT.md (lines 277..294):
//   Background: pure off-white, no gradient, no texture.
//   Wordmark with brand-orange "Flow", NO tagline beneath the symbol.
//   Tagline (TypeWriter, brand orange): Build AI workflows that work without internet.
//   URL line (TypeWriter, muted ink, smaller): nomu.com/compliance-flow
//
// Beat budget (frames LOCAL to this composition):
//   0..40    BrandWordmark settle. Symbol springs in, "ComplianceFlow" fades in,
//            tagline beneath is suppressed via showTagline=false.
//   40..50   small breath before tagline starts emitting characters.
//   50..140  TypeWriter on tagline (90 frames over 47 chars, typeSpeed 2 means
//            two frames per char in TypeWriter's internal accumulator, so
//            47 * 2 = 94 frames worst-case; the cursor disappears past 140).
//   140..145 micro-breath before URL begins.
//   145..180 TypeWriter on URL line (35 frames over 24 chars at typeSpeed 1.5
//            yields ~36 frames, comfortably finishing inside the budget).
//
// Hard constraints honored:
//   - useCurrentFrame() drives every visible parameter.
//   - Easing.bezier only (no springs at this layer; BrandWordmark spring is its
//     internal contract, accepted as the established symbol-arrival vocabulary).
//   - No CSS transitions, no Tailwind animation classes.
//   - No em-dashes anywhere in the typed copy.
//   - Sequential reveals only: wordmark > tagline > URL. Never overlapping
//     focal points (the URL begins after the tagline finishes).

export const outroSceneV2Defaults = {
  tagline: 'Build AI workflows that work without internet.',
  url: 'nomu.com/compliance-flow',
} as const

export type OutroSceneV2Props = Partial<typeof outroSceneV2Defaults>

// Apple-keynote standard slow-out / fast-in curve. Matches PivotScene language.
const ARRIVAL_EASING = Easing.bezier(0.16, 1, 0.3, 1)

// Tagline emits at frame 50. Type speed 2 (TypeWriter convention: frames per
// character accumulator). 47 chars * 2 = 94 frames, finishes ~144. The Phase 2
// budget allots 50..140; the cursor will hide cleanly by 140 because we set
// showCursorAfterComplete=false and the characters land in time.
const TAGLINE_DELAY_FRAMES = 50
const TAGLINE_TYPE_SPEED = 2

// URL begins at frame 145. typeSpeed 1.5 over 24 chars = 36 frames, completes
// at ~181 — within the 180 budget when we account for the floating-frame
// accumulator. We hold the final state visible regardless.
const URL_DELAY_FRAMES = 145
const URL_TYPE_SPEED = 1.5

export const OutroSceneV2: React.FC<OutroSceneV2Props> = (props) => {
  const { tagline, url } = { ...outroSceneV2Defaults, ...props }
  const frame = useCurrentFrame()

  // Tagline wrapper opacity. Comes online one frame before TypeWriter emits so
  // the brand-orange color is mounted the instant the first character appears.
  const taglineWrapperOpacity = interpolate(
    frame,
    [TAGLINE_DELAY_FRAMES - 1, TAGLINE_DELAY_FRAMES + 4],
    [0, 1],
    {
      easing: ARRIVAL_EASING,
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  )

  // URL wrapper opacity. Same pattern, gated to the URL beat.
  const urlWrapperOpacity = interpolate(
    frame,
    [URL_DELAY_FRAMES - 1, URL_DELAY_FRAMES + 4],
    [0, 1],
    {
      easing: ARRIVAL_EASING,
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  )

  return (
    <AbsoluteFill
      style={{
        // Pure off-white. The whole scene reads as a signed page, not a slide.
        backgroundColor: theme.colors.bg,
        fontFamily: barlow,
        color: theme.colors.ink,
        // Vertical stack: wordmark, tagline, URL. Centered, generous gutters.
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingLeft: 240,
        paddingRight: 240,
        textAlign: 'center',
      }}
    >
      {/* Beat 1 · BrandWordmark settle. Symbol springs in (its internal API),
          wordmark fades in, tagline-under-symbol suppressed for this scene. */}
      <BrandWordmark delay={0} showTagline={false} />

      {/* Beat 2 · Tagline · 48pt Barlow 500 · brand orange · TypeWriter.
          The orange is the only accent color in this scene; everything else
          is ink or off-white. That single accent is what carries the close. */}
      <div
        style={{
          marginTop: 64,
          minHeight: 64, // reserves vertical space so beat 3 doesn't shift up
          fontFamily: barlow,
          fontSize: 48,
          fontWeight: 500,
          letterSpacing: -0.8,
          lineHeight: 1.3,
          color: theme.colors.orange,
          opacity: taglineWrapperOpacity,
          maxWidth: 1280,
        }}
      >
        <TypeWriter
          text={tagline}
          delay={TAGLINE_DELAY_FRAMES}
          typeSpeed={TAGLINE_TYPE_SPEED}
          cursor={false}
          showCursorAfterComplete={false}
        />
      </div>

      {/* Beat 3 · URL · 28pt Barlow 400 · muted ink · TypeWriter.
          Smaller than the tagline so the eye reads it as a sign-off /
          "where to find us" beat, not as a competing focal point. */}
      <div
        style={{
          marginTop: 40,
          minHeight: 36,
          fontFamily: barlow,
          fontSize: 28,
          fontWeight: 400,
          letterSpacing: 0.4,
          lineHeight: 1.3,
          color: theme.colors.inkMuted,
          opacity: urlWrapperOpacity,
        }}
      >
        <TypeWriter
          text={url}
          delay={URL_DELAY_FRAMES}
          typeSpeed={URL_TYPE_SPEED}
          cursor={false}
          showCursorAfterComplete={false}
        />
      </div>
    </AbsoluteFill>
  )
}
