import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion'
import { TypeWriter } from 'remotion-bits'
import { loadFont } from '@remotion/google-fonts/Barlow'
import { theme } from '../theme'

// Pre-load Barlow weights so the headline and subtitle render with the same
// metrics in the studio preview as in the rendered MP4.
const { fontFamily: barlow } = loadFont('normal', {
  weights: ['400', '500', '700'],
})

// Scene 3 · The Pivot · "the breath" beat.
// Frame 0..150 (5s @ 30fps).
// Standalone composition starts at frame 0; in the master PitchVideo this
// scene begins at master frame 360 (see SCRIPT.md lines 90..104).
//
// Beat budget (frames are LOCAL to this composition):
//   0..10    pure off-white hold (the inhale)
//   10..40   "There's another way." fades in (30-frame ease-out cubic)
//   40..50   small breath before subtitle starts
//   50..110  TypeWriter on subtitle (60 frames over 86 chars)
//   110..150 final hold (the exhale)
//
// Hard constraints honored:
//   - no accent colors (no purple / orange / teal)
//   - sequential reveal: headline first, then subtitle
//   - Easing.bezier only (no springs)
//   - pure off-white background, no texture, no gradient
//   - middle dot character is U+00B7, NOT an em-dash

export const pivotSceneDefaults = {
  headline: "There's another way.",
  // U+00B7 middle dot. Do NOT replace with an em-dash.
  subtitle:
    'Especially if you work in an industry that needs AI · and needs to keep control of it.',
} as const

export type PivotSceneProps = Partial<typeof pivotSceneDefaults>

// Headline reveal: cubic-bezier ease-out over 30 frames (frames 10..40).
// Curve mirrors CSS `cubic-bezier(0.16, 1, 0.3, 1)` — a slow-out / fast-in
// "calm-arrival" curve that is the standard Apple-keynote text reveal.
const HEADLINE_EASING = Easing.bezier(0.16, 1, 0.3, 1)

// Subtitle starts at frame 50 inside the scene. The subtitle is 86 chars and
// must finish typing by frame 110, so 60 frames / 86 chars = ~0.70 frames per
// character. TypeWriter accumulates fractional speeds via floatFrame so this
// is exact.
const SUBTITLE_DELAY_FRAMES = 50
const SUBTITLE_TYPE_SPEED = 0.7

export const PivotScene: React.FC<PivotSceneProps> = (props) => {
  const { headline, subtitle } = { ...pivotSceneDefaults, ...props }
  const frame = useCurrentFrame()

  // Ambient drift · the "breath" beat must never go fully static. Translate
  // only (no scale) at ±4px / ±3px so the eye reads it as continuous breath
  // rather than a settle. Lissajous-style sin/cos at non-commensurable
  // frequencies keeps the orbit from ever closing on itself.
  const ambientX = Math.sin(frame * 0.044) * 4
  const ambientY = Math.cos(frame * 0.037) * 3

  // Headline: fade-in only. The pause IS the point.
  const headlineOpacity = interpolate(frame, [10, 40], [0, 1], {
    easing: HEADLINE_EASING,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // Subtitle wrapper: opacity comes online one frame before TypeWriter
  // starts emitting characters, so the muted-ink color is "ready" the
  // instant the first letter appears.
  const subtitleWrapperOpacity = interpolate(
    frame,
    [SUBTITLE_DELAY_FRAMES - 1, SUBTITLE_DELAY_FRAMES + 4],
    [0, 1],
    {
      easing: Easing.linear,
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  )

  return (
    <AbsoluteFill
      style={{
        // Pure off-white. No gradient. No texture. Maximum restraint.
        backgroundColor: theme.colors.bg,
        fontFamily: barlow,
        color: theme.colors.ink,
        // Center stack: headline above, subtitle below, both centered.
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        // Generous side padding so the 86-char subtitle never wall-hugs.
        paddingLeft: 240,
        paddingRight: 240,
        textAlign: 'center',
        // Ambient drift · keeps the breath beat alive without competing.
        transform: `translate(${ambientX}px, ${ambientY}px)`,
      }}
    >
      {/* Headline · 96pt Barlow 700 · ink · simple opacity fade. */}
      <div
        style={{
          fontFamily: barlow,
          fontSize: 96,
          fontWeight: 700,
          letterSpacing: -2.5,
          lineHeight: 1.05,
          color: theme.colors.ink,
          opacity: headlineOpacity,
          // Subtle vertical breathing room between headline and subtitle.
          marginBottom: 56,
        }}
      >
        {headline}
      </div>

      {/* Subtitle · 44pt Barlow 400 · muted ink · TypeWriter. */}
      <div
        style={{
          fontFamily: barlow,
          fontSize: 44,
          fontWeight: 400,
          letterSpacing: -0.6,
          lineHeight: 1.35,
          color: theme.colors.inkMuted,
          opacity: subtitleWrapperOpacity,
          // Cap line length so the U+00B7 lands as a natural mid-sentence
          // pivot rather than a line-end orphan.
          maxWidth: 1280,
        }}
      >
        <TypeWriter
          text={subtitle}
          delay={SUBTITLE_DELAY_FRAMES}
          typeSpeed={SUBTITLE_TYPE_SPEED}
          // No blinking cursor — the breath should not flicker.
          cursor={false}
          showCursorAfterComplete={false}
        />
      </div>
    </AbsoluteFill>
  )
}
