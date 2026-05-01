import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'
import { TypeWriter } from 'remotion-bits'
import { loadFont as loadBarlow } from '@remotion/google-fonts/Barlow'
import { theme } from '../theme'

// Load Barlow once at module scope so it's available across renders.
loadBarlow()

// ─────────────────────────────────────────────────────────────────────────
// Beat budget · 300 frames @ 30fps · 10 seconds. (v5 — final tune)
//
// 0..30     initialPause    empty stage breath after question scene cut
// 30..60    answerType      "You don't control any of them." types in
// 60..100   dramaticHold    text held at center, no cards yet (40f weight)
// 100..120  swipe           text moves up, first card lands at f112
// 100..216  cascade         14 cards, accelerating cadence across 116f
// 216..220  stackHold       full pile sits at peak loudness (4f)
// 220..240  retreat         cards push outward to clear the verdict stage
// 216..244  verdictWords    3 words: f216, f228, f240 — bigger entrance,
//                            shake, glow pulse, thud sfx PER WORD
// 244..274  verdictHold     full strength linger at center (30f / 1s)
// 244..274  subtitleHold    "Without notice." fades up at f244, holds
// 274..290  erase           verdict + subtitle + cards wipe / fade out
// 290..300  silentRelief    empty white stage; hard cut into PivotScene
//
// Sound design (locked, files in public/sfx/):
//   - tick on every card-land   → metal-click.mp3 (rate 0.9→1.15, vol 0.42→1.0)
//   - rising tension bed        → thruster-fire-000.mp3
//   - verdict thud on EACH word → impact-plate-heavy-004.mp3 (3 cues)
// ─────────────────────────────────────────────────────────────────────────

const BEAT = {
  fadeIn:        { start: 0,   end: 18 },
  initialPause:  { start: 0,   end: 30 },
  answerType:    { start: 30,  end: 60 },
  dramaticHold:  { start: 60,  end: 100 },
  swipe:         { start: 100, end: 120 },
  tensionBed:    { start: 100, end: 274 },
  cascade:       { start: 100, end: 216 },
  stackHold:     { start: 216, end: 220 },
  retreat:       { start: 220, end: 240 },
  verdict:       { start: 216, end: 244 },
  verdictHold:   { start: 244, end: 274 },
  subtitle:      { start: 244, end: 274 },
  erase:         { start: 274, end: 290 },
  silentRelief:  { start: 290, end: 300 },
} as const

// 14 cards. Reuse 13 unique article PNGs by wrapping index modulo length.
const ARTICLE_FILES: readonly string[] = [
  'article-6.png',
  'article-7.png',
  'article-8.png',
  'article-9.png',
  'article-10.png',
  'article-11.png',
  'article-12.png',
  'article-13.png',
  'article-14.png',
  'article-15.png',
  'article-16.png',
  'article-17.png',
  'article-18.png',
] as const

const N_CARDS = 14
const ARTICLES: readonly string[] = Array.from(
  { length: N_CARDS },
  (_, i) => ARTICLE_FILES[i % ARTICLE_FILES.length]!,
)

// Cascade timing (v5): 14 cards, 13 intervals between lands, cadence ramps
// CADENCE_FIRST → CADENCE_LAST linearly. Cascade window is 100..216 = 116f.
// First land at 100 + flight = 112. Sum of 13 intervals fills the rest.
const CARD_FLIGHT = 12
const CADENCE_FIRST = 12 // gap between card 0 land and card 1 land (slow)
const CADENCE_LAST = 4   // gap between card 12 land and card 13 land (machine-gun)
const FIRST_CARD_LAND = BEAT.cascade.start + CARD_FLIGHT // 112

// Pre-compute land frame for each card from the ramping cadence.
const CARD_LAND_FRAMES: readonly number[] = (() => {
  const out: number[] = [FIRST_CARD_LAND]
  for (let j = 0; j < N_CARDS - 1; j++) {
    const t = (N_CARDS - 2) === 0 ? 0 : j / (N_CARDS - 2)
    const interval = Math.round(
      CADENCE_FIRST + (CADENCE_LAST - CADENCE_FIRST) * t,
    )
    out.push(out[out.length - 1]! + interval)
  }
  return out
})()

// Tick playback rate ramps from 0.9 → 1.15 across cards (sonic acceleration).
const TICK_RATE_FIRST = 0.9
const TICK_RATE_LAST = 1.15

// Per-card tick: heavy wood impact. An earlier revision used metal-click
// (felt too mechanical / "computer UI") and a 4-variant cycle (felt
// sonically chaotic). The story this beat tells is articles being slammed
// onto a desk as evidence · the right sonic register is wooden gavel /
// stamp / book-closing thud, not a metallic UI click. impact-wood-heavy-002
// reads as "rich, heavy wood impact, conveying finality and importance" ·
// each card landing is now an evidentiary thunk. The volume + playbackRate
// ramps still drive the rising panic across the cascade.
const TICK_SRC = 'sfx/impact-wood-heavy-002.mp3'

// Card geometry — single source of truth.
const CARD_W = 800
const CARD_H = 250
const CARD_RADIUS = 14

// Canvas geometry (1920×1080). Card-center clamps so the entire card stays
// inside canvas with at least 60px margin from each edge.
//   X-clamp: [60 + W/2, 1920 - 60 - W/2] = [460, 1460]
//   Y-clamp: [60 + H/2, 1080 - 60 - H/2] = [185, 895]
const CARD_X_MIN = 460
const CARD_X_MAX = 1460
const CARD_Y_MIN = 185
const CARD_Y_MAX = 895

// Easings — cinematic only, no springs.
const EASE_OUT_QUART = Easing.bezier(0.25, 1, 0.5, 1)
const EASE_OUT_CUBIC = Easing.bezier(0.22, 1, 0.36, 1)
const EASE_IN_OUT_QUAD = Easing.bezier(0.45, 0, 0.55, 1)
const EASE_IN_QUART = Easing.bezier(0.5, 0, 0.75, 0)
const EASE_OUT_BACK = Easing.bezier(0.34, 1.56, 0.64, 1) // verdict overshoot

// Deterministic pseudo-random in [-1, 1] for card index. Pure function of i.
const rand = (i: number, salt: number): number => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453
  return (x - Math.floor(x)) * 2 - 1
}

// SPREAD REGION — half-extents the layout TRIES to use, before hard clamping.
// v5: pushed to the FULL allowable area so cards distribute across the whole
// canvas instead of bundling near center. With CARD_X clamp [460,1460] and
// CARD_Y clamp [185,895], allowable half-extents from canvas center (960,540)
// are 500 horizontal and 355 vertical. We use those exactly.
const SPREAD_HALF_W = 500
const SPREAD_HALF_H = 355

// One card's spatial layout in the stack.
type CardTransform = {
  x: number
  y: number
  scale: number
  rotation: number
  opacity: number
  zIndex: number
}

// Compute where card `i` should sit at the given frame.
const computeCardTransform = (
  i: number,
  frame: number,
  canvasW: number,
  canvasH: number,
): CardTransform | null => {
  const landFrame = CARD_LAND_FRAMES[i]!
  const enterStart = landFrame - CARD_FLIGHT
  if (frame < enterStart) return null

  const flightProgress = interpolate(
    frame,
    [enterStart, landFrame],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: EASE_OUT_QUART,
    },
  )

  // How many cards have landed AFTER this one as of `frame`.
  let landedAfter = 0
  for (let k = i + 1; k < N_CARDS; k++) {
    if (frame >= CARD_LAND_FRAMES[k]!) landedAfter++
  }

  // Ambient drift · slow sin oscillation on the whole card field so the
  // stack is never fully static. Amplitude ~14px, period ~120 frames.
  // Adds the "always in motion" feel after cards have landed without
  // creating a competing focal point.
  const ambientX = Math.sin(frame * 0.045) * 14
  const ambientY = Math.cos(frame * 0.038) * 9
  const centerX = canvasW / 2 + ambientX
  const centerY = canvasH / 2 + 60 + ambientY

  // Per-card deterministic edge of entry (top, right, bottom, left).
  const edgeIdx = Math.floor((rand(i, 1) + 1) * 2) % 4
  const flyDist = 1300
  const edgeOffsets = [
    { x: 0, y: -flyDist },
    { x: flyDist, y: 0 },
    { x: 0, y: flyDist },
    { x: -flyDist, y: 0 },
  ]
  const edge = edgeOffsets[edgeIdx]!

  // ── DETERMINISTIC SCATTER ─────────────────────────────────────────────
  const angle = i * 2.399 + rand(i, 31) * 0.6 // golden-angle-ish + jitter
  const radiusNorm = 0.35 + Math.abs(rand(i, 41)) * 0.55 // 0.35..0.9
  // v5: heroPull dialed back from 0.30 → 0.20 so even the hero card does
  // not crowd canvas center. Combined with the wider spread, the verdict
  // gets a clean center stage at f244 with no overlap.
  const heroPull = i === N_CARDS - 1 ? 0.20 : 1.0
  const homeOffsetX =
    Math.cos(angle) * SPREAD_HALF_W * radiusNorm * heroPull
  const homeOffsetY =
    Math.sin(angle) * SPREAD_HALF_H * radiusNorm * heroPull

  // v5: per-index drift amplitude bumped up. Every card gets full
  // rotation and offset variance — no "hero gets less drift" exception.
  const driftX = rand(i, 7) * 22
  const driftY = rand(i, 13) * 18

  const restRotation = rand(i, 19) * 5.5
  const baseScale = i === N_CARDS - 1 ? 1.0 : 0.92 - landedAfter * 0.008
  const restScale = Math.max(0.82, baseScale)
  const restOpacity = Math.max(0.55, 1.0 - landedAfter * 0.04)

  // Rest position, clamped so the entire card stays inside the canvas
  // with at least 60px margin from each edge.
  const rawRestX = centerX + homeOffsetX + driftX
  const rawRestY = centerY + homeOffsetY + driftY
  const restX = Math.max(CARD_X_MIN, Math.min(CARD_X_MAX, rawRestX))
  const restY = Math.max(CARD_Y_MIN, Math.min(CARD_Y_MAX, rawRestY))

  // During flight, blend the entry edge offset with the resting position.
  const flightRotation = rand(i, 23) * 12 * (1 - flightProgress)
  let x = restX + edge.x * (1 - flightProgress)
  let y = restY + edge.y * (1 - flightProgress)

  // ── RETREAT ───────────────────────────────────────────────────────────
  const retreatProgress = interpolate(
    frame,
    [BEAT.retreat.start, BEAT.retreat.end],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: EASE_IN_QUART,
    },
  )

  // Direction-from-center vector for retreat.
  const dx = restX - centerX
  const dy = restY - centerY
  const dirLen = Math.max(1, Math.hypot(dx, dy))
  const dirX = dx / dirLen
  const dirY = dy / dirLen
  const RETREAT_DISTANCE = 220
  const retreatX = dirX * RETREAT_DISTANCE * retreatProgress
  const retreatY = dirY * RETREAT_DISTANCE * retreatProgress

  // Bounce micro-pop on land.
  const bounce =
    frame >= landFrame - 1 && frame <= landFrame + 2
      ? 1 + 0.04 * Math.cos(((frame - landFrame) / 2) * Math.PI)
      : 1

  const flightToRest = 1.18 + (restScale - 1.18) * flightProgress
  const retreatScale = 1 + (0.85 - 1) * retreatProgress
  const scale = flightToRest * retreatScale * bounce

  const retreatOpacity = 1 + (0.18 - 1) * retreatProgress
  let opacity = restOpacity * flightProgress * retreatOpacity

  // ── ERASE BEAT (274..290) ─────────────────────────────────────────────
  // Cards fade fully to 0 as the verdict text is wiped.
  const eraseProgress = interpolate(
    frame,
    [BEAT.erase.start, BEAT.erase.end],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: EASE_IN_OUT_QUAD,
    },
  )
  opacity *= 1 - eraseProgress

  x += retreatX
  y += retreatY

  const rotation = restRotation + flightRotation

  return { x, y, scale, rotation, opacity, zIndex: 100 + i }
}

export type AnswerSceneProps = Record<string, never>
export const answerSceneDefaults: AnswerSceneProps = {} as AnswerSceneProps

export const AnswerScene: React.FC<Partial<AnswerSceneProps>> = () => {
  const frame = useCurrentFrame()
  const { width: canvasW, height: canvasH } = useVideoConfig()

  // Scene fade-in (0..18).
  const sceneFadeIn = interpolate(
    frame,
    [BEAT.fadeIn.start, BEAT.fadeIn.end],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_OUT_CUBIC },
  )

  // Background pressure: builds during cascade, peaks at verdict, then
  // releases during the erase beat into the silent relief.
  const bgDarken = interpolate(
    frame,
    [
      BEAT.cascade.start,
      BEAT.verdict.start,
      BEAT.verdictHold.end,
      BEAT.erase.end,
    ],
    [0, 1, 1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: EASE_IN_OUT_QUAD,
    },
  )

  // Answer line opacity. Visible from typing until verdict beat starts,
  // then dims to 0.18 so it lingers as faint context. Then erased fully
  // alongside the verdict in the erase beat.
  const answerOpacityBase = interpolate(
    frame,
    [BEAT.verdict.start - 4, BEAT.verdict.start + 6],
    [1, 0.18],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: EASE_IN_OUT_QUAD,
    },
  )
  const answerEraseOpacity = interpolate(
    frame,
    [BEAT.erase.start, BEAT.erase.end],
    [1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: EASE_IN_OUT_QUAD,
    },
  )
  const answerOpacity = answerOpacityBase * answerEraseOpacity

  // Answer line Y position. Starts CENTERED while it types in and holds,
  // then swipes upward to the header position to make room for the
  // article cascade. Swipe runs frames 100..120 (20f).
  const ANSWER_Y_CENTER = 460
  const ANSWER_Y_TOP = 88
  const answerY = interpolate(
    frame,
    [BEAT.swipe.start, BEAT.swipe.end],
    [ANSWER_Y_CENTER, ANSWER_Y_TOP],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: EASE_IN_OUT_QUAD,
    },
  )

  // Verdict word-by-word stamp (v5):
  //   - bigger entrance: scale 2.2 → 1.0 with overshoot easing
  //   - 4f shake (translateX/Y ±4px) immediately after stamp
  //   - orange textShadow glow pulses on stamp, then settles
  //   - lands slow: word 1 @ f216, word 2 @ f228, word 3 @ f240
  const VERDICT_WORDS = ['Banned.', 'Nerfed.', 'Repriced.'] as const
  const VERDICT_LAND_FRAMES = [216, 228, 240] as const

  // Erase wipe progress for the verdict block (left → right reveal of
  // transparency via a linear-gradient mask). 0 = fully visible,
  // 1 = fully wiped.
  const verdictEraseProgress = interpolate(
    frame,
    [BEAT.erase.start, BEAT.erase.end],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: EASE_IN_OUT_QUAD,
    },
  )
  // Mask sweeps left → right: at progress 0 the mask is fully opaque;
  // as progress grows, an alpha edge moves from x=-20% to x=120% across
  // the element, revealing transparency behind it.
  const wipeFrom = -20 + verdictEraseProgress * 140 // -20 → 120
  const wipeTo = wipeFrom + 18 // soft 18%-wide gradient edge
  const verdictWipeMask = `linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0) ${wipeFrom}%, rgba(0,0,0,1) ${wipeTo}%, rgba(0,0,0,1) 100%)`

  // Slight blur-out on top of the wipe for extra "dissolve" feel.
  const verdictEraseBlur = verdictEraseProgress * 6 // px

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${theme.colors.bg} 0%, ${theme.colors.bgEdge} 100%)`,
        fontFamily: theme.fonts.body,
        color: theme.colors.ink,
        opacity: sceneFadeIn,
        overflow: 'hidden',
      }}
    >
      {/* Subtle pressure overlay — eye reads weight, not color. */}
      <AbsoluteFill
        style={{
          background: theme.colors.ink,
          opacity: bgDarken * 0.07,
          pointerEvents: 'none',
        }}
      />

      {/* ── Answer line (TypeWriter) ──────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          top: answerY,
          left: 0,
          right: 0,
          textAlign: 'center',
          opacity: answerOpacity,
          fontFamily: theme.fonts.heading,
          fontSize: 72,
          fontWeight: 700,
          letterSpacing: -1.8,
          color: theme.colors.ink,
          lineHeight: 1.05,
          pointerEvents: 'none',
          zIndex: 50,
        }}
      >
        <TypeWriter
          text="You don't control any of them."
          delay={BEAT.answerType.start}
          typeSpeed={1}
          pauseAfterType={9999}
          cursor={false}
          showCursorAfterComplete={false}
        />
      </div>

      {/* ── Card stack ─────────────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
        }}
      >
        {ARTICLES.map((src, i) => {
          const t = computeCardTransform(i, frame, canvasW, canvasH)
          if (!t) return null
          return (
            <div
              key={`card-${i}`}
              style={{
                position: 'absolute',
                left: t.x - CARD_W / 2,
                top: t.y - CARD_H / 2,
                width: CARD_W,
                height: CARD_H,
                opacity: t.opacity,
                transform: `rotate(${t.rotation}deg) scale(${t.scale})`,
                transformOrigin: 'center center',
                borderRadius: CARD_RADIUS,
                overflow: 'hidden',
                background: theme.colors.bg,
                border: `1px solid ${theme.colors.divider}`,
                boxShadow:
                  '0 28px 60px rgba(26, 22, 20, 0.22), 0 6px 14px rgba(26, 22, 20, 0.12)',
                zIndex: t.zIndex,
              }}
            >
              <Img
                src={staticFile(`articles/${src}`)}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            </div>
          )
        })}
      </div>

      {/* ── Verdict (word-by-word stamp) + subtitle ───────────────────── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          gap: 32,
          zIndex: 200,
          // Erase wipe applied to the WHOLE verdict block (verdict + subtitle).
          WebkitMaskImage: verdictWipeMask,
          maskImage: verdictWipeMask,
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskSize: '100% 100%',
          maskSize: '100% 100%',
          filter: `blur(${verdictEraseBlur}px)`,
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 36,
            alignItems: 'baseline',
            justifyContent: 'center',
            fontFamily: theme.fonts.heading,
            fontSize: 148,
            fontWeight: 800,
            letterSpacing: -3,
            color: theme.colors.orange,
            textAlign: 'center',
            lineHeight: 1.0,
          }}
        >
          {VERDICT_WORDS.map((w, i) => {
            const land = VERDICT_LAND_FRAMES[i]!

            // Opacity: invisible before stamp, snaps to 1 at land.
            const op = interpolate(
              frame,
              [land - 5, land],
              [0, 1],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
            )

            // Scale: dramatic 2.2 → 1.0 with overshoot. Pre-land scale
            // is 2.2 (looms toward camera) and lands at 1.0.
            const sc = interpolate(
              frame,
              [land - 6, land],
              [2.2, 1.0],
              {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                easing: EASE_OUT_BACK,
              },
            )

            // Shake: 4 frames after stamp, ±4px translate driven by
            // a deterministic per-word phase so the three shakes differ.
            const shakeF = frame - land
            let shakeX = 0
            let shakeY = 0
            if (shakeF >= 0 && shakeF <= 4) {
              const decay = 1 - shakeF / 4
              const phase = i * 1.7
              shakeX = Math.sin(shakeF * 4.2 + phase) * 4 * decay
              shakeY = Math.cos(shakeF * 5.1 + phase) * 4 * decay
            }

            // Glow pulse: large orange textShadow that peaks on stamp
            // (frame == land) and decays over ~12 frames to a settled
            // ambient shadow that holds through verdictHold.
            const pulse = interpolate(
              frame,
              [land - 2, land, land + 12],
              [0, 1, 0],
              {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                easing: EASE_OUT_QUART,
              },
            )
            const settled =
              frame >= land
                ? interpolate(
                    frame,
                    [land + 6, land + 18],
                    [0, 1],
                    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
                  )
                : 0
            // Glow disabled per user direction. Verdict reads on its own
            // weight (scale + shake + word-by-word stamp + thud sfx).
            void pulse
            void settled
            const textShadow = 'none'

            return (
              <span
                key={w}
                style={{
                  opacity: op,
                  transform: `translate(${shakeX}px, ${shakeY}px) scale(${sc})`,
                  display: 'inline-block',
                  transformOrigin: 'center center',
                  textShadow,
                  willChange: 'transform, opacity, text-shadow',
                }}
              >
                {w}
              </span>
            )
          })}
        </div>

        <div
          style={{
            fontFamily: theme.fonts.heading,
            fontSize: 44,
            fontWeight: 500,
            letterSpacing: -0.5,
            color: theme.colors.inkMuted,
            textAlign: 'center',
            opacity: interpolate(
              frame,
              [BEAT.subtitle.start, BEAT.subtitle.start + 10],
              [0, 1],
              {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                easing: EASE_OUT_CUBIC,
              },
            ),
          }}
        >
          Without notice.
        </div>
      </div>

      {/* ── Audio · tension bed (continuous) ──────────────────────────── */}
      <Sequence
        from={BEAT.tensionBed.start}
        durationInFrames={BEAT.tensionBed.end - BEAT.tensionBed.start}
        layout="none"
      >
        <Audio
          src={staticFile('sfx/thruster-fire-000.mp3')}
          volume={(f) => {
            const globalF = f + BEAT.tensionBed.start
            return interpolate(
              globalF,
              [
                BEAT.tensionBed.start,
                BEAT.cascade.end,
                BEAT.verdict.start + 6,
                BEAT.verdictHold.start,
                BEAT.tensionBed.end - 1,
                BEAT.tensionBed.end,
              ],
              [0.08, 0.45, 0.62, 0.62, 0.55, 0.0],
              {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                easing: EASE_IN_OUT_QUAD,
              },
            )
          }}
        />
      </Sequence>

      {/* ── Audio · per-card tick (14 cues, ramping volume + playbackRate) */}
      {ARTICLES.map((_, i) => {
        const landFrame = CARD_LAND_FRAMES[i]!
        const t = (N_CARDS - 1) === 0 ? 0 : i / (N_CARDS - 1)
        // Volume ramps 0.42 → 1.0 across cards (escalating panic).
        const tickVolume = 0.42 + t * 0.58
        // PlaybackRate ramps 0.9 → 1.15 (sonic acceleration on top of cadence).
        const tickRate = TICK_RATE_FIRST + t * (TICK_RATE_LAST - TICK_RATE_FIRST)
        return (
          <Sequence
            key={`tick-${i}`}
            from={landFrame}
            durationInFrames={20}
            layout="none"
          >
            <Audio
              src={staticFile(TICK_SRC)}
              volume={tickVolume}
              playbackRate={tickRate}
            />
          </Sequence>
        )
      })}

      {/* ── Audio · verdict thud on EACH word (3 cues) ────────────────── */}
      {VERDICT_LAND_FRAMES.map((land, i) => (
        <Sequence
          key={`thud-${i}`}
          from={land}
          durationInFrames={28}
          layout="none"
        >
          <Audio
            src={staticFile('sfx/impact-plate-heavy-004.mp3')}
            volume={1.0}
            // Slight pitch climb across the three thuds: 0.95, 1.0, 1.06.
            playbackRate={0.95 + i * 0.055}
          />
        </Sequence>
      ))}
    </AbsoluteFill>
  )
}
