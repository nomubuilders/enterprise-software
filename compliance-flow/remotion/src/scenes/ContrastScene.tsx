import { AbsoluteFill, Sequence, useCurrentFrame, interpolate, Easing, useVideoConfig } from 'remotion'
import { evolvePath } from '@remotion/paths'
import { loadFont } from '@remotion/google-fonts/Barlow'
import { TypeWriter, AnimatedCounter } from 'remotion-bits'
import { theme } from '../theme'
import { CostChart } from './CostChart'

const { fontFamily: barlow } = loadFont('normal', { weights: ['500', '700', '900'] })

// Scene 6 v4 · Cinematic Contrast (skill-guided rewrite)
// 450 frames (15s) standalone.
//
// Motion principles applied:
// - All animation via `interpolate` + `Easing.bezier`, not springs.
// - Each beat has a single normalized 0..1 progress; multiple properties derive from it.
// - Enter motion uses out-curves (decelerate). Exit motion uses in-curves (accelerate away).
// - Crisp UI entrance: cubic-bezier(0.16, 1, 0.3, 1) — the iOS deceleration curve.
// - Editorial slow moves: cubic-bezier(0.45, 0, 0.55, 1).
// - Overshoot/impact: cubic-bezier(0.34, 1.56, 0.64, 1).
// - Charts use @remotion/paths evolvePath for synchronized stroke-dash values.

// === Easing palette ===
const EASE_ENTER = Easing.bezier(0.16, 1, 0.3, 1)         // crisp UI entrance, decelerates
const EASE_EXIT = Easing.bezier(0.7, 0, 0.84, 0)          // accelerate away
const EASE_EDITORIAL = Easing.bezier(0.45, 0, 0.55, 1)    // slow camera, balanced
const EASE_IMPACT = Easing.bezier(0.34, 1.56, 0.64, 1)    // overshoot for impact
const EASE_MORPH = Easing.bezier(0.65, 0, 0.35, 1)        // smooth morph (size/position changes)

// === Timeline ===
// Per-row pacing now expanded: Cloud card rolls in, reader has 30 frames to read,
// Local card punches in as the contrast, then both hold. 74 frames per row.
const T = {
  titleEnterStart: 0,
  titleEnterEnd: 22,        // "Let's compare." lands centered, full size
  titleHoldEnd: 50,         // hold center
  titleMorphEnd: 80,        // morphs to top, smaller
  dividerStart: 70,
  dividerEnd: 110,
  // Sequential headers: Cloud first, then Local. Each gets a status icon after typing.
  cloudStart: 90,           // Cloud TypeWriter starts
  cloudIconStart: 110,      // X mark draws after Cloud finishes typing
  localStart: 130,          // Local TypeWriter starts
  localIconStart: 150,      // Check mark draws after Local finishes typing
  rowsStart: 175,
  // Per-row beats (relative to the row's startAt):
  rowCloudEnter: 14,                   // Cloud card roll-in frames
  rowReadHold: 32,                     // Reader has time to take in the Cloud claim
  rowLocalEnter: 14,                   // Local card roll-in frames (with overshoot)
  rowBothHold: 14,                     // Pair holds before next row begins
  rowDuration: 74,                     // 14 + 32 + 14 + 14
  rowsEnd: 175 + 5 * 74,               // 545
  crackStart: 555,                     // 10-frame breath after final row settles
  crackEnd: 578,
  chartCameraInStart: 578,
  // Legacy chart-phase constants. Referenced only by the dormant ChartScene
  // (kept in this file as backup per the no-delete-without-backup rule).
  // Active code uses CostChart, which has its own internal timeline.
  chartCameraInEnd: 615,
  chartPullbackStart: 615,
  chartPullbackEnd: 670,
  chartEscapeStart: 670,
  chartEscapeEnd: 715,
} as const

// === Chart geometry (in unscaled canvas-space) ===
const CHART = {
  left: 220,
  right: 1700,
  bottom: 880,
  top: 220,
  monthsTotal: 12,
}
const CHART_W = CHART.right - CHART.left
const CHART_H = CHART.bottom - CHART.top

// Cost data
const LOCAL_COSTS = [3000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
const CLOUD_COSTS = [200, 280, 380, 520, 720, 980, 1280, 1620, 1980, 2200, 2350, 2400]
const Y_NORMAL = 3500

// ====================================================================

export const ContrastScene: React.FC = () => {
  const frame = useCurrentFrame()
  const { width, height } = useVideoConfig()

  // Ink safety layer fades in as the circle nears full coverage.
  // Prevents any cream from peeking through at the canvas corners.
  // Also unmounts the cream world entirely once safe to avoid layout work.
  const inkSafetyOpacity = interpolate(frame, [T.crackEnd - 6, T.crackEnd + 2], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <AbsoluteFill style={{ background: theme.colors.ink, fontFamily: barlow }}>
      {/* Cream world. Visible until circle has covered. */}
      {frame < T.crackEnd + 4 && (
        <AbsoluteFill>
          <CreamBackground />
          <Title frame={frame} />
          <Divider frame={frame} />
          <SideHeaders frame={frame} />
          <Rows frame={frame} />
        </AbsoluteFill>
      )}

      {/* Circle wipes the cream away with an S-curve growth */}
      <CircleReveal frame={frame} width={width} height={height} />

      {/* Ink safety layer · solid black behind chart, prevents cream peek-through at corners */}
      <AbsoluteFill
        style={{
          background: theme.colors.ink,
          opacity: inkSafetyOpacity,
          pointerEvents: 'none',
        }}
      />

      {/* Chart in black world.
          Replaced legacy ChartScene with the polished standalone CostChart.
          ChartScene (and its helpers) are kept dormant below as backup.
          CostChart is 420 frames; ContrastScene total must be at least
          T.chartCameraInStart + 420 = 828 frames. See Root.tsx. */}
      <Sequence from={T.chartCameraInStart} durationInFrames={420}>
        <CostChart />
      </Sequence>
    </AbsoluteFill>
  )
}

// ====================================================================
// Cream world

const CreamBackground: React.FC = () => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse at 50% 40%, ${theme.colors.bg} 0%, ${theme.colors.bgSubtle} 60%, ${theme.colors.bgEdge} 100%)`,
    }}
  />
)

// === Title === ("Let's compare." typed in via TypeWriter, then morphs to top)

const Title: React.FC<{ frame: number }> = ({ frame }) => {
  // Morph progress controls size/position transition
  const morphP = interpolate(frame, [T.titleHoldEnd, T.titleMorphEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_MORPH,
  })

  const exitP = interpolate(frame, [T.crackStart - 8, T.crackStart], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_EXIT,
  })

  // Derive properties from morph progress
  const fontSize = interpolate(morphP, [0, 1], [180, 60])
  const top = interpolate(morphP, [0, 1], [430, 60])
  const letterSpacing = interpolate(morphP, [0, 1], [-7, -1.2])

  return (
    <div
      style={{
        position: 'absolute',
        top,
        left: 0,
        right: 0,
        textAlign: 'center',
        fontFamily: barlow,
        fontSize,
        fontWeight: 900,
        color: theme.colors.ink,
        letterSpacing,
        lineHeight: 1,
        opacity: 1 - exitP,
        display: 'flex',
        justifyContent: 'center',
        gap: '0.25em',
      }}
    >
      {/* Two TypeWriters fire sequentially. First the gray ink "Let's", then the purple "compare." */}
      <Sequence from={T.titleEnterStart} layout="none">
        <TypeWriter
          text="Let's"
          typeSpeed={2}
          cursor={false}
          style={{ display: 'inline-block', color: theme.colors.ink }}
        />
      </Sequence>
      <Sequence from={T.titleEnterStart + 12} layout="none">
        <TypeWriter
          text="compare."
          typeSpeed={2}
          cursor={false}
          style={{ display: 'inline-block', color: theme.colors.purple }}
        />
      </Sequence>
    </div>
  )
}

// === Divider === (vertical line growing from bottom)

const Divider: React.FC<{ frame: number }> = ({ frame }) => {
  const growP = interpolate(frame, [T.dividerStart, T.dividerEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_ENTER,
  })

  const exitP = interpolate(frame, [T.crackStart - 8, T.crackStart], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_EXIT,
  })

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        bottom: 60,
        transform: 'translateX(-50%)',
        width: 2,
        height: `${growP * 80}%`,
        background: `linear-gradient(to top, ${theme.colors.purple} 0%, ${theme.colors.divider} 30%, ${theme.colors.divider} 100%)`,
        opacity: 1 - exitP,
        boxShadow: `0 0 24px ${theme.colors.purpleEdge}`,
      }}
    />
  )
}

// === Side headers === Sequential reveal · Cloud first with X, Local second with check.

const SideHeaders: React.FC<{ frame: number }> = ({ frame }) => {
  const exitP = interpolate(frame, [T.crackStart - 8, T.crackStart], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_EXIT,
  })

  const exitOpacity = 1 - exitP

  return (
    <>
      {/* CLOUD (left) — types in first, then X mark scribbles in next to it */}
      <div
        style={{
          position: 'absolute',
          top: 200,
          left: 0,
          width: '50%',
          paddingRight: 100,
          fontFamily: barlow,
          opacity: exitOpacity,
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: 32,
        }}
      >
        <XMark frame={frame} startAt={T.cloudIconStart} size={68} color={theme.colors.bad} />
        <span
          style={{
            fontSize: 96,
            fontWeight: 700,
            color: theme.colors.inkMuted,
            letterSpacing: -3,
            lineHeight: 1,
          }}
        >
          <Sequence from={T.cloudStart} layout="none">
            <TypeWriter
              text="Cloud"
              typeSpeed={2}
              cursor={false}
              style={{ color: theme.colors.inkMuted, fontWeight: 700 }}
            />
          </Sequence>
        </span>
      </div>

      {/* LOCAL (right) — types in second, then check mark scribbles in next to it */}
      <div
        style={{
          position: 'absolute',
          top: 200,
          right: 0,
          width: '50%',
          paddingLeft: 100,
          fontFamily: barlow,
          opacity: exitOpacity,
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'center',
          gap: 32,
        }}
      >
        <span
          style={{
            fontSize: 96,
            fontWeight: 900,
            color: theme.colors.purple,
            letterSpacing: -3,
            lineHeight: 1,
          }}
        >
          <Sequence from={T.localStart} layout="none">
            <TypeWriter
              text="Local"
              typeSpeed={2}
              cursor={false}
              style={{ color: theme.colors.purple, fontWeight: 900 }}
            />
          </Sequence>
        </span>
        <CheckMark frame={frame} startAt={T.localIconStart} size={68} color={theme.colors.good} />
      </div>
    </>
  )
}

// === Status icons === draw in with SVG stroke animation, slight overshoot

const XMark: React.FC<{ frame: number; startAt: number; size: number; color: string }> = ({
  frame,
  startAt,
  size,
  color,
}) => {
  // Don't render anything before startAt. Prevents stroke-linecap residue showing as dots.
  if (frame < startAt) return null

  // First diagonal: 0-12 frames. Second diagonal: 8-20 frames (overlapping for energy).
  const stroke1P = interpolate(frame, [startAt, startAt + 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_IMPACT,
  })
  const stroke2P = interpolate(frame, [startAt + 8, startAt + 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_IMPACT,
  })

  const inset = size * 0.2
  const a = inset
  const b = size - inset
  const lineLen = Math.sqrt(2 * (b - a) ** 2)

  return (
    <svg width={size} height={size} style={{ overflow: 'visible' }}>
      <line
        x1={a}
        y1={a}
        x2={b}
        y2={b}
        stroke={color}
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={lineLen}
        strokeDashoffset={lineLen * (1 - stroke1P)}
      />
      <line
        x1={b}
        y1={a}
        x2={a}
        y2={b}
        stroke={color}
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={lineLen}
        strokeDashoffset={lineLen * (1 - stroke2P)}
      />
    </svg>
  )
}

const CheckMark: React.FC<{ frame: number; startAt: number; size: number; color: string }> = ({
  frame,
  startAt,
  size,
  color,
}) => {
  if (frame < startAt) return null

  // Single fluid stroke from low-left to mid-down to upper-right
  const drawP = interpolate(frame, [startAt, startAt + 16], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_IMPACT,
  })

  const path = `M ${size * 0.18} ${size * 0.52} L ${size * 0.42} ${size * 0.74} L ${size * 0.82} ${size * 0.28}`
  const { strokeDasharray, strokeDashoffset } = evolvePath(drawP, path)

  return (
    <svg width={size} height={size} style={{ overflow: 'visible' }}>
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={strokeDasharray}
        strokeDashoffset={strokeDashoffset}
      />
    </svg>
  )
}

// === Comparison rows ===

const ROWS = [
  { left: 'Locked into one model',         right: 'Pick any open model' },
  { left: 'Your data leaves the box',      right: 'Stays on your hardware' },
  { left: 'Model can be nerfed overnight', right: 'You own the version forever' },
  { left: 'No audit trail',                right: 'Every step is evidence' },
  { left: 'Black-box decisions',           right: 'Built-in explainability' },
]

const Rows: React.FC<{ frame: number }> = ({ frame }) => {
  const exitP = interpolate(frame, [T.crackStart - 8, T.crackStart], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_EXIT,
  })

  return (
    <div
      style={{
        position: 'absolute',
        top: 360,
        left: 0,
        right: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 22,
        opacity: 1 - exitP,
        // Perspective applied at the rows wrapper so each card pair shares the same
        // vanishing point. preserve-3d lets the cards' rotateY/translateZ compose
        // with their parent flex layout without flattening.
        perspective: '1400px',
        perspectiveOrigin: '50% 50%',
        transformStyle: 'preserve-3d',
      }}
    >
      {ROWS.map((row, i) => {
        const startAt = T.rowsStart + i * T.rowDuration
        return <RowPair key={i} left={row.left} right={row.right} startAt={startAt} frame={frame} />
      })}
    </div>
  )
}

// Per-row 3D card pair · sequential pacing
//
// Beat 1 (0..14): Cloud card rolls in from a steep -85° rotateY, lands at -12°.
//                 Decelerate easing — neutral, "the setup."
// Beat 2 (14..46): Read window. Cloud card rests, Local slot empty.
// Beat 3 (46..60): Local card rolls in from +85° to +12° with overshoot.
//                  IMPACT easing — satisfying snap, "the answer."
// Beat 4 (60..74): Both rest before next row begins.
//
// Cloud rest pose recedes (rotateY -12°, z -30) and Local rest pose advances
// (rotateY +12°, z +30) so the pair faces each other across the divider.
// Red ambient glow on Cloud, green ambient glow on Local.
const RowPair: React.FC<{
  left: string
  right: string
  startAt: number
  frame: number
}> = ({ left, right, startAt, frame }) => {
  const cloudEnterP = interpolate(frame, [startAt, startAt + T.rowCloudEnter], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_ENTER,
  })

  const localStart = startAt + T.rowCloudEnter + T.rowReadHold
  const localEnterP = interpolate(frame, [localStart, localStart + T.rowLocalEnter], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_IMPACT,
  })

  // Cloud: roll from rotateY -85°, z -160 (edge-on, far back) to rest at -12°, z -30.
  const cloudRotY = interpolate(cloudEnterP, [0, 1], [-85, -12])
  const cloudTz = interpolate(cloudEnterP, [0, 1], [-160, -30])
  const cloudTx = interpolate(cloudEnterP, [0, 1], [-40, 0])

  // Local: roll from rotateY +85°, z -160 to rest at +12°, z +30 (advancing toward camera).
  const localRotY = interpolate(localEnterP, [0, 1], [85, 12])
  const localTz = interpolate(localEnterP, [0, 1], [-160, 30])
  const localTx = interpolate(localEnterP, [0, 1], [40, 0])

  // Glow strengths track the entrance progress so the ambient color "lights up"
  // as the card materializes, rather than being on from frame zero.
  const cloudGlowAlpha = cloudEnterP * 0.22
  const localGlowAlpha = localEnterP * 0.28

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', minHeight: 76 }}>
      {/* CLOUD card · left half · red-tinted, recedes */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'flex-end',
          paddingRight: 56,
          transformStyle: 'preserve-3d',
        }}
      >
        <div
          style={{
            minWidth: 460,
            maxWidth: 560,
            padding: '18px 30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            background: 'rgba(26, 22, 20, 0.025)',
            backdropFilter: 'blur(0.5px)',
            border: '1px solid rgba(224, 72, 72, 0.22)',
            borderRadius: 16,
            fontFamily: barlow,
            fontSize: 30,
            fontWeight: 500,
            color: theme.colors.inkMuted,
            letterSpacing: -0.4,
            lineHeight: 1.15,
            opacity: cloudEnterP,
            transform: `translate3d(${cloudTx}px, 0, ${cloudTz}px) rotateY(${cloudRotY}deg)`,
            transformStyle: 'preserve-3d',
            boxShadow: `-8px 14px 28px rgba(0, 0, 0, 0.05), 0 0 36px rgba(224, 72, 72, ${cloudGlowAlpha})`,
            willChange: 'transform, opacity',
          }}
        >
          {left}
        </div>
      </div>

      {/* LOCAL card · right half · green-tinted, advances toward camera */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'flex-start',
          paddingLeft: 56,
          transformStyle: 'preserve-3d',
        }}
      >
        <div
          style={{
            minWidth: 460,
            maxWidth: 560,
            padding: '18px 30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            background: 'rgba(64, 4, 218, 0.04)',
            border: '1px solid rgba(31, 167, 96, 0.30)',
            borderRadius: 16,
            fontFamily: barlow,
            fontSize: 30,
            fontWeight: 700,
            color: theme.colors.ink,
            letterSpacing: -0.4,
            lineHeight: 1.15,
            opacity: localEnterP,
            transform: `translate3d(${localTx}px, 0, ${localTz}px) rotateY(${localRotY}deg)`,
            transformStyle: 'preserve-3d',
            boxShadow: `8px 14px 30px rgba(64, 4, 218, 0.10), 0 0 40px rgba(31, 167, 96, ${localGlowAlpha})`,
            willChange: 'transform, opacity',
          }}
        >
          {right}
        </div>
      </div>
    </div>
  )
}

// ====================================================================
// Circle reveal · S-curve growth from center

const CircleReveal: React.FC<{ frame: number; width: number; height: number }> = ({ frame, width, height }) => {
  if (frame < T.crackStart) return null

  const cx = width / 2
  const cy = height / 2

  // Maximum radius needed to fully cover the canvas from center.
  // Use diagonal-from-center plus a 5% safety margin.
  const maxRadius = Math.sqrt((width / 2) ** 2 + (height / 2) ** 2) * 1.05

  // S-curve: accelerate in, decelerate out. Classic editorial sigmoid.
  const growP = interpolate(frame, [T.crackStart, T.crackEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_EDITORIAL, // bezier(0.45, 0, 0.55, 1)
  })

  const radius = growP * maxRadius

  return (
    <div
      style={{
        position: 'absolute',
        left: cx,
        top: cy,
        width: radius * 2,
        height: radius * 2,
        transform: 'translate(-50%, -50%)',
        borderRadius: '50%',
        background: theme.colors.ink,
        pointerEvents: 'none',
      }}
    />
  )
}

// ====================================================================
// Chart scene (black world)

const ChartScene: React.FC<{ frame: number; width: number; height: number }> = ({ frame, width, height }) => {
  // === Camera state via single normalized progresses ===

  // Phase A: zoomed in tight on month 0-1 (showing local hardware spike)
  // Phase B: pull back to show full chart
  // Phase C: extend axis, cloud line shoots off-frame

  const phaseAP = interpolate(frame, [T.chartCameraInStart, T.chartCameraInEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_ENTER,
  })
  const phaseBP = interpolate(frame, [T.chartPullbackStart, T.chartPullbackEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_EDITORIAL,
  })
  const phaseCP = interpolate(frame, [T.chartEscapeStart, T.chartEscapeEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_EDITORIAL,
  })

  // Camera scale: 1.7x (zoomed in tight enough to see the spike + baseline) → 1.0x → 0.85x.
  // 2.4x was too tight and clipped both the hardware spike and the cloud baseline.
  const camScale =
    1.7 + (1.0 - 1.7) * phaseBP + (0.85 - 1.0) * phaseCP

  // Camera focus.
  // Phase A: focused at month 0 area (x=300), midpoint between hardware spike (y≈314) and zero baseline (y=880).
  //          Midpoint = 597, which keeps both the spike and the flat zero in frame at 1.7x.
  // Phase B: pans to the chart center horizontally, vertical center.
  const camFocusX = 300 + (CHART_W / 2 + CHART.left - 300) * phaseBP
  const camFocusY = 600 + (CHART.top + CHART_H / 2 - 600) * phaseBP

  // Months revealed (1.5 in phase A, ramping up to 12 in phase B)
  const monthsRevealed = interpolate(
    phaseAP * 0.3 + phaseBP * 0.7,
    [0, 1],
    [1.5, 12],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )

  // === Chart paths ===

  const xAt = (i: number) => CHART.left + (i / (CHART.monthsTotal - 1)) * CHART_W
  // Y-axis stretches in phase C so the cloud line continues climbing past frame
  const yMaxEffective = Y_NORMAL + phaseCP * 6500
  const yAt = (cost: number) => CHART.bottom - (cost / yMaxEffective) * CHART_H

  // Local: step chart. One-time hardware payment at month 0, then flat at $0 forever.
  // Drawing this as a vertical drop at month 0 (not a diagonal) so the viewer reads it as
  // "instant payment, then nothing" rather than "gradual cost decrease over the first month."
  const localPath =
    `M ${xAt(0)} ${yAt(3000)} ` +              // top of spike at month 0
    `L ${xAt(0)} ${yAt(0)} ` +                  // vertical drop to baseline
    `L ${xAt(CHART.monthsTotal - 1)} ${yAt(0)}` // flat to end of timeline

  // Cloud: progressively reveal months, then in phase C extend off the top
  const cloudPath = (() => {
    const pts: string[] = [`M ${xAt(0)} ${yAt(CLOUD_COSTS[0])}`]
    const intMonth = Math.floor(monthsRevealed)
    const frac = monthsRevealed - intMonth

    for (let i = 1; i <= Math.min(intMonth, CHART.monthsTotal - 1); i++) {
      pts.push(`L ${xAt(i)} ${yAt(CLOUD_COSTS[i])}`)
    }
    if (frac > 0 && intMonth < CHART.monthsTotal - 1) {
      const x = xAt(intMonth) + (xAt(intMonth + 1) - xAt(intMonth)) * frac
      const y = yAt(CLOUD_COSTS[intMonth] + (CLOUD_COSTS[intMonth + 1] - CLOUD_COSTS[intMonth]) * frac)
      pts.push(`L ${x} ${y}`)
    }
    // Phase C: extend cloud line up and to the right, off-screen
    if (phaseCP > 0) {
      const escapeX = xAt(CHART.monthsTotal - 1) + phaseCP * 80
      const escapeY = yAt(CLOUD_COSTS[CHART.monthsTotal - 1]) - phaseCP * (CHART_H * 1.1)
      pts.push(`L ${escapeX} ${escapeY}`)
    }
    return pts.join(' ')
  })()

  // === Camera transform math ===

  // We want camFocusX,Y to be at the center of the screen at the given camScale.
  // transform-origin = top-left, so:
  //   screenX = origX * camScale + camTx
  // We want for the focus point: width/2 = camFocusX * camScale + camTx
  const camTx = width / 2 - camFocusX * camScale
  const camTy = height / 2 - camFocusY * camScale

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {/* Subtle dark grid */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(to right, rgba(254, 252, 253, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(254, 252, 253, 0.04) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Chart group with camera transform */}
      <svg
        width={width}
        height={height}
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'visible',
          transform: `translate(${camTx}px, ${camTy}px) scale(${camScale})`,
          transformOrigin: '0 0',
        }}
      >
        {/* Baseline */}
        <line
          x1={CHART.left}
          y1={CHART.bottom}
          x2={CHART.right}
          y2={CHART.bottom}
          stroke="rgba(254, 252, 253, 0.18)"
          strokeWidth={1}
        />

        {/* Local cost line */}
        <path
          d={localPath}
          fill="none"
          stroke={theme.colors.purple}
          strokeWidth={5}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: `drop-shadow(0 0 12px ${theme.colors.purpleEdge})` }}
        />

        {/* Cloud area glow under the line */}
        <path
          d={`${cloudPath} L ${xAt(CHART.monthsTotal - 1)} ${CHART.bottom} L ${xAt(0)} ${CHART.bottom} Z`}
          fill={theme.colors.orange}
          opacity={0.1}
        />

        {/* Cloud cost line */}
        <path
          d={cloudPath}
          fill="none"
          stroke={theme.colors.orange}
          strokeWidth={5}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: `drop-shadow(0 0 18px ${theme.colors.orangeEdge})` }}
        />

        {/* Endpoint markers */}
        <circle
          cx={xAt(0)}
          cy={yAt(LOCAL_COSTS[0])}
          r={9}
          fill={theme.colors.purple}
          stroke={theme.colors.ink}
          strokeWidth={3}
          opacity={interpolate(frame, [T.chartCameraInStart + 8, T.chartCameraInStart + 18], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })}
        />
        {monthsRevealed >= CHART.monthsTotal - 0.1 && (
          <circle
            cx={xAt(CHART.monthsTotal - 1) + (phaseCP > 0 ? phaseCP * 80 : 0)}
            cy={yAt(CLOUD_COSTS[CHART.monthsTotal - 1]) - (phaseCP > 0 ? phaseCP * CHART_H * 1.1 : 0)}
            r={9}
            fill={theme.colors.orange}
            stroke={theme.colors.ink}
            strokeWidth={3}
          />
        )}
      </svg>

      {/* Hardware spike label · phase A · AnimatedCounter rolls 0 → 3000 */}
      <ChartLabel
        sourceX={xAt(0)}
        sourceY={yAt(LOCAL_COSTS[0])}
        camScale={camScale}
        camTx={camTx}
        camTy={camTy}
        offsetX={32}
        offsetY={-60}
        opacity={interpolate(frame, [T.chartCameraInStart + 14, T.chartCameraInStart + 30], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: EASE_ENTER,
        }) * (1 - interpolate(frame, [T.chartEscapeStart, T.chartEscapeStart + 20], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        }))}
        sub="hardware · paid once"
        color={theme.colors.purple}
      >
        <AnimatedCounter
          transition={{
            values: [0, 3000],
            duration: 24,
            delay: T.chartCameraInStart + 14,
          }}
          prefix="$"
        />
      </ChartLabel>

      {/* Cloud running cost label · phase B · AnimatedCounter rolls 0 → 2400 */}
      <ChartLabel
        sourceX={xAt(CHART.monthsTotal - 1) + phaseCP * 80}
        sourceY={yAt(CLOUD_COSTS[CHART.monthsTotal - 1]) - phaseCP * CHART_H * 1.1}
        camScale={camScale}
        camTx={camTx}
        camTy={camTy}
        offsetX={32}
        offsetY={-60}
        opacity={interpolate(frame, [T.chartPullbackStart + 20, T.chartPullbackEnd], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: EASE_ENTER,
        })}
        sub="and counting..."
        color={theme.colors.orange}
      >
        <AnimatedCounter
          transition={{
            values: [0, 2400],
            duration: 36,
            delay: T.chartPullbackStart + 20,
          }}
          prefix="$"
          postfix="/mo"
        />
      </ChartLabel>

      {/* Off-frame indicator · phase C */}
      <OffFrameIndicator phaseCP={phaseCP} />

      {/* Final "still $0/mo" stamp · phase C */}
      <FinalLocalStamp phaseCP={phaseCP} />
    </AbsoluteFill>
  )
}

// === Chart label ===

const ChartLabel: React.FC<{
  sourceX: number
  sourceY: number
  camScale: number
  camTx: number
  camTy: number
  offsetX: number
  offsetY: number
  opacity: number
  sub: string
  color: string
  children: React.ReactNode
}> = ({ sourceX, sourceY, camScale, camTx, camTy, offsetX, offsetY, opacity, sub, color, children }) => {
  // Project chart-space to screen-space
  const screenX = sourceX * camScale + camTx
  const screenY = sourceY * camScale + camTy

  return (
    <div
      style={{
        position: 'absolute',
        top: screenY + offsetY,
        left: screenX + offsetX,
        opacity,
        fontFamily: barlow,
      }}
    >
      <div
        style={{
          fontSize: 40,
          fontWeight: 900,
          color,
          letterSpacing: -1.4,
          lineHeight: 1,
        }}
      >
        {children}
      </div>
      <div
        style={{
          fontSize: 13,
          color: 'rgba(254, 252, 253, 0.65)',
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          marginTop: 6,
          fontWeight: 600,
        }}
      >
        {sub}
      </div>
    </div>
  )
}

const OffFrameIndicator: React.FC<{ phaseCP: number }> = ({ phaseCP }) => {
  if (phaseCP < 0.3) return null

  const opacity = interpolate(phaseCP, [0.3, 0.6], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_ENTER,
  })
  const ty = interpolate(phaseCP, [0.3, 0.6], [16, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_ENTER,
  })

  return (
    <div
      style={{
        position: 'absolute',
        top: 70,
        right: 200,
        fontFamily: barlow,
        fontSize: 28,
        fontWeight: 700,
        color: theme.colors.orange,
        opacity,
        transform: `translateY(${ty}px)`,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <span style={{ fontSize: 40, fontWeight: 900, lineHeight: 1 }}>↑</span>
      <span>still climbing</span>
    </div>
  )
}

const FinalLocalStamp: React.FC<{ phaseCP: number }> = ({ phaseCP }) => {
  if (phaseCP < 0.5) return null

  const opacity = interpolate(phaseCP, [0.5, 0.8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_ENTER,
  })

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 100,
        right: 200,
        fontFamily: barlow,
        textAlign: 'right',
        opacity,
      }}
    >
      <div style={{ fontSize: 32, fontWeight: 900, color: theme.colors.purple, letterSpacing: -1, lineHeight: 1 }}>
        $0/mo
      </div>
      <div
        style={{
          fontSize: 13,
          color: 'rgba(254, 252, 253, 0.6)',
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          marginTop: 6,
          fontWeight: 600,
        }}
      >
        local · still flat
      </div>
    </div>
  )
}
