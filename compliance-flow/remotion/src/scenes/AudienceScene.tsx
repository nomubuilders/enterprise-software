import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
} from 'remotion'
import { loadFont as loadBarlow } from '@remotion/google-fonts/Barlow'
import { loadFont as loadWorkSans } from '@remotion/google-fonts/WorkSans'
import { theme } from '../theme'

// Pre-load both display faces. Barlow 700 carries the flying industry names
// and the held verdict. Work Sans 400 is reserved for any future caption use
// in this scene; loaded for parity with the rest of the deck.
const { fontFamily: barlow } = loadBarlow('normal', {
  weights: ['500', '700', '900'],
})
const { fontFamily: workSans } = loadWorkSans('normal', {
  weights: ['400', '500'],
})

// Scene 4 · The Audience · "Naming the audience" beat.
// Standalone composition: 150 frames @ 30fps (5s). Local frames 0..150.
// In the master PitchVideo this scene runs at master frames 510..660.
//
// Visual direction
//   Off-white room with a subtle perspective-grid floor receding toward the
//   horizon. Six industry names cascade *through the camera* in brand
//   purple, one at a time. Each name reads as a complete word at its peak,
//   then is yanked back into depth. After the last word clears, a single
//   ink line holds the verdict: Industries that can't put their data in
//   someone else's cloud.
//
// Beat budget (frames LOCAL to this composition)
//   0..2      background and grid settle (the inhale)
//   2..90     six industry words cascade past the camera (one peak at a
//             time; spawn rhythm 14 frames apart, lifetime 18 frames each).
//             Last word (Education) spawns at f72 and is fully invisible
//             by f88, fully unmounted by f91.
//   95..115   hold-line fades in over a clean stage (no overlapping focal
//             points). Education's last residue is gone by f91, leaving 4
//             empty frames before hold-line begins.
//   115..150  hold-line at full opacity (35f / 1.16s readable). Settles into
//             Scene 5.
//
// Fly-past mechanics (REVISION: v3 overlap fix · cascade compressed)
//   Word lifetime 18 frames. Spawn cadence 14 frames apart. v2's 28f / 20f
//   pushed Education's tail to f138, which collided visually with the
//   hold-line (95..115 fade-in). v3 compresses both numbers proportionally
//   so the entire cascade clears before the hold-line fades in.
//   Each word's 0..1 progress drives every visual property so motion stays
//   coherent. The peak window is wide enough that the eye reads the WORD,
//   not letters at 100%+ frame width.
//     fade-in    (progress 0.00..0.18)  opacity 0 -> 1, scale 0.85 -> 1.0,
//                                       z 60 -> 140 (gentle approach)
//     peak hold  (progress 0.18..0.60)  scale 1.0 -> 1.10, z 140 -> 160
//                                       (small camera-settle, not a zoom)
//     depart     (progress 0.60..1.00)  scale 1.10 -> 0.05, z 160 -> -1800,
//                                       opacity 1 -> 0 (sucked into depth)
//
// Why these numbers vs v1
//   v1 used scale 1.55 -> 1.95 with z up to 460. At 220px font size on a
//   1920×1080 canvas that pushed peak word width past 100% of frame, so
//   "Education" (longest word) clipped to a letter blob. v2 caps peak scale
//   at 1.10 with a slightly smaller base font (180px), keeping the longest
//   word's peak width near 55-60% of frame. The depth illusion now comes
//   from translateZ + perspective + the 0.85 -> 1.10 scale shift, NOT from
//   gigantic font sizing.
//
// Hard rules honored
//   - Every animated value is a function of useCurrentFrame() + interpolate.
//   - Easing.bezier only. No springs, no CSS transitions, no Tailwind anim.
//   - Sequential reveal: only ONE word is in its readable peak window at
//     any frame (cadence 20 > peak width ~12 frames).
//   - Final hold text appears AFTER the last industry's peak. No overlapping
//     focal points.
//   - Background grid is decorative only; it never competes for attention.

export const audienceSceneDefaults = {
  industries: [
    'Healthcare',
    'Finance',
    'Government',
    'Insurance',
    'Legal',
    'Education',
  ] as readonly string[],
  holdText:
    "Industries that can't put their data in someone else's cloud.",
} as const

export type AudienceSceneProps = Partial<{
  industries: readonly string[]
  holdText: string
}>

// === Timing constants (v3) ===
// Spawn cadence and lifetime tuned so all six words are fully gone before
// the hold-line begins fading in (f95). With cadence 14 / lifetime 18:
//   spawns: 2, 16, 30, 44, 58, 72
//   ends:  20, 34, 48, 62, 76, 90
// Education (last word) reaches progress 0.82 (opacity 0) at f88 and is
// unmounted (localFrame > LIFETIME) at f91 · that gives a clean 4-frame
// dark stage before the hold-line begins fading in at f95. Only one word is
// in its readable peak window at any frame (cadence 14 > peak width ~6f).
const WORD_SPAWN_GAP = 14
// First industry's spawn frame.
const WORD_FIRST_SPAWN = 2
// How long each industry word lives on screen.
const WORD_LIFETIME = 18

// Final-hold text fade window. The hold-line is the scene's punchline and
// needs full-strength reading time. v3 keeps fade-in 95-115 / full hold
// 115-150 (35f / 1.16s readable) but the cascade is now fully cleared by
// f91, so the hold-line lands on a clean stage rather than competing with
// Education's tail. f112 (the user's flagged frame) shows ONLY the hold-line.
const HOLD_FADE_IN_START = 95
const HOLD_FADE_IN_END = 115

// === Easings ===
// Entrance: classic Apple deceleration. Slow-out / fast-in.
const EASE_ENTER = Easing.bezier(0.16, 1, 0.3, 1)
// Departure: aggressive acceleration. Slow start, then yanked away by the
// camera. This is what sells "flew through me".
const EASE_DEPART = Easing.bezier(0.55, 0.0, 0.85, 0.2)
// Background grid drift: gentle editorial pull, almost imperceptible.
const EASE_GRID = Easing.bezier(0.45, 0, 0.55, 1)
// Hold-text fade: same calm-arrival curve as the headline elsewhere.
const EASE_HOLD = Easing.bezier(0.16, 1, 0.3, 1)

// One flying industry name. All transforms are functions of `progress`
// (0..1) which is itself a function of the current frame and the word's
// spawn frame. There is no per-word state; the whole component is pure
// w.r.t. the frame.
type FlyingWordProps = {
  text: string
  spawnFrame: number
  frame: number
  // Sub-pixel horizontal offset so words don't all stack on a single
  // vertical column. Distinct seeds per word stop the cascade from feeling
  // mechanical without ever drifting far enough to compete for focus.
  xOffset: number
  yOffset: number
}

const FlyingWord: React.FC<FlyingWordProps> = ({
  text,
  spawnFrame,
  frame,
  xOffset,
  yOffset,
}) => {
  // Local progress 0..1 across the word's lifetime. Outside the lifetime
  // the word renders fully transparent and its transforms collapse to a
  // resting state, so it contributes nothing to the layout.
  const localFrame = frame - spawnFrame
  if (localFrame < 0 || localFrame > WORD_LIFETIME) {
    return null
  }
  const progress = localFrame / WORD_LIFETIME

  // Phase windows on the 0..1 lifetime (28-frame total):
  //   0.00..0.18 (5f)  fade-in: opacity 0→1, scale 0.85→1.0, z 60→140
  //   0.18..0.50 (9f)  readable peak: opacity 1, scale 1.0→1.10, z 140→160
  //   0.50..1.00 (14f) depart: opacity 1→0, scale 1.10→0.05, z 160→-1800
  //
  // The depart phase begins fade-out IMMEDIATELY at progress 0.50 so by
  // the time the next word fades in (cadence 20 frames = 5 frames after
  // word N's progress 0.50), word N is already at progress 0.68 with
  // opacity ~0.55, scale ~0.79, and pulled back to z ~ -200. The receding
  // word is small + far back + dim enough that the new emerging word is
  // unambiguously the focal point.
  const entryOpacity = interpolate(progress, [0.0, 0.18], [0, 1], {
    easing: EASE_ENTER,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  // Fade-out reaches 0 at progress 0.82 (4 frames before lifetime ends).
  // This ensures by the time word N+1 begins fade-in (cadence 20 → at
  // word N's progress 0.71), word N is at ~30% opacity and dropping fast,
  // so the focal handoff is clean. Word N is fully invisible by progress
  // 0.82, well before the next peak.
  const departOpacity = interpolate(progress, [0.5, 0.82], [1, 0], {
    easing: EASE_DEPART,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const opacity = Math.min(entryOpacity, departOpacity)

  // Scale (REVISION v2): peak capped at 1.10. v1's 1.55-1.95 clipped the
  // longest words. Depth illusion now comes from translateZ + perspective.
  const scaleEntry = interpolate(progress, [0.0, 0.18], [0.85, 1.0], {
    easing: EASE_ENTER,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const scalePeak = interpolate(progress, [0.18, 0.5], [1.0, 1.1], {
    easing: EASE_ENTER,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const scaleDepart = interpolate(progress, [0.5, 1.0], [1.1, 0.05], {
    easing: EASE_DEPART,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const scale =
    progress < 0.18 ? scaleEntry : progress < 0.5 ? scalePeak : scaleDepart

  // Z translation. perspective: 1200 on the wrapper. Positive Z = toward
  // camera, negative = into the screen. The yank-back to z=-1800 begins
  // at progress 0.50 in lockstep with opacity fadeout so departing words
  // visually "fall away" rather than ghost-fade.
  const zEntry = interpolate(progress, [0.0, 0.18], [60, 140], {
    easing: EASE_ENTER,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const zPeak = interpolate(progress, [0.18, 0.5], [140, 160], {
    easing: EASE_ENTER,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const zDepart = interpolate(progress, [0.5, 1.0], [160, -1800], {
    easing: EASE_DEPART,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const translateZ =
    progress < 0.18 ? zEntry : progress < 0.5 ? zPeak : zDepart

  // Subtle blur on entry (motion blur surrogate) and on the depth-pull
  // exit. Kept under 3px to avoid the cheap "drop-shadow blur" look.
  const entryBlur = interpolate(progress, [0.0, 0.18], [2.0, 0], {
    easing: EASE_ENTER,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const departBlur = interpolate(progress, [0.7, 1.0], [0, 2.0], {
    easing: EASE_DEPART,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const blurPx = Math.max(entryBlur, departBlur)

  // Letter-spacing tightens slightly as the word departs · the falling-away
  // perspective compresses character widths in real life, and the eye reads
  // the deflation as forward motion.
  const letterSpacingPx = interpolate(progress, [0.0, 1.0], [-2.0, -1.0], {
    easing: EASE_DEPART,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <div
      style={{
        position: 'absolute',
        // Center the text origin in the viewport, then offset slightly per
        // word so the cascade has a touch of organic horizontal scatter.
        left: '50%',
        top: '50%',
        transform: [
          'translate(-50%, -50%)',
          `translate(${xOffset}px, ${yOffset}px)`,
          `translateZ(${translateZ}px)`,
          `scale(${scale})`,
        ].join(' '),
        // Use transform-style: preserve-3d on the parent, NOT here. Here we
        // just need the text glyph to participate in the parent's 3D space.
        transformStyle: 'preserve-3d',
        // Visual properties. Font sized so that the longest word
        // ("Education", 9 chars) at peak scale 1.10 occupies ~55-60% of
        // the 1920px frame width. 180px Barlow 900 with -2px tracking and
        // 1.10x peak scale lands "Education" near 1100px wide.
        fontFamily: barlow,
        fontSize: 180,
        fontWeight: 900,
        letterSpacing: letterSpacingPx,
        lineHeight: 1.0,
        color: theme.colors.purple,
        // Filter rather than backdrop-filter — this affects the text only.
        filter: blurPx > 0.05 ? `blur(${blurPx}px)` : 'none',
        opacity,
        whiteSpace: 'nowrap',
        // willChange hints the renderer that these properties are animated;
        // harmless under Remotion's frame-by-frame render but important for
        // smooth Studio playback.
        willChange: 'transform, opacity, filter',
        // Make sure the glyph never claims layout space outside its centered
        // origin (otherwise the perspective math jitters at the edges).
        pointerEvents: 'none',
      }}
    >
      {text}
    </div>
  )
}

// Subtle perspective grid · CSS-only floor receding toward the horizon.
// Two crossed sets of repeating linear gradients render as a square grid;
// the wrapper is rotated on X so the grid lays flat, giving the off-white
// room a sense of depth without any 3D engine.
const PerspectiveGrid: React.FC<{ frame: number }> = ({ frame }) => {
  // Grid drifts very slowly forward across the entire scene. The drift is
  // measured in pixels of the un-rotated grid plane and is intentionally
  // small (~80px over 150 frames) so the eye reads it as ambient depth,
  // not motion.
  const drift = interpolate(frame, [0, 150], [0, 80], {
    easing: EASE_GRID,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        // perspective on the parent gives translateZ on the child meaning;
        // perspective-origin lower-center makes the floor recede correctly.
        perspective: 1400,
        perspectiveOrigin: '50% 38%',
        pointerEvents: 'none',
        // Mask out the top half so the grid only exists below the horizon
        // line, which is where a real floor would live. Fade aggressively
        // toward the horizon so we never see a hard line at the back.
        WebkitMaskImage:
          'linear-gradient(to bottom, transparent 38%, rgba(0,0,0,0.7) 60%, rgba(0,0,0,1) 100%)',
        maskImage:
          'linear-gradient(to bottom, transparent 38%, rgba(0,0,0,0.7) 60%, rgba(0,0,0,1) 100%)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          // Oversize the floor plane so its rotated edges reach beyond the
          // viewport corners; otherwise the rotation cuts the grid mid-frame.
          left: '-50%',
          right: '-50%',
          // Position the floor below the perspective origin so it slopes
          // away from the viewer.
          top: '40%',
          height: '160%',
          // Lay the plane flat by tilting it 62 degrees on X. translateZ
          // pushes the floor slightly back so the perspective foreshortening
          // is dramatic.
          transform: `rotateX(62deg) translateZ(-200px) translateY(${-drift}px)`,
          transformOrigin: '50% 0',
          // Two perpendicular repeating gradients = grid. Alpha is held
          // very low (0.06) so the grid is felt, not seen. The lines are
          // 1.5px on a 110px cell.
          backgroundImage: [
            'repeating-linear-gradient(0deg, rgba(64, 4, 218, 0.07) 0px, rgba(64, 4, 218, 0.07) 1.5px, transparent 1.5px, transparent 110px)',
            'repeating-linear-gradient(90deg, rgba(64, 4, 218, 0.07) 0px, rgba(64, 4, 218, 0.07) 1.5px, transparent 1.5px, transparent 110px)',
          ].join(', '),
        }}
      />
    </div>
  )
}

export const AudienceScene: React.FC<AudienceSceneProps> = (props) => {
  const merged = { ...audienceSceneDefaults, ...props }
  const industries = merged.industries
  const holdText = merged.holdText
  const frame = useCurrentFrame()

  // Hold-text opacity fades in cleanly after the last industry has cleared.
  const holdOpacity = interpolate(
    frame,
    [HOLD_FADE_IN_START, HOLD_FADE_IN_END],
    [0, 1],
    {
      easing: EASE_HOLD,
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  )
  // Hold-text rises a hair as it fades in (8px) so it lands rather than
  // appearing pre-placed.
  const holdLift = interpolate(
    frame,
    [HOLD_FADE_IN_START, HOLD_FADE_IN_END],
    [8, 0],
    {
      easing: EASE_HOLD,
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  )

  // Ambient drift on the held verdict line. Once the cascade is gone and
  // the line has settled (frame > 115), the eye lands here for ~35 frames.
  // Without drift the line freezes; ±5px / ±0.2% scale keeps it alive
  // without competing with the hold beat's gravity.
  const holdAmbientX = Math.sin(frame * 0.043) * 5
  const holdAmbientY = Math.cos(frame * 0.039) * 4
  const holdAmbientScale = 1 + Math.sin(frame * 0.050) * 0.002

  // Background vignette: extremely subtle radial darkening from bg toward
  // bgEdge, anchored at the perspective origin. This grounds the room.
  const bgGradient = `radial-gradient(ellipse at 50% 38%, ${theme.colors.bg} 0%, ${theme.colors.bg} 45%, ${theme.colors.bgEdge} 100%)`

  // Per-word scatter offsets · deterministic, one entry per industry.
  // REVISION v2: increased Y variance to ±100-150px so the cascade reads
  // as multiple lanes through space, not a single channel pumping words
  // through the screen center. X kept small (under 80px) so the eye still
  // anchors to the optical center of the frame.
  const SCATTER: ReadonlyArray<{ x: number; y: number }> = [
    { x: -60, y: -130 }, // Healthcare · upper left
    { x: 50, y: 110 }, // Finance · lower right
    { x: -40, y: 140 }, // Government · lower left
    { x: 70, y: -100 }, // Insurance · upper right
    { x: -55, y: -50 }, // Legal · slightly upper, near center-left
    { x: 30, y: 130 }, // Education · lower right (mirrors Finance lane)
  ]

  return (
    <AbsoluteFill
      style={{
        background: bgGradient,
        fontFamily: barlow,
        color: theme.colors.ink,
        // CRITICAL: perspective on the scene root gives the flying-word
        // translateZ values their depth. Without this, translateZ collapses
        // to zero and we get pure 2D scaling. 1200px puts the camera close
        // enough that the foreshortening is dramatic on the entry scale.
        perspective: 1200,
        perspectiveOrigin: '50% 50%',
        // Ensure children share the same 3D coordinate space.
        transformStyle: 'preserve-3d',
        // Hide overflow so words sailing off the depth plane don't spill
        // into the next composition during PitchVideo sequencing.
        overflow: 'hidden',
      }}
    >
      {/* Subtle perspective floor grid · stays under everything else. */}
      <PerspectiveGrid frame={frame} />

      {/* The cascade of flying industry names. */}
      {industries.map((industry, i) => {
        const spawnFrame = WORD_FIRST_SPAWN + i * WORD_SPAWN_GAP
        const scatter = SCATTER[i % SCATTER.length] ?? { x: 0, y: 0 }
        return (
          <FlyingWord
            key={industry}
            text={industry}
            spawnFrame={spawnFrame}
            frame={frame}
            xOffset={scatter.x}
            yOffset={scatter.y}
          />
        )
      })}

      {/* Final hold-line. Rendered last so it composes above any tail
          residue from the cascade. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingLeft: 240,
          paddingRight: 240,
          // The hold-line lives in 2D plane (no perspective math) — pull it
          // out of the parent's 3D context so it always renders crisp at
          // exactly its declared font size, regardless of camera depth.
          // Compose the entrance lift with the ambient drift so the line
          // never sits frozen during the 35f hold.
          transform: `translate(${holdAmbientX}px, ${holdLift + holdAmbientY}px) scale(${holdAmbientScale})`,
          opacity: holdOpacity,
          willChange: 'opacity, transform',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            fontFamily: barlow,
            fontSize: 64,
            fontWeight: 700,
            letterSpacing: -1.4,
            lineHeight: 1.18,
            color: theme.colors.ink,
            textAlign: 'center',
            maxWidth: 1500,
          }}
        >
          {holdText}
        </div>
      </div>

      {/* Reserve workSans in the runtime so this scene won't introduce a
          font-loading regression if a future revision needs body type. */}
      <span
        style={{
          position: 'absolute',
          width: 0,
          height: 0,
          overflow: 'hidden',
          fontFamily: workSans,
        }}
        aria-hidden
      />
    </AbsoluteFill>
  )
}
