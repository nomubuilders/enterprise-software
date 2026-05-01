import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  Easing,
  Audio,
  Sequence,
  staticFile,
} from 'remotion'
import { z } from 'zod'
import { TypeWriter } from 'remotion-bits'
import { loadFont } from '@remotion/google-fonts/Barlow'
import { theme } from '../theme'

// Scene 1 · The Question · `QuestionScene`
// 180 frames (6s) @ 30fps · 1920x1080.
//
// Direction: "The Indictment Roll-Call".
// Four AI provider rows arrive sequentially on the left third like names
// being read off a list. After all four hold, a centered question types in
// to the right two-thirds. Calm, editorial, gravitas + curiosity.
//
// Hard rules honored:
// - All animation frame-driven via `useCurrentFrame()` + `interpolate`.
// - Easings via `Easing.bezier(...)` only · iOS deceleration for entrances.
// - No springs, no CSS transitions, no Tailwind animation classes.
// - No overlapping text. Sequential reveals. Logos fade 4 frames before
//   their name starts typing so the logo "waits" while the name appears.
// - Off-white radial bg `bg → bgEdge`. Provider names purple. Question ink.
//
// Script deviation note: SCRIPT.md describes `[logo SVG] [provider name]`
// rows pointing at openailogo.svg / anthropiclogo.svg / geminilogo.svg /
// Microsoft_Symbol_0.svg. Three of those four supplied SVGs are full
// *wordmarks* (e.g. the literal "OpenAI" letterforms) · pairing them with
// a TypeWriter "ChatGPT." beside reads as "OpenAI ChatGPT." which is
// noisy and visually collides at 56-72px logo heights. To honor the
// script's intent (a brand glyph paired with the typed product name)
// while staying Apple-tier, I render the brand *symbols* inline as path
// SVGs · the OpenAI petal, the Anthropic 'A' wordmark, the Gemini spark,
// and the Microsoft four-square. The Microsoft asset is already a
// symbol so it could be used directly · I keep all four inline for
// consistent stroke weight, colour treatment, and crisp render at any
// scale.

const { fontFamily: barlow } = loadFont('normal', { weights: ['500', '700'] })

// Easings
const EASE_ENTER = Easing.bezier(0.16, 1, 0.3, 1) // crisp deceleration
const EASE_BG = Easing.bezier(0.45, 0, 0.55, 1) // editorial slow

// === Brand symbols · path-only SVGs, sized to a uniform 80px box ===
// All symbols rendered into the same 80x80 cell so visual weight matches
// across rows. Inline paths (no external SVG load, no font dependency)
// guarantee crisp render at any scale.

const OpenAISymbol: React.FC = () => (
  // OpenAI petal · simplified knot mark in ink. The full mark is famously
  // a six-fold rotational design; this reproduces the recognizable petal
  // silhouette using the public-mark contour.
  <svg viewBox="0 0 320 320" width={80} height={80} aria-label="OpenAI">
    <path
      fill={theme.colors.ink}
      d="M297.06 130.97a80.04 80.04 0 0 0-6.88-65.7 80.92 80.92 0 0 0-87.13-38.83 80.05 80.05 0 0 0-60.4-26.91 80.92 80.92 0 0 0-77.18 56.06 80.05 80.05 0 0 0-53.5 38.79 80.92 80.92 0 0 0 9.96 94.84 80.05 80.05 0 0 0 6.88 65.7 80.92 80.92 0 0 0 87.13 38.83 80.04 80.04 0 0 0 60.4 26.91 80.92 80.92 0 0 0 77.18-56.06 80.05 80.05 0 0 0 53.5-38.79 80.92 80.92 0 0 0-9.96-94.84zm-120.7 168.43a59.95 59.95 0 0 1-38.51-13.92c.49-.27 1.34-.74 1.9-1.08l63.91-36.91a10.39 10.39 0 0 0 5.25-9.1v-90.13l27.02 15.6c.29.14.49.42.53.74v74.62c-.04 33.32-27.04 60.3-60.1 60.18zm-129.2-55.12a59.95 59.95 0 0 1-7.18-40.36c.48.29 1.32.8 1.92 1.15l63.91 36.91a10.4 10.4 0 0 0 10.51 0l78.04-45.05v31.2c.02.32-.13.63-.39.83l-64.6 37.31a60.16 60.16 0 0 1-82.2-22zm-16.82-139.39a59.94 59.94 0 0 1 31.32-26.36c-.01.56-.04 1.55-.04 2.24v73.81a10.4 10.4 0 0 0 5.25 9.1l78.04 45.04-27.02 15.6a.97.97 0 0 1-.91.08L73.41 187.18a60.16 60.16 0 0 1-22.04-82.29zm222.04 51.65l-78.04-45.04 27.02-15.6a.97.97 0 0 1 .91-.08l64.6 37.31a60.16 60.16 0 0 1-9.27 108.65c0-.58 0-1.55 0-2.24v-73.81a10.39 10.39 0 0 0-5.22-9.19zm26.91-40.5c-.48-.29-1.32-.8-1.92-1.15l-63.91-36.91a10.4 10.4 0 0 0-10.51 0l-78.04 45.05v-31.2a.97.97 0 0 1 .39-.83l64.6-37.28c33.07-19.07 75.34-7.4 94.41 25.74a59.95 59.95 0 0 1-4.99 74.51zm-169.1 55.74l-27.02-15.6a.99.99 0 0 1-.53-.74V81.85c0-38.27 31.04-69.27 69.32-69.25a69.42 69.42 0 0 1 38.5 13.95c-.49.27-1.34.74-1.9 1.08L125.66 64.55a10.39 10.39 0 0 0-5.25 9.1zm14.68-31.65L160 130.05l34.83 20.08v40.18L160 210.4l-34.83-20.09z"
    />
  </svg>
)

const AnthropicSymbol: React.FC = () => (
  // Anthropic 'A' · the official mark is a stylized A built from two
  // rotated trapezoids. This reproduces it cleanly in ink.
  <svg viewBox="0 0 100 100" width={80} height={80} aria-label="Anthropic">
    <path
      fill={theme.colors.ink}
      d="M27.62 18h14.16l25.79 64h-14.4l-5.28-13.6H21.31l-5.28 13.6H1.83zm-2 38.32h17.96l-8.98-23.16zM72.55 18h14.18l9.43 64H81.89z"
    />
  </svg>
)

const GeminiSymbol: React.FC = () => (
  // Gemini spark · a four-pointed star with concave sides. Brand-blue
  // gradient is core to Gemini's identity; we render with a vertical
  // gradient via stop colors aligned to the official palette.
  <svg viewBox="0 0 100 100" width={80} height={80} aria-label="Gemini">
    <defs>
      <linearGradient id="gemini-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#4796E3" />
        <stop offset="50%" stopColor="#8868D4" />
        <stop offset="100%" stopColor="#D96570" />
      </linearGradient>
    </defs>
    <path
      fill="url(#gemini-grad)"
      d="M50 8c2.65 18.42 14.95 30.72 33.37 33.37C64.95 44.02 52.65 56.32 50 74.74 47.35 56.32 35.05 44.02 16.63 41.37 35.05 38.72 47.35 26.42 50 8z M50 74.74C51.62 86 58 92.38 69.26 94c-11.26 1.62-17.64 8-19.26 19.26C48.38 102 42 95.62 30.74 94c11.26-1.62 17.64-8 19.26-19.26z"
      transform="translate(0 -7)"
    />
  </svg>
)

const MicrosoftSymbol: React.FC = () => (
  // Microsoft four-square · brand colors verified against the supplied
  // Microsoft_Symbol_0.svg. Sized to 80px box.
  <svg viewBox="0 0 100 100" width={80} height={80} aria-label="Microsoft">
    <rect x="2" y="2" width="46" height="46" fill="#F1511B" />
    <rect x="52" y="2" width="46" height="46" fill="#80CC28" />
    <rect x="2" y="52" width="46" height="46" fill="#00ADEF" />
    <rect x="52" y="52" width="46" height="46" fill="#FBBC09" />
  </svg>
)

// Per-row beats. Each row: logo fades 4f before name TypeWriter starts.
// Frame ranges directly from SCRIPT.md.
type Row = {
  id: string
  Symbol: React.FC
  name: string
  // Frame the logo BEGINS its 4-frame fade-in.
  logoStart: number
  // Frame the TypeWriter starts typing.
  typeStart: number
  // Frame the TypeWriter has finished typing.
  typeEnd: number
}

const ROWS: Row[] = [
  {
    id: 'chatgpt',
    Symbol: OpenAISymbol,
    name: 'ChatGPT.',
    logoStart: 6,
    typeStart: 10,
    typeEnd: 24,
  },
  {
    id: 'claude',
    Symbol: AnthropicSymbol,
    name: 'Claude.',
    logoStart: 24,
    typeStart: 28,
    typeEnd: 42,
  },
  {
    id: 'gemini',
    Symbol: GeminiSymbol,
    name: 'Gemini.',
    logoStart: 42,
    typeStart: 46,
    typeEnd: 60,
  },
  {
    id: 'copilot',
    Symbol: MicrosoftSymbol,
    name: 'Copilot.',
    logoStart: 60,
    typeStart: 64,
    typeEnd: 78,
  },
]

const QUESTION_TYPE_START = 90
const QUESTION_TYPE_END = 130
const QUESTION_TEXT = 'What do they have in common?'

// Layout · left-third panel for rows, right two-thirds for question.
// 1920x1080 canvas. Rows live in left third (~640px). Question centers
// in the right two-thirds (640..1920, midpoint ~1280).
const LEFT_PANEL_X = 200 // px from left edge to logo
const ROW_GAP = 36 // gap between brand symbol and provider name
const ROW_HEIGHT = 130 // vertical pitch between rows · 4 rows = 520px column
const ROWS_FIRST_Y = 250 // y of first row's center · 250..770 = vertically centered

// Background radial. Soft vignette: bg in center, bgEdge in the corners.
const Background: React.FC = () => {
  const frame = useCurrentFrame()
  // Background eases up over the first 18 frames so the page doesn't slap
  // the viewer with the gradient on frame zero.
  const reveal = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_BG,
  })
  return (
    <AbsoluteFill
      style={{
        // Two-stop radial: soft warm white core, slightly darker corners.
        background: `radial-gradient(ellipse 95% 80% at 50% 48%, ${theme.colors.bg} 0%, ${theme.colors.bg} 45%, ${theme.colors.bgEdge} 100%)`,
        opacity: 0.4 + 0.6 * reveal,
      }}
    />
  )
}

const Row: React.FC<{ row: Row; index: number }> = ({ row, index }) => {
  const frame = useCurrentFrame()

  // Logo fade · 4 frames from logoStart.
  const logoOpacity = interpolate(
    frame,
    [row.logoStart, row.logoStart + 4],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_ENTER },
  )

  // Subtle 8px upward settle on the row as the logo arrives.
  const rowLift = interpolate(
    frame,
    [row.logoStart, row.logoStart + 14],
    [8, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_ENTER },
  )

  // After all four rows are present (frame 78+), a barely-perceptible
  // collective drift settles the column · -2px from frame 78 to 90.
  const settle = interpolate(frame, [78, 90], [0, -2], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_ENTER,
  })

  // The TypeWriter has internal `delay` support measured from when it
  // mounts. We mount the TypeWriter at frame 0 and give it a delay so it
  // begins typing at row.typeStart. Before its delay it renders nothing
  // visible (just an idle cursor) · we hide the cursor via custom node.
  const charsVisible = frame >= row.typeStart
  // Hide whole TypeWriter before its start frame to avoid any cursor flash.

  const yCenter = ROWS_FIRST_Y + index * ROW_HEIGHT

  return (
    <div
      style={{
        position: 'absolute',
        left: LEFT_PANEL_X,
        top: yCenter,
        transform: `translateY(${rowLift + settle}px)`,
        display: 'flex',
        alignItems: 'center',
        gap: ROW_GAP,
        // Row total opacity also gates · once logoStart begins, the row
        // is part of the page. Keep at 1 after logo fade-in so the
        // TypeWriter can become visible without the row container fading.
        opacity: 1,
      }}
    >
      {/* Brand symbol · inline path SVG, uniform 80px box */}
      <div
        style={{
          width: 80,
          height: 80,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          opacity: logoOpacity,
          // Tiny vertical entrance offset on the logo itself for parallax
          transform: `translateY(${(1 - logoOpacity) * 4}px)`,
        }}
      >
        <row.Symbol />
      </div>

      {/* Provider name · TypeWriter, brand purple, 64pt Barlow */}
      <div
        style={{
          fontFamily: barlow,
          fontWeight: 700,
          fontSize: 64,
          lineHeight: 1,
          color: theme.colors.purple,
          letterSpacing: '-0.01em',
          minHeight: 72,
          display: 'flex',
          alignItems: 'center',
          // Hide the TypeWriter cursor before it starts, otherwise an
          // empty cursor flashes for the whole pre-roll on every row.
          visibility: charsVisible ? 'visible' : 'hidden',
        }}
      >
        <TypeWriter
          text={row.name}
          typeSpeed={3}
          delay={row.typeStart}
          // Cursor visible while typing, fades after.
          cursor={true}
          blinkSpeed={28}
          showCursorAfterComplete={false}
          style={{
            fontFamily: barlow,
            fontWeight: 700,
            fontSize: 64,
            color: theme.colors.purple,
          }}
        />
      </div>
    </div>
  )
}

const Question: React.FC = () => {
  const frame = useCurrentFrame()
  // The question lives in the right two-thirds of the canvas. We center
  // it inside that region so it sits visibly to the right of the rows
  // without colliding · the row column ends ~LEFT_PANEL_X + 110 + 28 + ~340 = ~640.
  // Right region starts ~640 and ends at 1920 · midpoint ~1280.
  const visible = frame >= QUESTION_TYPE_START

  // Subtle 6px upward settle as the question begins typing.
  const lift = interpolate(
    frame,
    [QUESTION_TYPE_START, QUESTION_TYPE_START + 12],
    [6, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: EASE_ENTER,
    },
  )

  return (
    <div
      style={{
        position: 'absolute',
        // Right two-thirds: x from 640 to 1920 · center at 1280.
        left: 640,
        right: 0,
        top: '50%',
        transform: `translateY(calc(-50% + ${lift}px))`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        visibility: visible ? 'visible' : 'hidden',
      }}
    >
      <div
        style={{
          fontFamily: barlow,
          fontWeight: 500,
          fontSize: 64,
          lineHeight: 1.15,
          color: theme.colors.ink,
          letterSpacing: '-0.015em',
          maxWidth: 1100,
        }}
      >
        <TypeWriter
          text={QUESTION_TEXT}
          typeSpeed={1.4}
          delay={QUESTION_TYPE_START}
          cursor={true}
          blinkSpeed={30}
          showCursorAfterComplete={true}
          style={{
            fontFamily: barlow,
            fontWeight: 500,
            fontSize: 64,
            color: theme.colors.ink,
            letterSpacing: '-0.015em',
          }}
        />
      </div>
    </div>
  )
}

export const questionSceneSchema = z.object({
  // No configurable props · scene is fully scripted. Schema kept for
  // parity with other scenes that may grow knobs later.
})

export type QuestionSceneProps = z.infer<typeof questionSceneSchema>

export const questionSceneDefaults: QuestionSceneProps = {}

// === Audio cues =============================================================
// Five editorial cues, each frame-gated via <Sequence from={frame}> per the
// canonical Remotion pattern (rules/audio.md). No `startFrom` on Audio · the
// Sequence wrapper is what schedules playback.
//
//   1. Per-provider selection click (4 cues). Timed to row.typeStart · the
//      exact frame the logo finishes its 4-frame fade (logoStart + 4 ===
//      typeStart) AND the typewriter for the provider's name begins. Earlier
//      revisions fired this on logoStart, which lit before the logo was
//      readable. metal-click.mp3 · volume 0.40 reads as a deliberate
//      mouse-click without competing with the visual reveal.
//      Frames: 10 (ChatGPT) · 28 (Claude) · 46 (Gemini) · 64 (Copilot).
//   2. Soft typewriter clack at QUESTION_TYPE_START (frame 90) as the
//      centered question begins typing in. Volume 0.18 · barely there ·
//      reads as "thought lands" without becoming a keyboard loop.
const CLICK_SRC = 'sfx/metal-click.mp3'
const CLICK_VOLUME_LOGO = 0.4
const CLICK_VOLUME_QUESTION = 0.18
const CLICK_DURATION = 8 // frames · long enough for full mp3 attack

const QuestionAudio: React.FC = () => {
  // Click cues disabled per user direction. Scene runs silent until
  // future voiceover or ambient bed lands.
  void CLICK_SRC
  void CLICK_VOLUME_LOGO
  void CLICK_VOLUME_QUESTION
  void CLICK_DURATION
  return null
}

export const QuestionScene: React.FC<QuestionSceneProps> = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: theme.colors.bg }}>
      <Background />
      {ROWS.map((row, i) => (
        <Row key={row.id} row={row} index={i} />
      ))}
      <Question />
      <QuestionAudio />
    </AbsoluteFill>
  )
}
