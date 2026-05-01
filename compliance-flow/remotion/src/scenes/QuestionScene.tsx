import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  Easing,
} from 'remotion'
import { z } from 'zod'
import { TypeWriter } from 'remotion-bits'
import { loadFont } from '@remotion/google-fonts/Barlow'
import { theme } from '../theme'

// Scene 1 · The Question · `QuestionScene`
// 180 frames (6s) @ 30fps · 1920x1080.
//
// Direction: "The Indictment Roll-Call".
// Four AI provider brand wordmarks arrive sequentially on the left third like
// names being read off a list. After all four hold, a centered question
// types in to the right two-thirds. Calm, editorial, gravitas + curiosity.
//
// Hard rules honored:
// - All animation frame-driven via `useCurrentFrame()` + `interpolate`.
// - Easings via `Easing.bezier(...)` only · iOS deceleration for entrances.
// - No springs, no CSS transitions, no Tailwind animation classes.
// - Sequential reveals · one logo every 18 frames.
// - Off-white radial bg `bg → bgEdge`. Question in ink.
//
// Logo treatment:
// - Real brand logos inlined as React components from the source SVGs in
//   public/. Inlined (not <Img>) because OpenAI's SVG uses `fill="none"`
//   parents that <img> would render invisible, and Gemini's wordmark is
//   white-on-white that needs an override. Inlining lets each path get an
//   explicit fill we control.
// - Brand-accurate colors: OpenAI / Anthropic / Gemini wordmark in ink for
//   legibility on off-white bg; Gemini's signature cyan spark preserved;
//   Microsoft's native four-square palette preserved. The mix communicates
//   "real consumer brands" rather than abstract glyphs.
// - Logos height-normalized to 60px. Widths vary by aspect ratio · the way
//   real brand walls look on Apple / Stripe / Snowflake customer pages.
// - The typed product names ("ChatGPT.", "Claude.", etc.) are dropped · the
//   wordmark logos already carry the brand. Without the typewriter, each
//   logo's fade-in is stretched from 4 → 14 frames so the row arrival
//   carries the same dramatic weight the typewriter previously contributed.

const { fontFamily: barlow } = loadFont('normal', { weights: ['500', '700'] })

// Easings
const EASE_ENTER = Easing.bezier(0.16, 1, 0.3, 1) // crisp deceleration
const EASE_BG = Easing.bezier(0.45, 0, 0.55, 1) // editorial slow

// === Brand logos · inlined SVG paths from public/*.svg ===
// Each component renders at the original viewBox; sizing is controlled by
// the parent <div>. Fills are explicit per-path so we override any white
// or unset fills that would be invisible on the off-white background.

const OpenAILogo: React.FC = () => (
  // Source: public/openailogo.svg · viewBox 0 0 288 78 (~3.7:1).
  // Original paths use fill="black"; overridden to theme ink for
  // consistency with the rest of the video's text color.
  <svg
    viewBox="0 0 288 78"
    width="100%"
    height="100%"
    preserveAspectRatio="xMinYMid meet"
    aria-label="OpenAI ChatGPT"
  >
    <path
      fill={theme.colors.ink}
      d="M30.6 0.398438C13.77 0.398438 0 14.1684 0 30.9984C0 47.8284 13.77 61.5984 30.6 61.5984C47.43 61.5984 61.2 47.9134 61.2 30.9984C61.2 14.0834 47.515 0.398438 30.6 0.398438ZM30.6 50.6334C20.145 50.6334 11.73 42.0484 11.73 30.9984C11.73 19.9484 20.145 11.3634 30.6 11.3634C41.055 11.3634 49.47 19.9484 49.47 30.9984C49.47 42.0484 41.055 50.6334 30.6 50.6334Z"
    />
    <path
      fill={theme.colors.ink}
      d="M92.1393 17.3984C86.6143 17.3984 81.2593 19.6084 78.4543 23.3484V18.2484H67.4043V77.7484H78.4543V56.2434C81.2593 59.7284 86.4443 61.5984 92.1393 61.5984C104.039 61.5984 113.389 52.2484 113.389 39.4984C113.389 26.7484 104.039 17.3984 92.1393 17.3984ZM90.2693 51.9934C83.9793 51.9934 78.3693 47.0634 78.3693 39.4984C78.3693 31.9334 83.9793 27.0034 90.2693 27.0034C96.5593 27.0034 102.169 31.9334 102.169 39.4984C102.169 47.0634 96.5593 51.9934 90.2693 51.9934Z"
    />
    <path
      fill={theme.colors.ink}
      d="M139.401 17.3984C127.331 17.3984 117.811 26.8334 117.811 39.4984C117.811 52.1634 126.141 61.5984 139.741 61.5984C150.876 61.5984 158.016 54.8834 160.226 47.3184H149.431C148.071 50.4634 144.246 52.6734 139.656 52.6734C133.961 52.6734 129.626 48.6784 128.606 42.9834H160.736V38.6484C160.736 27.0884 152.661 17.3984 139.401 17.3984ZM128.691 35.1634C129.881 29.8084 134.301 26.3234 139.656 26.3234C145.351 26.3234 149.686 30.0634 150.196 35.1634H128.691Z"
    />
    <path
      fill={theme.colors.ink}
      d="M190.145 17.3984C185.215 17.3984 180.03 19.6084 177.65 23.2634V18.2484H166.6V60.7484H177.65V37.8834C177.65 31.2534 181.22 26.9184 187 26.9184C192.355 26.9184 195.245 30.9984 195.245 36.6934V60.7484H206.295V34.9084C206.295 24.3684 199.835 17.3984 190.145 17.3984Z"
    />
    <path
      fill={theme.colors.ink}
      d="M234.596 1.25L210.541 60.75H222.356L227.456 47.745H254.826L259.926 60.75H271.911L248.026 1.25H234.596ZM231.281 37.885L241.141 12.98L250.916 37.885H231.281Z"
    />
    <path
      fill={theme.colors.ink}
      d="M287.636 1.25H276.416V60.75H287.636V1.25Z"
    />
  </svg>
)

const AnthropicLogo: React.FC = () => (
  // Source: public/anthropiclogo.svg · viewBox 0 0 578.9 65 (~8.9:1).
  // Wide wordmark · the brand's name spelled out in their custom typeface.
  // Original asset paints the glyphs in #181818 via .st0 · we override to
  // theme ink for consistency.
  <svg
    viewBox="0 0 578.9 65"
    width="100%"
    height="100%"
    preserveAspectRatio="xMinYMid meet"
    aria-label="Anthropic Claude"
  >
    <g fill={theme.colors.ink}>
      <path d="M99.6,44.8l-28.3-44H56v62.8h13v-44l28.3,44h15.3V0.8h-13V44.8L99.6,44.8z" transform="translate(18.3 0.27)" />
      <path d="M106.8,12.9h21.1v50.7h13.5V12.9h21.1V0.8h-55.7V12.9L106.8,12.9z" transform="translate(34.87 0.27)" />
      <path d="M200,25.9h-29.6v-25h-13.5v62.8h13.5V38H200v25.7h13.5V0.8H200V25.9L200,25.9z" transform="translate(51.23 0.27)" />
      <path d="M225.5,12.9h16.6c6.6,0,10.1,2.4,10.1,7c0,4.6-3.5,7-10.1,7h-16.6V12.9L225.5,12.9z M265.7,20c0-11.9-8.7-19.1-23-19.1H212v62.8h13.5V39.1h15L254,63.7h14.9L254,37.2C261.5,34.3,265.7,28.3,265.7,20L265.7,20z" transform="translate(69.24 0.27)" />
      <path d="M291.2,52.4c-10.6,0-17.1-7.5-17.1-19.8c0-12.5,6.5-20,17.1-20c10.5,0,16.9,7.5,16.9,20C308.1,44.9,301.7,52.4,291.2,52.4L291.2,52.4z M291.2,0c-18.1,0-31,13.5-31,32.6c0,18.9,12.8,32.4,31,32.4c18,0,30.8-13.5,30.8-32.4C322,13.5,309.3,0,291.2,0L291.2,0z" transform="translate(84.99 0)" />
      <path d="M346.4,28.7h-16.6V12.9h16.6c6.6,0,10.1,2.7,10.1,7.9S353.1,28.7,346.4,28.7L346.4,28.7z M347,0.8h-30.7v62.8h13.5V40.9H347c14.3,0,23-7.5,23-20C370,8.4,361.3,0.8,347,0.8L347,0.8z" transform="translate(103.29 0.27)" />
      <path d="M436.5,42.8c-2.3,6.1-7,9.6-13.4,9.6c-10.6,0-17.1-7.5-17.1-19.8c0-12.5,6.5-20,17.1-20c6.4,0,11,3.5,13.4,9.6h14.3C447.2,8.7,436.7,0,423.1,0c-18.1,0-31,13.5-31,32.6c0,18.9,12.8,32.4,31,32.4c13.7,0,24.2-8.8,27.7-22.2H436.5L436.5,42.8z" transform="translate(128.04 0)" />
      {/* "I" letterform · brand-accurate Anthropic uses a slanted parallelogram
          here that occupies 39px horizontal span; at our render scale the slant
          reads as a literal backslash. Replaced with a serif "I" that occupies
          the same 39px horizontal span (top and bottom serifs preserve kerning
          to surrounding letters P and C) with a 13px center stroke that matches
          the H / M / N vertical strokes elsewhere in the wordmark. */}
      <path d="M360.9,0.8H399.7V8.8H386V55.6H399.7V63.6H360.9V55.6H374.6V8.8H360.9Z" transform="translate(117.83 0.27)" />
      <path d="M23.7,38.8l8.6-22.1l8.6,22.1H23.7L23.7,38.8z M25.1,0.8L0,63.7h14l5.1-13.2h26.2l5.1,13.2h14L39.4,0.8H25.1L25.1,0.8z" transform="translate(0 0.27)" />
    </g>
  </svg>
)

const GeminiLogo: React.FC = () => (
  // Source: public/geminilogo.svg · viewBox 0 0 200.9 43 (~4.7:1).
  // Original asset uses .st0 white for the wordmark and .st1 cyan for the
  // four-pointed spark. White is invisible on off-white bg · we override
  // wordmark to theme ink and keep the cyan spark · its signature accent.
  <svg
    viewBox="0 0 200.9 43"
    width="100%"
    height="100%"
    preserveAspectRatio="xMinYMid meet"
    aria-label="Gemini"
  >
    {/* Wordmark · ink fill */}
    <g fill={theme.colors.ink}>
      <path d="M69.2,23.6h8.2V29c-1.8,1.1-4.2,1.7-6.5,1.7c-5.9,0-9.8-3.8-9.8-9.5c0-5.7,3.9-9.5,9.7-9.5c3.1,0,5.6,0.9,7.9,2.9l0.3,0.3l2.4-3.8l-0.3-0.2c-3-2.5-6.4-3.8-10.4-3.8c-4,0-7.7,1.3-10.3,3.7c-2.8,2.6-4.3,6.1-4.3,10.4c0,8.3,6,14,14.5,14c3.9,0,8.7-1.5,11.4-3.6l0.1-0.1V19.2H69.2V23.6z" />
      <polygon points="88.1,34.9 109.5,34.9 109.5,30.5 92.8,30.5 92.8,23 106.6,23 106.6,18.6 92.8,18.6 92.8,11.9 109.5,11.9 109.5,7.6 88.1,7.6" />
      <polygon points="129.7,20.4 119.1,7.6 114.9,7.6 114.9,34.9 119.7,34.9 119.7,15.4 129.2,26.9 130.3,26.9 139.8,15.4 139.8,34.9 144.6,34.9 144.6,7.6 140.4,7.6" />
      <rect x="151.7" y="7.6" width="4.8" height="27.3" />
      <polygon points="184.1,27.1 167.9,7.7 167.8,7.6 163.6,7.6 163.6,34.9 168.5,34.9 168.5,15.5 184.7,34.8 184.8,34.9 189,34.9 189,7.6 184.1,7.6" />
      <rect x="196.1" y="7.6" width="4.8" height="27.3" />
    </g>
    {/* Spark · brand cyan preserved */}
    <path
      fill="#26DDF9"
      d="M28.1,0c-7.6,0-14,5.8-14.8,13.3C5.8,14.1,0,20.5,0,28.1C0,36.3,6.7,43,14.9,43c7.6,0,14-5.8,14.8-13.3C37.2,28.9,43,22.5,43,14.9C43,6.7,36.3,0,28.1,0 M39.5,16.6c-0.7,5-4.7,9-9.7,9.7v-9.7H39.5z M3.5,26.4c0.7-5,4.7-9,9.7-9.7v9.7H3.5z M26.3,29.8c-0.8,5.6-5.7,9.8-11.4,9.8c-5.7,0-10.6-4.2-11.4-9.8H26.3z M26.4,26.4h-9.8v-9.8h9.8V26.4z M39.5,13.2H16.7c0.8-5.6,5.7-9.8,11.4-9.8C33.9,3.4,38.7,7.6,39.5,13.2"
    />
  </svg>
)

const MicrosoftLogo: React.FC = () => (
  // Source: public/Microsoft_Symbol_0.svg · viewBox 0 0 2499.6 2500 (~1:1).
  // Native four-color square preserved. Symbol-only · no Microsoft wordmark
  // shipped with the asset. Stands as the parent-company emblem next to
  // OpenAI / Anthropic / Gemini wordmarks · the visual rhythm of three
  // wordmarks plus one corporate emblem reads cleanly because consumers
  // already associate the four-square mark with Microsoft / Copilot.
  <svg
    viewBox="0 0 2499.6 2500"
    width="100%"
    height="100%"
    preserveAspectRatio="xMidYMid meet"
    aria-label="Microsoft Copilot"
  >
    <path d="m1187.9 1187.9h-1187.9v-1187.9h1187.9z" fill="#F1511B" />
    <path d="m2499.6 1187.9h-1188v-1187.9h1187.9v1187.9z" fill="#80CC28" />
    <path d="m1187.9 2500h-1187.9v-1187.9h1187.9z" fill="#00ADEF" />
    <path d="m2499.6 2500h-1188v-1187.9h1187.9v1187.9z" fill="#FBBC09" />
  </svg>
)

// Per-row beats. Each row's logo fades in over 14 frames at logoStart.
// 18-frame stagger between rows · same overall pacing as before but each
// row's arrival is more deliberate now that the typewriter no longer
// shares the spotlight.
type Row = {
  id: string
  Logo: React.FC
  // Frame the logo BEGINS its 14-frame fade-in.
  logoStart: number
  // Logo aspect ratio (w / h).
  aspect: number
  // Cap height in px. Wordmarks share LOGO_HEIGHT; the Microsoft symbol
  // gets SYMBOL_HEIGHT so its perceptual area matches the wordmarks.
  height: number
  // Max width in px. Ultra-wide wordmarks (Anthropic) get capped here so
  // they don't bleed into the question region; the logo's height then
  // shrinks proportionally to maintain aspect.
  maxWidth?: number
}

const LOGO_HEIGHT = 56 // px · uniform cap height for wordmarks
const SYMBOL_HEIGHT = 72 // px · square symbol marks · ~65% the visual area
                          // of a 56px wordmark, which matches what reads as
                          // "equal weight" given symbols are denser pixel
                          // mass than letterforms
const LOGO_FADE = 14 // frames · slow deliberate arrival per row

const ROWS: Row[] = [
  { id: 'chatgpt', Logo: OpenAILogo, logoStart: 6, aspect: 288 / 78, height: LOGO_HEIGHT },
  { id: 'claude', Logo: AnthropicLogo, logoStart: 24, aspect: 578.9 / 65, height: LOGO_HEIGHT, maxWidth: 400 },
  { id: 'gemini', Logo: GeminiLogo, logoStart: 42, aspect: 200.9 / 43, height: LOGO_HEIGHT },
  { id: 'copilot', Logo: MicrosoftLogo, logoStart: 60, aspect: 1, height: SYMBOL_HEIGHT },
]

const QUESTION_TYPE_START = 90
const QUESTION_TEXT = 'What do they have in common?'

// Layout · left-third panel for rows, right two-thirds for question.
// 1920x1080 canvas. Rows live in left third (~640px). Question centers
// in the right two-thirds (640..1920, midpoint ~1280).
const LEFT_PANEL_X = 200 // px from left edge to logo
const ROW_HEIGHT = 130 // vertical pitch between rows · 4 rows = 520px column
const ROWS_FIRST_Y = 250 // y of first row's center · 250..770 vertically centered

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

  // Logo fade · 14 frames from logoStart. Slow enough to feel deliberate
  // but fast enough to fit the 18-frame stagger budget.
  const logoOpacity = interpolate(
    frame,
    [row.logoStart, row.logoStart + LOGO_FADE],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_ENTER },
  )

  // 10px upward settle on the row as the logo arrives · entrance polish.
  const rowLift = interpolate(
    frame,
    [row.logoStart, row.logoStart + LOGO_FADE + 4],
    [10, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_ENTER },
  )

  // After all four rows are present (frame ~74), a barely-perceptible
  // collective drift settles the column · -2px from frame 78 to 90.
  const settle = interpolate(frame, [78, 90], [0, -2], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_ENTER,
  })

  const yCenter = ROWS_FIRST_Y + index * ROW_HEIGHT

  // Width derives from aspect ratio at the row's cap height. Wide wordmarks
  // (Anthropic) get capped by maxWidth · the logo height shrinks
  // proportionally to maintain aspect. Height-normalized layout is what
  // real brand walls look like on Apple / Stripe / Snowflake customer pages.
  const naturalWidth = row.height * row.aspect
  const logoWidth = row.maxWidth ? Math.min(naturalWidth, row.maxWidth) : naturalWidth
  const logoHeight = row.maxWidth && naturalWidth > row.maxWidth
    ? row.maxWidth / row.aspect
    : row.height

  return (
    <div
      style={{
        position: 'absolute',
        left: LEFT_PANEL_X,
        top: yCenter,
        transform: `translateY(${rowLift + settle}px)`,
        display: 'flex',
        alignItems: 'center',
        opacity: 1,
      }}
    >
      <div
        style={{
          width: logoWidth,
          height: logoHeight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          flexShrink: 0,
          opacity: logoOpacity,
          // Tiny vertical entrance offset on the logo itself for parallax
          transform: `translateY(${(1 - logoOpacity) * 6}px)`,
        }}
      >
        <row.Logo />
      </div>
    </div>
  )
}

const Question: React.FC = () => {
  const frame = useCurrentFrame()
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
  // No configurable props · scene is fully scripted.
})

export type QuestionSceneProps = z.infer<typeof questionSceneSchema>

export const questionSceneDefaults: QuestionSceneProps = {}

// Scene runs silent. Per prior session direction the per-provider click
// cues were misaligned and removed. Future ambient bed or VO can land
// here without code change · just drop a <Sequence><Audio/></Sequence>.
const QuestionAudio: React.FC = () => null

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
