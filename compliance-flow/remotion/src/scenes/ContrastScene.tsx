import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion'
import { loadFont } from '@remotion/google-fonts/Barlow'
import { theme } from '../theme'

const { fontFamily: barlow } = loadFont('normal', { weights: ['500', '700', '900'] })

// Scene 6 v3 · Cinematic Contrast
// 450 frames (15s) standalone.
//
// Beat timeline (frames):
//   0-25    "Let's compare" title types/scales in to center, big
//   25-55   Title shrinks and rises to top of frame
//   50-90   Vertical divider grows from bottom up
//   80-115  Cloud / Local headers appear on each side
//   115-280 Five rows reveal sequentially
//   280-310 SCREEN CRACK · cream shatters, black bg revealed
//   310-340 Chart camera zoomed in on month 1, hardware spike for Local
//   340-410 Camera pulls back as months progress, lines extend
//   410-450 Cloud line escapes off top of frame, comedic relief

const ROWS = [
  { left: 'Locked into one model',         right: 'Pick any open model' },
  { left: 'Your data leaves the box',      right: 'Stays on your hardware' },
  { left: 'Model can be nerfed overnight', right: 'You own the version forever' },
  { left: 'No audit trail',                right: 'Every step is evidence' },
  { left: 'Black-box decisions',           right: 'Built-in explainability' },
]

const TITLE_REVEAL_END = 25
const TITLE_RISE_END = 55
const DIVIDER_START = 50
const DIVIDER_END = 90
const HEADERS_START = 80
const HEADERS_END = 115
const ROWS_START = 115
const ROW_GAP = 30 // frames between row pairs
const CRACK_START = 280
const CRACK_END = 310
const CHART_ZOOMED_START = 310
const CHART_PULLBACK_START = 340
const CHART_OFF_FRAME_START = 410

export const ContrastScene: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps, width, height } = useVideoConfig()

  // Background flips from cream to black at the crack moment
  const bgBlackness = interpolate(frame, [CRACK_START + 5, CRACK_END], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // After the crack we are in black territory. Hide the cream layer.
  const creamLayerOpacity = 1 - bgBlackness

  return (
    <AbsoluteFill style={{ background: theme.colors.ink, fontFamily: barlow }}>
      {/* Cream layer (will be cracked away) */}
      <AbsoluteFill style={{ opacity: creamLayerOpacity }}>
        <CreamBackground />
        <FilmGrain opacity={0.04} />

        {/* Title that lives in cream world */}
        <TitleReveal frame={frame} fps={fps} />

        {/* Divider grows from bottom up */}
        <DividerLine frame={frame} />

        {/* Cloud / Local side headers */}
        <SideHeaders frame={frame} fps={fps} />

        {/* Comparison rows */}
        <ComparisonRows frame={frame} fps={fps} />
      </AbsoluteFill>

      {/* Crack lines drawn over the transition */}
      <CrackOverlay frame={frame} width={width} height={height} />

      {/* Black world content (chart) */}
      {frame >= CHART_ZOOMED_START && (
        <BlackChartSequence frame={frame} fps={fps} width={width} height={height} />
      )}
    </AbsoluteFill>
  )
}

// ============================================================
// Cream world

const CreamBackground: React.FC = () => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse at 50% 40%, ${theme.colors.bg} 0%, ${theme.colors.bgSubtle} 60%, ${theme.colors.bgEdge} 100%)`,
    }}
  />
)

const FilmGrain: React.FC<{ opacity: number }> = ({ opacity }) => (
  <AbsoluteFill
    style={{
      pointerEvents: 'none',
      opacity,
      backgroundImage:
        'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\'><filter id=\'n\'><feTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'3\'/></filter><rect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.6\'/></svg>")',
      mixBlendMode: 'multiply',
    }}
  />
)

const TitleReveal: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  // Title appears at center, 160pt
  // At frame 25, starts moving up + shrinking
  // By frame 55, sits at top, 56pt

  const enter = spring({ frame, fps, config: { damping: 18, mass: 0.5 } })

  // Phase 1: 0-25 enter, big and centered
  // Phase 2: 25-55 shrink + rise
  // Phase 3: 55-CRACK_START hold at top, small

  const transitionProgress = interpolate(frame, [TITLE_REVEAL_END, TITLE_RISE_END], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // Vanish at crack moment
  const exitOpacity = interpolate(frame, [CRACK_START - 5, CRACK_START + 5], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const fontSize = interpolate(transitionProgress, [0, 1], [160, 56])
  const top = interpolate(transitionProgress, [0, 1], [440, 70])
  const letterSpacing = interpolate(transitionProgress, [0, 1], [-6, -1])

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
        opacity: enter * exitOpacity,
        transform: `translateY(${(1 - enter) * 24}px)`,
      }}
    >
      Let's <span style={{ color: theme.colors.purple }}>compare.</span>
    </div>
  )
}

const DividerLine: React.FC<{ frame: number }> = ({ frame }) => {
  // Grows from bottom up
  const grow = interpolate(frame, [DIVIDER_START, DIVIDER_END], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const exitOpacity = interpolate(frame, [CRACK_START - 5, CRACK_START + 5], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  const lineHeightPct = grow * 100
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        bottom: 60,
        transform: 'translateX(-50%)',
        width: 2,
        height: `${lineHeightPct * 0.78}%`,
        background: `linear-gradient(to top, ${theme.colors.purple} 0%, ${theme.colors.divider} 30%, ${theme.colors.divider} 100%)`,
        opacity: exitOpacity,
        boxShadow: `0 0 24px ${theme.colors.purpleEdge}`,
      }}
    />
  )
}

const SideHeaders: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const cloudReveal = spring({
    frame: frame - HEADERS_START,
    fps,
    config: { damping: 16, mass: 0.6 },
  })
  const localReveal = spring({
    frame: frame - (HEADERS_START + 6),
    fps,
    config: { damping: 16, mass: 0.6 },
  })

  const exitOpacity = interpolate(frame, [CRACK_START - 5, CRACK_START + 5], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: 200,
          left: 0,
          width: '50%',
          textAlign: 'right',
          paddingRight: 100,
          fontFamily: barlow,
          fontSize: 96,
          fontWeight: 700,
          color: theme.colors.inkMuted,
          letterSpacing: -3,
          opacity: cloudReveal * exitOpacity,
          transform: `translateX(${(1 - cloudReveal) * -32}px)`,
        }}
      >
        Cloud
      </div>
      <div
        style={{
          position: 'absolute',
          top: 200,
          right: 0,
          width: '50%',
          textAlign: 'left',
          paddingLeft: 100,
          fontFamily: barlow,
          fontSize: 96,
          fontWeight: 900,
          color: theme.colors.purple,
          letterSpacing: -3,
          opacity: localReveal * exitOpacity,
          transform: `translateX(${(1 - localReveal) * 32}px)`,
        }}
      >
        Local
      </div>
    </>
  )
}

const ComparisonRows: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const exitOpacity = interpolate(frame, [CRACK_START - 5, CRACK_START + 5], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <div
      style={{
        position: 'absolute',
        top: 380,
        left: 0,
        right: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        opacity: exitOpacity,
      }}
    >
      {ROWS.map((row, i) => {
        const startAt = ROWS_START + i * ROW_GAP
        return (
          <RowPair
            key={i}
            startAt={startAt}
            left={row.left}
            right={row.right}
            frame={frame}
            fps={fps}
          />
        )
      })}
    </div>
  )
}

const RowPair: React.FC<{
  startAt: number
  left: string
  right: string
  frame: number
  fps: number
}> = ({ startAt, left, right, frame, fps }) => {
  const leftReveal = spring({
    frame: frame - startAt,
    fps,
    config: { damping: 18, mass: 0.6 },
  })
  const rightReveal = spring({
    frame: frame - (startAt + 8),
    fps,
    config: { damping: 18, mass: 0.6 },
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', height: 70 }}>
      <div
        style={{
          flex: 1,
          textAlign: 'right',
          paddingRight: 100,
          fontFamily: barlow,
          fontSize: 36,
          fontWeight: 500,
          color: theme.colors.inkMuted,
          letterSpacing: -0.6,
          opacity: leftReveal,
          transform: `translateX(${(1 - leftReveal) * -32}px)`,
        }}
      >
        {left}
      </div>
      <div
        style={{
          flex: 1,
          textAlign: 'left',
          paddingLeft: 100,
          fontFamily: barlow,
          fontSize: 36,
          fontWeight: 700,
          color: theme.colors.ink,
          letterSpacing: -0.6,
          opacity: rightReveal,
          transform: `translateX(${(1 - rightReveal) * 32}px)`,
        }}
      >
        {right}
      </div>
    </div>
  )
}

// ============================================================
// Crack overlay

const CrackOverlay: React.FC<{ frame: number; width: number; height: number }> = ({ frame, width, height }) => {
  if (frame < CRACK_START) return null

  // Crack lines emanate from center
  const cx = width / 2
  const cy = height / 2

  // Hand-drawn-ish crack paths with mid-vertices for jaggedness
  const cracks: { d: string; len: number }[] = [
    { d: `M ${cx} ${cy} L ${cx - 80} ${cy - 180} L ${cx - 220} ${cy - 360} L ${cx - 280} ${cy - 540}`, len: 600 },
    { d: `M ${cx} ${cy} L ${cx + 100} ${cy - 160} L ${cx + 240} ${cy - 380} L ${cx + 320} ${cy - 560}`, len: 620 },
    { d: `M ${cx} ${cy} L ${cx + 180} ${cy + 80} L ${cx + 380} ${cy + 200} L ${cx + 600} ${cy + 280}`, len: 700 },
    { d: `M ${cx} ${cy} L ${cx - 200} ${cy + 100} L ${cx - 420} ${cy + 240} L ${cx - 640} ${cy + 320}`, len: 720 },
    { d: `M ${cx} ${cy} L ${cx - 60} ${cy + 200} L ${cx - 140} ${cy + 420} L ${cx - 200} ${cy + 600}`, len: 660 },
    { d: `M ${cx} ${cy} L ${cx + 80} ${cy + 220} L ${cx + 160} ${cy + 440} L ${cx + 240} ${cy + 600}`, len: 660 },
    { d: `M ${cx} ${cy} L ${cx + 280} ${cy - 60} L ${cx + 540} ${cy - 120} L ${cx + 800} ${cy - 80}`, len: 880 },
    { d: `M ${cx} ${cy} L ${cx - 280} ${cy - 60} L ${cx - 540} ${cy - 100} L ${cx - 820} ${cy - 60}`, len: 880 },
  ]

  // Cracks draw over 0-15 frames after CRACK_START
  const drawProgress = interpolate(frame, [CRACK_START, CRACK_START + 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // Cracks fade out as we move into the chart territory
  const fadeOut = interpolate(frame, [CHART_ZOOMED_START, CHART_ZOOMED_START + 30], [1, 0.18], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // Flash white at impact moment
  const flashOpacity = interpolate(frame, [CRACK_START, CRACK_START + 4, CRACK_START + 12], [0, 0.7, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <>
      {/* Brief white flash at crack moment */}
      <AbsoluteFill style={{ background: theme.colors.bg, opacity: flashOpacity }} />

      {/* Crack lines */}
      <svg width={width} height={height} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {cracks.map((c, i) => (
          <path
            key={i}
            d={c.d}
            fill="none"
            stroke={theme.colors.bg}
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray={c.len}
            strokeDashoffset={c.len * (1 - drawProgress)}
            opacity={fadeOut}
          />
        ))}
        {/* Bright crack center */}
        <circle cx={cx} cy={cy} r={drawProgress * 18} fill={theme.colors.bg} opacity={fadeOut * 0.4} />
      </svg>
    </>
  )
}

// ============================================================
// Black world chart sequence

const BlackChartSequence: React.FC<{ frame: number; fps: number; width: number; height: number }> = ({
  frame,
  fps,
  width,
  height,
}) => {
  // Camera zoom + translate state through the chart timeline
  // Phase A (310-340): zoomed in tight on month 1, hardware spike visible
  // Phase B (340-410): pull back, lines extend, months reveal
  // Phase C (410-450): camera tries to keep up, cloud line escapes off top

  // Chart geometry in unzoomed world coordinates
  const chartLeft = 200
  const chartRight = 1700
  const chartBottom = 880
  const chartTop = 200
  const chartW = chartRight - chartLeft
  const chartH = chartBottom - chartTop

  const monthsTotal = 12
  // Local: hardware spike at month 0 ($3000), then $0/mo onward
  // Cloud: starts $200, climbs steeply
  const localCosts = [3000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  const cloudCosts = [200, 280, 380, 520, 720, 980, 1280, 1620, 1980, 2200, 2350, 2400]
  const yMaxNormal = 3500
  const yMaxStretch = 8000 // when cloud climbs off-screen, expand virtual y axis

  // Determine virtual y max based on phase
  // Up to frame 410, use yMaxNormal so lines fit comfortably.
  // After 410, force the cloud cost to render as if line continues climbing past its actual data,
  // so we can have it shoot off-screen.

  const phaseAProgress = interpolate(frame, [CHART_ZOOMED_START, CHART_PULLBACK_START], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const phaseBProgress = interpolate(frame, [CHART_PULLBACK_START, CHART_OFF_FRAME_START], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const phaseCProgress = interpolate(frame, [CHART_OFF_FRAME_START, CHART_OFF_FRAME_START + 40], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // Camera scale + translate in CSS units
  // Phase A: scale 2.5, focused on left edge of chart (months 1-2 visible)
  // Phase B: scale 1.0, full chart visible
  // Phase C: scale 0.8, even wider, then in late C the line extends past frame
  const camScale = interpolate(
    frame,
    [CHART_ZOOMED_START, CHART_PULLBACK_START, CHART_OFF_FRAME_START, CHART_OFF_FRAME_START + 30],
    [2.5, 1.0, 0.85, 0.85],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )
  // Origin shifts from left-edge-focused to center
  const camOriginX = interpolate(
    frame,
    [CHART_ZOOMED_START, CHART_PULLBACK_START],
    [chartLeft + 100, chartLeft + chartW / 2],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )
  const camOriginY = chartBottom - 100

  // Determine y mapping. Use stretchY when cloud is climbing past frame.
  const stretchProgress = phaseCProgress
  const effectiveYMax = interpolate(stretchProgress, [0, 1], [yMaxNormal, yMaxStretch])
  const yAt = (cost: number) => chartBottom - (cost / effectiveYMax) * chartH

  // How many months are revealed at the current frame
  // Phase A: 1-2 months
  // Phase B: ramps from 2 to 12
  // Phase C: cloud line continues to extrapolate beyond month 12 (visually goes up off-screen)
  const monthsRevealed = interpolate(
    frame,
    [CHART_ZOOMED_START, CHART_ZOOMED_START + 20, CHART_PULLBACK_START, CHART_OFF_FRAME_START],
    [0, 2, 12, 12],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )

  // For Phase C: extrapolate cloud cost past month 12 to drive it off the top of the frame
  // Cloud at month 12 is 2400. Extrapolate to a cost that would render way off-screen.
  // We append a synthetic point at "month 13" with cost = effectiveYMax * 2 to force the line off-frame.
  // Actually simpler: in phase C, virtual chart "y axis" expands so the same $2400 looks lower,
  // and we draw an additional fake point that climbs off the top.

  // Build paths
  const xAt = (i: number) => chartLeft + (i / (monthsTotal - 1)) * chartW

  // Local path: hardware spike at month 0, then flat at $0
  const localFlat = (() => {
    const points: string[] = []
    points.push(`M ${xAt(0)} ${yAt(localCosts[0])}`)
    for (let i = 1; i < monthsTotal; i++) {
      points.push(`L ${xAt(i)} ${yAt(localCosts[i])}`)
    }
    return points.join(' ')
  })()

  // Cloud path. In phase C, append a synthetic point that escapes the frame.
  const cloudPathBuilder = () => {
    const points: string[] = []
    points.push(`M ${xAt(0)} ${yAt(cloudCosts[0])}`)
    const intMonths = Math.floor(monthsRevealed)
    const frac = monthsRevealed - intMonths
    for (let i = 1; i <= Math.min(intMonths, monthsTotal - 1); i++) {
      points.push(`L ${xAt(i)} ${yAt(cloudCosts[i])}`)
    }
    if (frac > 0 && intMonths < monthsTotal - 1) {
      const i = intMonths
      const x = xAt(i) + (xAt(i + 1) - xAt(i)) * frac
      const y = yAt(cloudCosts[i] + (cloudCosts[i + 1] - cloudCosts[i]) * frac)
      points.push(`L ${x} ${y}`)
    }
    // Phase C: extend beyond the chart with an off-frame escape
    if (phaseCProgress > 0) {
      const escapeY = yAt(cloudCosts[monthsTotal - 1]) - phaseCProgress * (chartH * 1.2)
      const escapeX = xAt(monthsTotal - 1) + phaseCProgress * 80
      points.push(`L ${escapeX} ${escapeY}`)
    }
    return points.join(' ')
  }
  const cloudPath = cloudPathBuilder()

  // Camera transform
  const camTx = (width / 2 - camOriginX) * (1 - 1 / camScale) * camScale
  const camTy = (height / 2 - camOriginY) * (1 - 1 / camScale) * camScale

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {/* Subtle grid (visible in black world) */}
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
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `scale(${camScale}) translate(${camTx / camScale}px, ${camTy / camScale}px)`,
          transformOrigin: '0 0',
        }}
      >
        <svg width={width} height={height} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
          {/* Baseline */}
          <line
            x1={chartLeft}
            y1={chartBottom}
            x2={chartRight}
            y2={chartBottom}
            stroke="rgba(254, 252, 253, 0.18)"
            strokeWidth={1}
          />

          {/* Local cost line */}
          <path
            d={localFlat}
            fill="none"
            stroke={theme.colors.purple}
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: `drop-shadow(0 0 12px ${theme.colors.purpleEdge})` }}
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

          {/* Cloud area glow */}
          <path
            d={`${cloudPath} L ${xAt(monthsTotal - 1)} ${chartBottom} L ${xAt(0)} ${chartBottom} Z`}
            fill={theme.colors.orange}
            opacity={0.1}
          />
        </svg>
      </div>

      {/* Local hardware label, appears in phase A */}
      <ChartLabel
        x={xAt(0)}
        y={yAt(localCosts[0])}
        camScale={camScale}
        camTx={camTx}
        camTy={camTy}
        text="$3,000"
        sub="hardware · paid once"
        color={theme.colors.purple}
        opacity={interpolate(frame, [CHART_ZOOMED_START + 8, CHART_ZOOMED_START + 22], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })}
      />

      {/* Cloud running cost label, appears in phase B */}
      <ChartLabel
        x={xAt(monthsTotal - 1)}
        y={yAt(cloudCosts[monthsTotal - 1])}
        camScale={camScale}
        camTx={camTx}
        camTy={camTy}
        text="$2,400/mo"
        sub="and counting..."
        color={theme.colors.orange}
        opacity={interpolate(frame, [CHART_PULLBACK_START + 30, CHART_PULLBACK_START + 50], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })}
        // Slide up with the line in phase C
        offsetY={phaseCProgress > 0 ? -phaseCProgress * (chartH * 1.0) : 0}
      />

      {/* Off-frame indicator: arrow pointing up at the top edge */}
      {phaseCProgress > 0.4 && (
        <div
          style={{
            position: 'absolute',
            top: 60,
            right: 200,
            fontFamily: barlow,
            fontSize: 28,
            fontWeight: 700,
            color: theme.colors.orange,
            opacity: interpolate(phaseCProgress, [0.4, 0.7], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
            transform: `translateY(${interpolate(phaseCProgress, [0.4, 0.7], [12, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            })}px)`,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 36, fontWeight: 900 }}>↑</span>
          <span>still climbing</span>
        </div>
      )}

      {/* Local label "still $0/mo" stays at bottom */}
      {phaseCProgress > 0.5 && (
        <div
          style={{
            position: 'absolute',
            bottom: 100,
            right: 200,
            fontFamily: barlow,
            color: theme.colors.purple,
            textAlign: 'right',
            opacity: interpolate(phaseCProgress, [0.5, 0.8], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        >
          <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: -1, lineHeight: 1 }}>$0/mo</div>
          <div
            style={{
              fontSize: 13,
              color: 'rgba(254, 252, 253, 0.6)',
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              marginTop: 4,
              fontWeight: 600,
            }}
          >
            local · still flat
          </div>
        </div>
      )}
    </AbsoluteFill>
  )
}

const ChartLabel: React.FC<{
  x: number
  y: number
  camScale: number
  camTx: number
  camTy: number
  text: string
  sub: string
  color: string
  opacity: number
  offsetY?: number
}> = ({ x, y, camScale, camTx, camTy, text, sub, color, opacity, offsetY = 0 }) => {
  // Project chart-space coords to screen coords
  const screenX = x * camScale + camTx
  const screenY = (y + offsetY) * camScale + camTy

  return (
    <div
      style={{
        position: 'absolute',
        top: screenY - 60,
        left: screenX + 24,
        opacity,
        fontFamily: barlow,
      }}
    >
      <div style={{ fontSize: 36, fontWeight: 900, color, letterSpacing: -1, lineHeight: 1 }}>{text}</div>
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
