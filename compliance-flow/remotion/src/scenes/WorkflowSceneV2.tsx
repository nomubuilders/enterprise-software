import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  Easing,
} from 'remotion'
import { loadFont as loadBarlow } from '@remotion/google-fonts/Barlow'
import { loadFont as loadWorkSans } from '@remotion/google-fonts/WorkSans'
import { TypeWriter } from 'remotion-bits'
import { z } from 'zod'
import { theme } from '../theme'
import { WorkflowNode } from '../components/WorkflowNode'
import { AnimatedEdge } from '../components/AnimatedEdge'

loadBarlow('normal', { weights: ['500', '700', '900'] })
loadWorkSans('normal', { weights: ['400', '500', '600', '700'] })

// ----------------------------------------------------------------------------
// WorkflowSceneV2 · "The Demo Beat" · 360f @ 30fps · 12s
//
// Phase 2 spec (locked):
//   0-60    User question types in (TypeWriter)
//   60-90   Hold question
//   90-244  Cursor + node assembly (7 nodes, ~22f each)
//   244-264 Edges draw across the chain (6 edges)
//   264-280 Camera zooms out to full chain
//   280-330 Result card grid-staggers in (4 lines)
//   330-360 Hold full board
//
// Easings: Easing.bezier only. No springs at this layer (WorkflowNode legacy
// uses spring internally — accepted carryover).
// ----------------------------------------------------------------------------

const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1)
const EASE_IN_OUT = Easing.bezier(0.65, 0, 0.35, 1)
const EASE_QUICK = Easing.bezier(0.22, 1, 0.36, 1)

// Canvas reference dimensions (1920x1080 stage)
const W = 1920
const H = 1080

// Sidebar palette location (cursor "picks up" here)
const PALETTE_X = 80
const PALETTE_Y_BASE = 240
const PALETTE_Y_STEP = 90

// Node target positions on the canvas (left to right, then audit/output below)
// 7 nodes laid out as a horizontal chain across the lower-mid canvas.
type NodeDef = {
  id: string
  label: string
  sub: string
  accent: string
  x: number
  y: number
  pickFrame: number // when cursor "picks up" from palette
  dropFrame: number // when node lands at target
  paletteIndex: number
}

const NODES: NodeDef[] = [
  {
    id: 'trigger',
    label: 'Trigger',
    sub: 'patient_records.csv',
    accent: theme.colors.orange,
    x: 280,
    y: 620,
    pickFrame: 90,
    dropFrame: 112,
    paletteIndex: 0,
  },
  {
    id: 'database',
    label: 'Database',
    sub: 'source connects',
    accent: theme.colors.teal,
    x: 540,
    y: 620,
    pickFrame: 112,
    dropFrame: 134,
    paletteIndex: 1,
  },
  {
    id: 'phi',
    label: 'PHI Classify',
    sub: 'flags health data',
    accent: theme.colors.purple,
    x: 800,
    y: 620,
    pickFrame: 134,
    dropFrame: 156,
    paletteIndex: 2,
  },
  {
    id: 'pii',
    label: 'PII Filter',
    sub: 'redacts names + IDs',
    accent: theme.colors.teal,
    x: 1060,
    y: 620,
    pickFrame: 156,
    dropFrame: 178,
    paletteIndex: 3,
  },
  {
    id: 'llm',
    label: 'Local LLM',
    sub: 'Llama 3.2 · analyzes',
    accent: theme.colors.purple,
    x: 1320,
    y: 620,
    pickFrame: 178,
    dropFrame: 200,
    paletteIndex: 4,
  },
  {
    id: 'audit',
    label: 'Audit Trail',
    sub: 'logs every step',
    accent: theme.colors.orange,
    x: 1580,
    y: 480,
    pickFrame: 200,
    dropFrame: 222,
    paletteIndex: 5,
  },
  {
    id: 'output',
    label: 'Output',
    sub: 'Compliance Report',
    accent: theme.colors.ink,
    x: 1580,
    y: 760,
    pickFrame: 222,
    dropFrame: 244,
    paletteIndex: 6,
  },
]

// Edge plan (in node-order). Drawn 244-264 (~3.3f per edge across 6 edges).
const EDGES: { from: string; to: string; offset: number }[] = [
  { from: 'trigger', to: 'database', offset: 0 },
  { from: 'database', to: 'phi', offset: 3 },
  { from: 'phi', to: 'pii', offset: 6 },
  { from: 'pii', to: 'llm', offset: 9 },
  { from: 'llm', to: 'audit', offset: 12 },
  { from: 'llm', to: 'output', offset: 15 },
]

// ----------------------------------------------------------------------------
// Result card lines
// ----------------------------------------------------------------------------
const RESULT_LINES: { text: string; isPass?: boolean }[] = [
  { text: '2,847 records reviewed' },
  { text: 'All PHI redacted' },
  { text: 'Audit trail: 12 evidence points' },
  { text: 'HIPAA: PASS', isPass: true },
]

// ----------------------------------------------------------------------------
// Schema / defaults
// ----------------------------------------------------------------------------
export const workflowSceneV2Schema = z.object({
  question: z.string(),
})

export type WorkflowSceneV2Props = z.infer<typeof workflowSceneV2Schema>

export const workflowSceneV2Defaults: WorkflowSceneV2Props = {
  question: 'How do we audit our patient records for HIPAA compliance?',
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------
const nodeById = (id: string) => NODES.find((n) => n.id === id)!

const paletteY = (i: number) => PALETTE_Y_BASE + i * PALETTE_Y_STEP

// ----------------------------------------------------------------------------
// Background grid (subtle, off-white with hairline grid)
// ----------------------------------------------------------------------------
const GridBackground: React.FC = () => {
  return (
    <svg
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    >
      <defs>
        <pattern id="wfv2-grid" width="48" height="48" patternUnits="userSpaceOnUse">
          <path
            d="M 48 0 L 0 0 0 48"
            fill="none"
            stroke="rgba(26, 22, 20, 0.05)"
            strokeWidth="1"
          />
        </pattern>
        <radialGradient id="wfv2-vignette" cx="50%" cy="55%" r="65%">
          <stop offset="0%" stopColor={theme.colors.bg} stopOpacity="1" />
          <stop offset="100%" stopColor={theme.colors.bgEdge} stopOpacity="1" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#wfv2-vignette)" />
      <rect width="100%" height="100%" fill="url(#wfv2-grid)" />
    </svg>
  )
}

// ----------------------------------------------------------------------------
// Sidebar palette · 7 placeholder chips on the left
// ----------------------------------------------------------------------------
const SidebarPalette: React.FC = () => {
  const frame = useCurrentFrame()
  // Slide in from left at frame 80 (just before assembly starts)
  const slide = interpolate(frame, [78, 92], [-160, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_OUT,
  })
  const opacity = interpolate(frame, [78, 92], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_OUT,
  })

  return (
    <div
      style={{
        position: 'absolute',
        left: 24,
        top: 200,
        width: 132,
        padding: '20px 14px',
        borderRadius: 18,
        background: theme.colors.bg,
        border: `1px solid ${theme.colors.divider}`,
        boxShadow: '0 14px 40px rgba(26, 22, 20, 0.06)',
        transform: `translateX(${slide}px)`,
        opacity,
        fontFamily: theme.fonts.body,
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: theme.colors.inkSubtle,
          marginBottom: 14,
          fontWeight: 600,
        }}
      >
        Nodes
      </div>
      {NODES.map((n, i) => {
        // Chip "lifts" out toward cursor pickup at pickFrame; faded after dropFrame
        const lift = interpolate(
          frame,
          [n.pickFrame, n.pickFrame + 6],
          [0, 1],
          {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: EASE_QUICK,
          },
        )
        const taken = frame > n.dropFrame ? 1 : 0
        const chipOpacity = 1 - taken * 0.6
        return (
          <div
            key={n.id}
            style={{
              height: 60,
              marginBottom: i === NODES.length - 1 ? 0 : 14,
              borderRadius: 10,
              border: `1.5px solid ${n.accent}`,
              background: theme.colors.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: chipOpacity,
              transform: `scale(${1 - lift * 0.06})`,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: n.accent,
                marginRight: 6,
              }}
            />
            <div
              style={{
                width: 28,
                height: 4,
                background: n.accent,
                opacity: 0.5,
                borderRadius: 2,
              }}
            />
          </div>
        )
      })}
    </div>
  )
}

// ----------------------------------------------------------------------------
// Cursor SVG · white arrow with brand-orange outline + soft drop shadow
// ----------------------------------------------------------------------------
const CursorIcon: React.FC<{ pressed: boolean }> = ({ pressed }) => {
  const scale = pressed ? 0.85 : 1
  return (
    <svg
      width="36"
      height="42"
      viewBox="0 0 36 42"
      style={{
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        filter: 'drop-shadow(0 6px 14px rgba(26, 22, 20, 0.28))',
      }}
    >
      <path
        d="M 4 4 L 4 30 L 12 24 L 18 36 L 24 33 L 18 22 L 30 22 Z"
        fill="#FEFCFD"
        stroke={theme.colors.orange}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ----------------------------------------------------------------------------
// Animated cursor — moves between palette pickups and target drop positions
// ----------------------------------------------------------------------------
const Cursor: React.FC = () => {
  const frame = useCurrentFrame()

  // Show cursor only during assembly window (88-260)
  const visible = frame >= 88 && frame <= 264
  const fadeIn = interpolate(frame, [86, 96], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const fadeOut = interpolate(frame, [256, 264], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const opacity = Math.min(fadeIn, fadeOut) * (visible ? 1 : 0)

  // For each node, the cursor:
  //   pickFrame-2 .. pickFrame:    travel to palette chip
  //   pickFrame .. pickFrame+2:    press (scale pulse)
  //   pickFrame+2 .. dropFrame-2:  drag to target
  //   dropFrame-2 .. dropFrame:    release/drop
  // Between pickFrame of node N+1 we are already at target N — travel comes
  // from the previous node's drop position to the next palette index.
  let x = PALETTE_X
  let y = paletteY(0)
  let pressed = false

  // Start position before assembly begins
  if (frame < NODES[0].pickFrame - 6) {
    x = PALETTE_X
    y = paletteY(0)
  }

  for (let i = 0; i < NODES.length; i++) {
    const n = NODES[i]
    const prev = i === 0 ? null : NODES[i - 1]

    const travelStart = prev ? prev.dropFrame : n.pickFrame - 6
    const travelEnd = n.pickFrame

    // Travel to palette chip
    if (frame >= travelStart && frame < travelEnd) {
      const prevX = prev ? prev.x : PALETTE_X
      const prevY = prev ? prev.y : paletteY(0)
      const t = interpolate(frame, [travelStart, travelEnd], [0, 1], {
        easing: EASE_IN_OUT,
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
      x = interpolate(t, [0, 1], [prevX, PALETTE_X + 50])
      y = interpolate(t, [0, 1], [prevY, paletteY(n.paletteIndex)])
      pressed = false
      break
    }

    // Press at palette
    if (frame >= n.pickFrame && frame < n.pickFrame + 3) {
      x = PALETTE_X + 50
      y = paletteY(n.paletteIndex)
      pressed = true
      break
    }

    // Drag from palette to target
    if (frame >= n.pickFrame + 3 && frame < n.dropFrame) {
      const t = interpolate(frame, [n.pickFrame + 3, n.dropFrame - 2], [0, 1], {
        easing: EASE_IN_OUT,
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
      x = interpolate(t, [0, 1], [PALETTE_X + 50, n.x - 60])
      y = interpolate(t, [0, 1], [paletteY(n.paletteIndex), n.y - 30])
      pressed = true
      break
    }

    // Drop / release
    if (frame >= n.dropFrame && frame < n.dropFrame + 2) {
      x = n.x - 60
      y = n.y - 30
      pressed = false
      break
    }

    // After last node dropped, cursor moves out toward edges then off
    if (i === NODES.length - 1 && frame >= n.dropFrame + 2) {
      const t = interpolate(frame, [n.dropFrame + 2, n.dropFrame + 18], [0, 1], {
        easing: EASE_OUT,
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
      x = interpolate(t, [0, 1], [n.x - 60, n.x + 80])
      y = interpolate(t, [0, 1], [n.y - 30, n.y + 60])
      pressed = false
    }
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        pointerEvents: 'none',
        opacity,
        zIndex: 50,
      }}
    >
      <CursorIcon pressed={pressed} />
    </div>
  )
}

// ----------------------------------------------------------------------------
// Camera viewport — wraps the full canvas in a scale/translate transform.
// Slight push-in on the active node, then pulls back wide for the result card.
// ----------------------------------------------------------------------------
const CameraViewport: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const frame = useCurrentFrame()

  // Phase A (60-90):    1.0 hold (question phase, no zoom)
  // Phase B (90-244):   1.05 push-in following the active node loosely
  // Phase C (244-280):  1.0 pull back wide for full chain
  // Phase D (280-360):  0.92 slight further pull for result card overlay
  let scale = 1
  let tx = 0
  let ty = 0

  if (frame < 90) {
    scale = 1
    tx = 0
    ty = 0
  } else if (frame < 244) {
    // Find the currently active node (one whose drop window we are in)
    const active = NODES.find(
      (n) => frame >= n.pickFrame && frame <= n.dropFrame + 6,
    )
    const targetX = active ? active.x : W / 2
    const targetY = active ? active.y : H / 2
    const t = interpolate(frame, [90, 110], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: EASE_OUT,
    })
    scale = 1 + t * 0.05
    // Pan canvas so target is closer to centre (subtle)
    tx = (W / 2 - targetX) * 0.18 * t
    ty = (H / 2 - targetY) * 0.12 * t
  } else if (frame < 280) {
    const t = interpolate(frame, [244, 280], [0, 1], {
      easing: EASE_OUT,
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
    scale = interpolate(t, [0, 1], [1.05, 1.0])
    tx = interpolate(t, [0, 1], [0, 0])
    ty = interpolate(t, [0, 1], [0, 0])
  } else {
    const t = interpolate(frame, [280, 320], [0, 1], {
      easing: EASE_OUT,
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
    scale = interpolate(t, [0, 1], [1.0, 0.94])
    tx = 0
    ty = interpolate(t, [0, 1], [0, -20])
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
        transformOrigin: 'center center',
      }}
    >
      {children}
    </div>
  )
}

// ----------------------------------------------------------------------------
// Question · centered TypeWriter, fades out as assembly begins
// ----------------------------------------------------------------------------
const Question: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame()
  // Fade out from 86-100 as cursor takes over
  const fade = interpolate(frame, [84, 100], [1, 0.0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_IN_OUT,
  })
  // Ease up to a smaller pinned position above the canvas (header)
  const yShift = interpolate(frame, [84, 100], [0, -260], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_IN_OUT,
  })

  return (
    <div
      style={{
        position: 'absolute',
        top: '38%',
        left: '50%',
        transform: `translate(-50%, ${yShift}px)`,
        width: 1300,
        textAlign: 'center',
        fontFamily: theme.fonts.heading,
        fontSize: 56,
        fontWeight: 700,
        letterSpacing: -0.5,
        lineHeight: 1.18,
        color: theme.colors.ink,
        opacity: fade,
      }}
    >
      <TypeWriter
        text={text}
        typeSpeed={2}
        cursor={true}
        blinkSpeed={28}
        showCursorAfterComplete={false}
      />
    </div>
  )
}

// ----------------------------------------------------------------------------
// Pinned question header (after fade out, small line above canvas)
// ----------------------------------------------------------------------------
const QuestionHeader: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame()
  const opacity = interpolate(frame, [98, 116], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_OUT,
  })
  return (
    <div
      style={{
        position: 'absolute',
        top: 80,
        left: 0,
        right: 0,
        textAlign: 'center',
        fontFamily: theme.fonts.heading,
        fontSize: 30,
        fontWeight: 600,
        letterSpacing: -0.2,
        color: theme.colors.inkMuted,
        opacity,
      }}
    >
      <span
        style={{
          fontSize: 12,
          letterSpacing: 3,
          textTransform: 'uppercase',
          color: theme.colors.inkSubtle,
          marginRight: 14,
          fontFamily: theme.fonts.body,
          fontWeight: 600,
          verticalAlign: 'middle',
        }}
      >
        Question
      </span>
      <span style={{ verticalAlign: 'middle' }}>{text}</span>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Result card · grid stagger of 4 lines + HIPAA: PASS in brand orange
// ----------------------------------------------------------------------------
const ResultCard: React.FC = () => {
  const frame = useCurrentFrame()

  // Card container appears 280
  const cardOpacity = interpolate(frame, [280, 296], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_OUT,
  })
  const cardScale = interpolate(frame, [280, 304], [0.94, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_OUT,
  })

  // Ambient drift after the card has settled (frame > 304). Composed on top
  // of the entrance scale so the result card never freezes during its 26f
  // hold (304-330) and the 30f tail hold (330-360). ±6px / ±0.3% scale.
  const ambientX = Math.sin(frame * 0.048) * 6
  const ambientY = Math.cos(frame * 0.041) * 5
  const ambientScale = 1 + Math.sin(frame * 0.053) * 0.003

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: `translate(calc(-50% + ${ambientX}px), calc(-50% + ${ambientY}px)) scale(${cardScale * ambientScale})`,
        opacity: cardOpacity,
        width: 760,
        padding: '44px 56px',
        borderRadius: 22,
        background: theme.colors.bg,
        border: `1px solid ${theme.colors.divider}`,
        boxShadow: '0 30px 80px rgba(26, 22, 20, 0.18)',
        fontFamily: theme.fonts.body,
        zIndex: 60,
      }}
    >
      <div
        style={{
          fontSize: 13,
          letterSpacing: 3,
          textTransform: 'uppercase',
          color: theme.colors.inkSubtle,
          fontWeight: 600,
          marginBottom: 22,
        }}
      >
        Run Complete
      </div>
      {RESULT_LINES.map((line, i) => {
        const startAt = 296 + i * 8
        const lineOpacity = interpolate(frame, [startAt, startAt + 14], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: EASE_OUT,
        })
        const lineY = interpolate(frame, [startAt, startAt + 14], [12, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: EASE_OUT,
        })
        return (
          <div
            key={line.text}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              marginBottom: i === RESULT_LINES.length - 1 ? 0 : 18,
              opacity: lineOpacity,
              transform: `translateY(${lineY}px)`,
            }}
          >
            <CheckIcon color={'#0F8F45'} />
            {line.isPass ? (
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  fontFamily: theme.fonts.heading,
                  letterSpacing: -0.2,
                  color: theme.colors.ink,
                }}
              >
                HIPAA:{' '}
                <span style={{ color: theme.colors.orange }}>PASS</span>
              </div>
            ) : (
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 500,
                  color: theme.colors.ink,
                }}
              >
                {line.text}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

const CheckIcon: React.FC<{ color: string }> = ({ color }) => (
  <svg width="34" height="34" viewBox="0 0 34 34">
    <circle cx="17" cy="17" r="16" fill="none" stroke={color} strokeWidth="2.5" />
    <path
      d="M 9 17 L 15 23 L 25 12"
      fill="none"
      stroke={color}
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

// ----------------------------------------------------------------------------
// Composition root
// ----------------------------------------------------------------------------
export const WorkflowSceneV2: React.FC<Partial<WorkflowSceneV2Props>> = (
  props,
) => {
  const merged = { ...workflowSceneV2Defaults, ...props }
  const frame = useCurrentFrame()

  // Edges draw start at 244 (each edge offset by 3 frames, 14-frame draw)
  const EDGE_DRAW_BASE = 244

  return (
    <AbsoluteFill
      style={{
        background: theme.colors.bg,
        fontFamily: theme.fonts.body,
        color: theme.colors.ink,
        overflow: 'hidden',
      }}
    >
      <GridBackground />

      {/* Question (large center, 0-90) — no Sequence wrap so internal
          interpolation reads the parent timeline directly. */}
      <Question text={merged.question} />

      {/* Question pinned header (small line above canvas, fades in at 98) */}
      <QuestionHeader text={merged.question} />

      {/* The whole canvas — sidebar + nodes + edges + cursor — lives in the
          camera viewport. The viewport handles zoom/pan over time. */}
      <CameraViewport>
        {/* Sidebar palette */}
        <SidebarPalette />

        {/* Edges (rendered first so nodes draw above) */}
        {EDGES.map((e) => {
          const f = nodeById(e.from)
          const t = nodeById(e.to)
          return (
            <AnimatedEdge
              key={`${e.from}-${e.to}`}
              from={{ x: f.x, y: f.y }}
              to={{ x: t.x, y: t.y }}
              startAt={EDGE_DRAW_BASE + e.offset}
              durationInFrames={14}
              color={theme.colors.purple}
            />
          )
        })}

        {/* Nodes — appear at their dropFrame (cursor "drops" them) */}
        {NODES.map((n) => (
          <WorkflowNode
            key={n.id}
            label={n.label}
            sublabel={n.sub}
            accent={n.accent}
            x={n.x}
            y={n.y}
            appearAt={n.dropFrame - 4}
            active={frame >= n.dropFrame && frame < n.dropFrame + 18}
            activeAt={n.dropFrame}
          />
        ))}

        {/* Cursor sits on top of nodes during assembly */}
        <Cursor />
      </CameraViewport>

      {/* Result card flies in over the chain at frame 280 (no Sequence wrapper
          so ResultCard reads the parent useCurrentFrame() directly). */}
      <ResultCard />
    </AbsoluteFill>
  )
}
