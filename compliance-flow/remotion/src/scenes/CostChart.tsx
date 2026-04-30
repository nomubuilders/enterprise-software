import { AbsoluteFill, useCurrentFrame, interpolate, Easing, useVideoConfig } from 'remotion'
import { evolvePath } from '@remotion/paths'
import { loadFont } from '@remotion/google-fonts/Barlow'
import { AnimatedCounter } from 'remotion-bits'

const { fontFamily: barlow } = loadFont('normal', { weights: ['500', '700', '900'] })

// ============================================================================
// CostChart · 450 frames @ 30fps · 1920x1080 dark theme
//
// Both lines start at the same spot. Cloud climbs, camera chases the cloud tip,
// local naturally exits the bottom of the frame as the camera moves up.
// Then camera pulls back wide to reveal the gap: cloud way up, local way down.
// ============================================================================

const C = {
  ink: '#0F0D0C',                          // deeper black so glows pop harder
  ash: 'rgba(254, 252, 253, 0.78)',        // brighter labels for dark bg
  whisper: 'rgba(254, 252, 253, 0.28)',
  faint: 'rgba(254, 252, 253, 0.12)',
  bg: '#FEFCFD',
  // Cloud (orange) tuned for dark bg: pure brand orange + bright multi-stop halo
  orange: '#FF7A2D',                       // slight brighten for dark-bg legibility
  orangeGlow: 'rgba(255, 122, 45, 0.85)',  // tight inner glow
  orangeHalo: 'rgba(255, 122, 45, 0.55)',  // outer halo
  // Local (purple) brightened for dark-bg visibility — brand purple #4004DA was too deep against ink
  purple: '#7C4DFF',                       // brighter violet that still reads as the brand purple family
  purpleGlow: 'rgba(124, 77, 255, 0.85)',
  purpleHalo: 'rgba(124, 77, 255, 0.55)',
} as const

const EASE_ENTER = Easing.bezier(0.16, 1, 0.3, 1)
const EASE_EDITORIAL = Easing.bezier(0.45, 0, 0.55, 1)

// === Timeline · faster pacing v2 ===
const T = {
  setupStart: 0,
  setupEnd: 25,
  chaseStart: 25,
  chaseEnd: 175,        // was 300 · 150-frame chase (5s) instead of 260
  revealStart: 175,
  revealEnd: 230,
  creepStart: 230,
  creepEnd: 420,
  headlineStart: 200,
  headlineEnd: 230,
  // Cloud-tag exit · the chase counter fades out as the creep counter takes over
  cloudTagExitStart: 220,
  cloudTagExitEnd: 240,
} as const

// === Chart geometry ===
const CHART = {
  left: 240,
  right: 1680,
  bottom: 880,
  top: 220,
  quartersTotal: 8,           // 8 quarters = 2 years
} as const
const CHART_W = CHART.right - CHART.left
const CHART_H = CHART.bottom - CHART.top

// === Data ===
// Cumulative spend at $200/mo subscription over 8 quarters (2 years).
// Each quarter = 3 months × $200 = $600 incremental, climbing linearly.
// First point is $200 (month 1 of subscription). Last is $4,800 (after 24 months).
// Steeper first segment is intentional · communicates "you start cheap, then it stacks."
const CLOUD_COSTS = [200, 1200, 1800, 2400, 3000, 3600, 4200, 4800] as const
const Y_MAX = 5500           // accommodates $4,800 endpoint plus creep extension

const xAt = (i: number) => CHART.left + (i / (CHART.quartersTotal - 1)) * CHART_W
const yAt = (cost: number) => CHART.bottom - (cost / Y_MAX) * CHART_H

// Pre-built paths
const CLOUD_PATH = (() => {
  const pts = [`M ${xAt(0)} ${yAt(CLOUD_COSTS[0])}`]
  for (let i = 1; i < CHART.quartersTotal; i++) {
    pts.push(`L ${xAt(i)} ${yAt(CLOUD_COSTS[i])}`)
  }
  return pts.join(' ')
})()

const LOCAL_PATH = `M ${xAt(0)} ${yAt(0)} L ${xAt(CHART.quartersTotal - 1)} ${yAt(0)}`

// ============================================================================

export const CostChart: React.FC = () => {
  const frame = useCurrentFrame()
  const { width, height } = useVideoConfig()

  // === Phase progresses ===
  const setupP = interpolate(frame, [T.setupStart, T.setupEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_ENTER,
  })
  const chaseP = interpolate(frame, [T.chaseStart, T.chaseEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_EDITORIAL,
  })
  const revealP = interpolate(frame, [T.revealStart, T.revealEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_EDITORIAL,
  })

  // === Cloud line drawing progress ===
  // Cloud draws progressively across phase 2 (the chase)
  const cloudDrawP = chaseP

  // === Cloud tip position in chart-space ===
  // Tracks where the line is currently being drawn
  const quartersRevealed = cloudDrawP * (CHART.quartersTotal - 1)
  const tipQuarter = Math.min(quartersRevealed, CHART.quartersTotal - 1)
  const intM = Math.floor(tipQuarter)
  const fracM = tipQuarter - intM
  const tipX =
    intM >= CHART.quartersTotal - 1
      ? xAt(CHART.quartersTotal - 1)
      : xAt(intM) + (xAt(intM + 1) - xAt(intM)) * fracM
  const tipCost =
    intM >= CHART.quartersTotal - 1
      ? CLOUD_COSTS[CLOUD_COSTS.length - 1]
      : CLOUD_COSTS[intM] + (CLOUD_COSTS[intM + 1] - CLOUD_COSTS[intM]) * fracM
  const tipY = yAt(tipCost)

  // === Camera state ===
  // Phase 1 (setup): zoomed-in near the start, both lines visible together
  // Phase 2 (chase): camera tracks the cloud tip (X right, Y up)
  // Phase 3 (reveal): pull back to chart center at low zoom, both lines visible

  // Setup focus: month 0-1 area, lower portion of chart so both starts are visible
  const setupFocusX = xAt(0.5)
  const setupFocusY = yAt(150)

  // Chase focus: tracks the cloud tip
  const chaseFocusX = tipX
  const chaseFocusY = tipY

  // Reveal focus: chart center (wide angle)
  const revealFocusX = (CHART.left + CHART.right) / 2
  const revealFocusY = (CHART.top + CHART.bottom) / 2 + 80 // slight downward bias for label space

  // Blend between phases for smooth camera motion
  const camFocusX =
    setupFocusX +
    (chaseFocusX - setupFocusX) * Math.min(chaseP, 1) +
    (revealFocusX - chaseFocusX) * revealP
  const camFocusY =
    setupFocusY +
    (chaseFocusY - setupFocusY) * Math.min(chaseP, 1) +
    (revealFocusY - chaseFocusY) * revealP

  // Scale: 1.6x setup, stays 1.6x during chase, drops to 0.85x for reveal
  const camScale = 1.6 + (1.6 - 1.6) * chaseP + (0.85 - 1.6) * revealP

  // Transform math
  const camTx = width / 2 - camFocusX * camScale
  const camTy = height / 2 - camFocusY * camScale

  return (
    <AbsoluteFill style={{ background: C.ink, fontFamily: barlow }}>
      <BackgroundGrid />

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
        <AxisGuides />
        <CloudAreaFill cloudDrawP={cloudDrawP} />
        <LocalLine />
        <CloudLine cloudDrawP={cloudDrawP} />
        <EndpointDots cloudDrawP={cloudDrawP} tipX={tipX} tipY={tipY} />
        <CloudTipPulse frame={frame} cloudDrawP={cloudDrawP} tipX={tipX} tipY={tipY} />
      </svg>

      {/* Tags · screen-space, projected from their tracked chart-space positions */}
      <CloudTag
        frame={frame}
        camScale={camScale}
        camTx={camTx}
        camTy={camTy}
        tipX={tipX}
        tipY={tipY}
        setupP={setupP}
      />
      <LocalTag
        camScale={camScale}
        camTx={camTx}
        camTy={camTy}
        setupP={setupP}
        revealP={revealP}
      />

      {/* Headline · "After 2 years..." with ratio · phase 3 */}
      <HeadlineReveal frame={frame} />

      {/* Hardware note · subtle annotation grounding the local side */}
      {/* HardwareNote removed per user · costs are about subscription, not hardware */}

      {/* Forever creep · cloud line keeps drifting upward past the chart top · phase 4 */}
      <ForeverCreep frame={frame} camScale={camScale} camTx={camTx} camTy={camTy} />

      <QuarterLabels camScale={camScale} camTx={camTx} camTy={camTy} />
    </AbsoluteFill>
  )
}

// ============================================================================

const BackgroundGrid: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      backgroundImage: `linear-gradient(to right, ${C.faint} 1px, transparent 1px), linear-gradient(to bottom, ${C.faint} 1px, transparent 1px)`,
      backgroundSize: '60px 60px',
      pointerEvents: 'none',
    }}
  />
)

const AxisGuides: React.FC = () => {
  const ticks = [0, 1000, 2000, 3000, 4000, 5000]
  return (
    <g>
      {ticks.map((tick) => {
        const y = yAt(tick)
        return (
          <g key={tick}>
            <line
              x1={CHART.left}
              y1={y}
              x2={CHART.right}
              y2={y}
              stroke={tick === 0 ? C.whisper : C.faint}
              strokeWidth={tick === 0 ? 1.5 : 1}
              strokeDasharray={tick === 0 ? '0' : '4 8'}
            />
            <text
              x={CHART.left - 18}
              y={y + 5}
              textAnchor="end"
              style={{ fontFamily: barlow, fontSize: 36, fill: C.ash, fontWeight: 500 }}
            >
              {tick === 0 ? '$0' : `$${tick / 1000}K`}
            </text>
          </g>
        )
      })}
    </g>
  )
}

const LocalLine: React.FC = () => (
  <>
    {/* Outer halo · soft, wide */}
    <path
      d={LOCAL_PATH}
      fill="none"
      stroke={C.purpleHalo}
      strokeWidth={18}
      strokeLinecap="round"
      opacity={0.5}
      style={{ filter: `blur(8px)` }}
    />
    {/* Main stroke with bright drop-shadow */}
    <path
      d={LOCAL_PATH}
      fill="none"
      stroke={C.purple}
      strokeWidth={7}
      strokeLinecap="round"
      style={{
        filter: `drop-shadow(0 0 6px ${C.purpleGlow}) drop-shadow(0 0 22px ${C.purpleHalo})`,
      }}
    />
  </>
)

const CloudLine: React.FC<{ cloudDrawP: number }> = ({ cloudDrawP }) => {
  if (cloudDrawP <= 0) return null
  const { strokeDasharray, strokeDashoffset } = evolvePath(cloudDrawP, CLOUD_PATH)
  return (
    <>
      {/* Outer halo */}
      <path
        d={CLOUD_PATH}
        fill="none"
        stroke={C.orangeHalo}
        strokeWidth={20}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={strokeDasharray}
        strokeDashoffset={strokeDashoffset}
        opacity={0.55}
        style={{ filter: `blur(10px)` }}
      />
      {/* Main stroke with multi-stop drop-shadow */}
      <path
        d={CLOUD_PATH}
        fill="none"
        stroke={C.orange}
        strokeWidth={7}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={strokeDasharray}
        strokeDashoffset={strokeDashoffset}
        style={{
          filter: `drop-shadow(0 0 6px ${C.orangeGlow}) drop-shadow(0 0 28px ${C.orangeHalo})`,
        }}
      />
    </>
  )
}

const CloudAreaFill: React.FC<{ cloudDrawP: number }> = ({ cloudDrawP }) => {
  if (cloudDrawP <= 0) return null

  const quartersRevealed = cloudDrawP * (CHART.quartersTotal - 1)
  const intQuarter = Math.floor(quartersRevealed)
  const frac = quartersRevealed - intQuarter

  const pts = [`M ${xAt(0)} ${CHART.bottom}`, `L ${xAt(0)} ${yAt(CLOUD_COSTS[0])}`]
  for (let i = 1; i <= Math.min(intQuarter, CHART.quartersTotal - 1); i++) {
    pts.push(`L ${xAt(i)} ${yAt(CLOUD_COSTS[i])}`)
  }
  if (frac > 0 && intQuarter < CHART.quartersTotal - 1) {
    const x = xAt(intQuarter) + (xAt(intQuarter + 1) - xAt(intQuarter)) * frac
    const y = yAt(CLOUD_COSTS[intQuarter] + (CLOUD_COSTS[intQuarter + 1] - CLOUD_COSTS[intQuarter]) * frac)
    pts.push(`L ${x} ${y}`, `L ${x} ${CHART.bottom}`)
  } else {
    pts.push(`L ${xAt(Math.min(intQuarter, CHART.quartersTotal - 1))} ${CHART.bottom}`)
  }
  pts.push('Z')

  return <path d={pts.join(' ')} fill={C.orange} opacity={0.22} />
}

const EndpointDots: React.FC<{ cloudDrawP: number; tipX: number; tipY: number }> = ({
  cloudDrawP,
  tipX,
  tipY,
}) => (
  <g>
    {/* Local start dot · with outer halo */}
    <circle cx={xAt(0)} cy={yAt(0)} r={20} fill={C.purpleHalo} opacity={0.5} style={{ filter: 'blur(6px)' }} />
    <circle cx={xAt(0)} cy={yAt(0)} r={9} fill={C.purple} stroke={C.ink} strokeWidth={3} style={{ filter: `drop-shadow(0 0 8px ${C.purpleGlow})` }} />
    {/* Local end dot */}
    <circle cx={xAt(CHART.quartersTotal - 1)} cy={yAt(0)} r={20} fill={C.purpleHalo} opacity={0.5} style={{ filter: 'blur(6px)' }} />
    <circle
      cx={xAt(CHART.quartersTotal - 1)}
      cy={yAt(0)}
      r={9}
      fill={C.purple}
      stroke={C.ink}
      strokeWidth={3}
      style={{ filter: `drop-shadow(0 0 8px ${C.purpleGlow})` }}
    />
    {/* Cloud tip dot · tracks the line head with bright halo */}
    {cloudDrawP > 0 && (
      <>
        <circle cx={tipX} cy={tipY} r={24} fill={C.orangeHalo} opacity={0.6} style={{ filter: 'blur(8px)' }} />
        <circle cx={tipX} cy={tipY} r={10} fill={C.orange} stroke={C.ink} strokeWidth={3} style={{ filter: `drop-shadow(0 0 10px ${C.orangeGlow})` }} />
      </>
    )}
  </g>
)

const CloudTipPulse: React.FC<{
  frame: number
  cloudDrawP: number
  tipX: number
  tipY: number
}> = ({ frame, cloudDrawP, tipX, tipY }) => {
  if (cloudDrawP <= 0 || cloudDrawP >= 1) return null
  const pulse = 1 + 0.4 * Math.abs(Math.sin((frame * Math.PI) / 1.5))
  return <circle cx={tipX} cy={tipY} r={11 * pulse} fill={C.orange} opacity={0.3} />
}

// ============================================================================
// Tags

const CloudTag: React.FC<{
  frame: number
  camScale: number
  camTx: number
  camTy: number
  tipX: number
  tipY: number
  setupP: number
}> = ({ frame, camScale, camTx, camTy, tipX, tipY, setupP }) => {
  if (frame < T.setupStart) return null

  // Exit fade · once forever-creep takes over, the chase counter retires
  const exitFade = interpolate(frame, [T.cloudTagExitStart, T.cloudTagExitEnd], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_EDITORIAL,
  })

  if (exitFade <= 0.01) return null

  const screenX = tipX * camScale + camTx
  const screenY = tipY * camScale + camTy

  return (
    <div
      style={{
        position: 'absolute',
        top: screenY - 70,
        left: screenX + 24,
        opacity: setupP * exitFade,
        transform: `translateY(${(1 - setupP) * 12}px)`,
        fontFamily: barlow,
      }}
    >
      <div
        style={{
          fontSize: 96,
          fontWeight: 700,
          color: C.orange,
          letterSpacing: -1.2,
          lineHeight: 1,
        }}
      >
        <AnimatedCounter
          transition={{
            // Counter ramps faster as it climbs (item E) — non-linear keyframes give the
            // slot-machine feel the closer you get to the final number.
            values: [600, 1800, 3000, 4200, 4800],
            duration: T.chaseEnd - T.chaseStart,
            delay: T.chaseStart,
          }}
          prefix="$"
        />
      </div>
      <div
        style={{
          fontSize: 32,
          color: C.ash,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          marginTop: 6,
          fontWeight: 600,
        }}
      >
        Cloud · total spent
      </div>
    </div>
  )
}

const LocalTag: React.FC<{
  camScale: number
  camTx: number
  camTy: number
  setupP: number
  revealP: number
}> = ({ camScale, camTx, camTy, setupP, revealP }) => {
  // During the chase the tag would be off-screen as the camera leaves it behind.
  // We hide it through the chase to avoid confusing position math, then bring it
  // back when the reveal phase pulls the camera back.
  // Visible: phase 1 (start) and phase 3 (reveal).
  // Phase 2: faded out as camera moves up.
  const visibility = Math.max(setupP * (1 - Math.min(revealP === 0 ? 0 : 1, 0)) , revealP)

  // Project the local end-dot position
  const screenX = xAt(CHART.quartersTotal - 1) * camScale + camTx
  const screenY = yAt(0) * camScale + camTy

  return (
    <div
      style={{
        position: 'absolute',
        top: screenY - 70,
        left: screenX + 24,
        opacity: visibility,
        fontFamily: barlow,
      }}
    >
      <div
        style={{
          fontSize: 36,
          fontWeight: 700,
          color: C.purple,
          letterSpacing: -1.2,
          lineHeight: 1,
        }}
      >
        $0
      </div>
      <div
        style={{
          fontSize: 32,
          color: C.ash,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          marginTop: 6,
          fontWeight: 600,
        }}
      >
        Local
      </div>
    </div>
  )
}

// Headline + ratio reveal · two-line punchline that anchors phase 3
const HeadlineReveal: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < T.headlineStart) return null
  const inP = interpolate(frame, [T.headlineStart, T.headlineEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_ENTER,
  })
  return (
    <div
      style={{
        position: 'absolute',
        top: 70,
        left: 0,
        right: 0,
        textAlign: 'center',
        opacity: inP,
        transform: `translateY(${(1 - inP) * 18}px)`,
        fontFamily: barlow,
      }}
    >
      <div style={{ fontSize: 96, fontWeight: 700, color: 'rgba(254, 252, 253, 0.95)', letterSpacing: -1.2, lineHeight: 1 }}>
        After 2 years.
      </div>
      <div style={{ fontSize: 48, fontWeight: 600, color: C.ash, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 14 }}>
        $4,800 vs $0
      </div>
    </div>
  )
}

// Hardware tradeoff note · small annotation that grounds the local side honestly
const HardwareNote: React.FC<{ frame: number }> = ({ frame }) => {
  if (frame < T.headlineStart + 30) return null
  const inP = interpolate(frame, [T.headlineStart + 30, T.headlineStart + 60], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_ENTER,
  })
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 40,
        left: 0,
        right: 0,
        textAlign: 'center',
        opacity: inP * 0.7,
        fontFamily: barlow,
        fontSize: 32,
        color: C.ash,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        fontWeight: 500,
      }}
    >
      * $3,000 hardware (one-time) · paid back in month 15
    </div>
  )
}

// Forever creep indicator · cloud line keeps drifting upward past the chart top
// Communicates "this never stops climbing" without escaping fully off frame
const ForeverCreep: React.FC<{ frame: number; camScale: number; camTx: number; camTy: number }> = ({
  frame,
  camScale,
  camTx,
  camTy,
}) => {
  if (frame < T.creepStart) return null

  const creepP = interpolate(frame, [T.creepStart, T.creepEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // Cloud endpoint at chart Q8
  const baseX = xAt(CHART.quartersTotal - 1)
  const baseY = yAt(CLOUD_COSTS[CLOUD_COSTS.length - 1])
  // Slow upward drift past the chart top boundary
  const driftY = baseY - creepP * 280

  // Faint trailing line from base to drift point
  const trailPath = `M ${baseX} ${baseY} L ${baseX + creepP * 40} ${driftY}`

  // Project to screen
  const screenTipX = (baseX + creepP * 40) * camScale + camTx
  const screenTipY = driftY * camScale + camTy

  return (
    <>
      {/* Trail extension drawn in chart-space (under the camera transform) */}
      <svg
        width="100%"
        height="100%"
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'visible',
          transform: `translate(${camTx}px, ${camTy}px) scale(${camScale})`,
          transformOrigin: '0 0',
          pointerEvents: 'none',
        }}
      >
        <path
          d={trailPath}
          fill="none"
          stroke={C.orange}
          strokeWidth={7}
          strokeLinecap="round"
          opacity={1}
          style={{ filter: `drop-shadow(0 0 14px ${C.orangeHalo})` }}
        />
        <circle cx={baseX + creepP * 40} cy={driftY} r={9} fill={C.orange} stroke={C.ink} strokeWidth={3} style={{ filter: `drop-shadow(0 0 12px ${C.orangeGlow})` }} />
      </svg>

      {/* Counter that keeps ticking up past $4,800 to suggest "still climbing" */}
      <div
        style={{
          position: 'absolute',
          top: screenTipY - 50,
          left: screenTipX + 24,
          opacity: interpolate(creepP, [0, 0.2], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          fontFamily: barlow,
        }}
      >
        <div style={{ fontSize: 84, fontWeight: 700, color: C.orange, letterSpacing: -1, lineHeight: 1 }}>
          ${(4800 + Math.round(creepP * 1200)).toLocaleString()}
        </div>
        <div style={{ fontSize: 28, color: C.ash, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 600, marginTop: 4 }}>
          ↑ still climbing
        </div>
      </div>
    </>
  )
}

const QuarterLabels: React.FC<{ camScale: number; camTx: number; camTy: number }> = ({
  camScale,
  camTx,
  camTy,
}) => {
  // 8 quarters spanning 2 years.
  const months = ['Q1 24', 'Q2 24', 'Q3 24', 'Q4 24', 'Q1 25', 'Q2 25', 'Q3 25', 'Q4 25']
  return (
    <>
      {months.map((m, i) => {
        const chartX = xAt(i)
        const chartY = CHART.bottom + 30
        const screenX = chartX * camScale + camTx
        const screenY = chartY * camScale + camTy
        return (
          <div
            key={m}
            style={{
              position: 'absolute',
              top: screenY - 8,
              left: screenX,
              transform: 'translateX(-50%)',
              fontFamily: barlow,
              fontSize: 32,
              fontWeight: 600,
              color: C.ash,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
            }}
          >
            {m}
          </div>
        )
      })}
    </>
  )
}
