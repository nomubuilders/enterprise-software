import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion'
import { AnimatedCounter, AnimatedText } from 'remotion-bits'
import { theme } from '../theme'
import { WorkflowNode } from '../components/WorkflowNode'
import { AnimatedEdge } from '../components/AnimatedEdge'

const NODES = [
  { id: 'trigger', label: 'Trigger', sub: 'Manual / Schedule', accent: theme.colors.orange, x: 220, y: 540, appearAt: 0 },
  { id: 'doc',     label: 'Document', sub: 'Upload contract',   accent: theme.colors.offWhite, x: 540, y: 540, appearAt: 18 },
  { id: 'pii',     label: 'PII Filter', sub: 'Redact names + IDs', accent: theme.colors.cyan, x: 860, y: 540, appearAt: 36 },
  { id: 'llm',     label: 'LLM (local)', sub: 'Llama 3.2 via Ollama', accent: theme.colors.purple, x: 1180, y: 540, appearAt: 54 },
  { id: 'audit',   label: 'Audit Trail', sub: 'Evidence log', accent: theme.colors.cyan, x: 1500, y: 380, appearAt: 78 },
  { id: 'output',  label: 'Output', sub: 'Chat result', accent: theme.colors.offWhite, x: 1500, y: 700, appearAt: 96 },
]

const EDGES = [
  { from: 'trigger', to: 'doc',    startAt: 14 },
  { from: 'doc',     to: 'pii',    startAt: 32 },
  { from: 'pii',     to: 'llm',    startAt: 50 },
  { from: 'llm',     to: 'audit',  startAt: 74 },
  { from: 'llm',     to: 'output', startAt: 92 },
]

export const WorkflowScene: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const captionAppear = spring({
    frame: frame - 130,
    fps,
    config: { damping: 14, mass: 0.6 },
  })

  const nodeById = (id: string) => NODES.find((n) => n.id === id)!

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 60%, ${theme.colors.darkGray}, ${theme.colors.black} 80%)`,
        fontFamily: theme.fonts.body,
        color: theme.colors.offWhite,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 80,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: theme.fonts.heading,
          fontSize: 52,
          fontWeight: 700,
          letterSpacing: -1,
        }}
      >
        <AnimatedText
          transition={{
            split: 'word',
            splitStagger: 4,
            opacity: [0, 1],
            translateY: [16, 0],
            duration: 18,
          }}
        >
          Drag. Connect. Run — <span style={{ color: theme.colors.orange }}>on your own machine.</span>
        </AnimatedText>
      </div>

      {/* Subtle grid */}
      <svg style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="rgba(254, 252, 253, 0.04)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {EDGES.map((e) => {
        const f = nodeById(e.from)
        const t = nodeById(e.to)
        return (
          <AnimatedEdge
            key={`${e.from}-${e.to}`}
            from={{ x: f.x, y: f.y }}
            to={{ x: t.x, y: t.y }}
            startAt={e.startAt}
            color={theme.colors.cyan}
          />
        )
      })}

      {NODES.map((n) => (
        <WorkflowNode
          key={n.id}
          label={n.label}
          sublabel={n.sub}
          accent={n.accent}
          x={n.x}
          y={n.y}
          appearAt={n.appearAt}
          active={frame > 110}
          activeAt={n.appearAt + 14}
        />
      ))}

      {/* Animated counter caption — "38 nodes · GDPR · HIPAA · EU AI Act · DORA" */}
      <div
        style={{
          position: 'absolute',
          bottom: 80,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 16,
          opacity: captionAppear,
          transform: `translateY(${(1 - captionAppear) * 20}px)`,
          fontFamily: theme.fonts.body,
          fontSize: 26,
          color: theme.colors.grayMuted,
          letterSpacing: 2,
          textTransform: 'uppercase',
        }}
      >
        <span
          style={{
            fontFamily: theme.fonts.heading,
            fontSize: 36,
            fontWeight: 700,
            color: theme.colors.orange,
          }}
        >
          <AnimatedCounter
            transition={{
              values: [0, 38],
              duration: 36,
              delay: 130,
              easing: 'easeOutCubic',
            }}
          />
        </span>
        <span>nodes · GDPR · HIPAA · EU AI Act · DORA</span>
      </div>
    </AbsoluteFill>
  )
}
