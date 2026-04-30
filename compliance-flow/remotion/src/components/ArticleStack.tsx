import { staticFile, Img, useCurrentFrame, spring, useVideoConfig, interpolate } from 'remotion'
import { theme } from '../theme'

// Hand-tuned positions for "scattered news pile" feel.
// Z-index goes up with delay so later cards layer on top.
// 13 articles spanning: API bans · price hikes · model degradation ("nerfing").
// Positions in 1920x1080 canvas; cards are ~580px wide.
const ARTICLES = [
  // Outer ring (corners) — read first
  { src: 'article-6.png',  x: 60,   y: 70,   rot: -7,  delay: 0  },
  { src: 'article-9.png',  x: 1310, y: 80,   rot: 6,   delay: 4  },
  { src: 'article-7.png',  x: 1480, y: 280,  rot: -4,  delay: 8  },
  { src: 'article-11.png', x: 80,   y: 380,  rot: 5,   delay: 12 },
  { src: 'article-12.png', x: 1340, y: 540,  rot: 8,   delay: 16 },
  { src: 'article-10.png', x: 100,  y: 700,  rot: -6,  delay: 20 },
  { src: 'article-8.png',  x: 1450, y: 800,  rot: 3,   delay: 24 },
  { src: 'article-13.png', x: 660,  y: 850,  rot: -3,  delay: 28 },
  { src: 'article-14.png', x: 720,  y: 30,   rot: 2,   delay: 32 },
  // Inner fill (degradation cluster) — backdrop texture behind problem cards
  { src: 'article-15.png', x: 880,  y: 200,  rot: -5,  delay: 36 },
  { src: 'article-16.png', x: 380,  y: 540,  rot: 4,   delay: 40 },
  { src: 'article-17.png', x: 980,  y: 660,  rot: -7,  delay: 44 },
  { src: 'article-18.png', x: 1180, y: 380,  rot: 6,   delay: 48 },
]

interface Props {
  /** Frame at which the stack starts animating in. */
  startAt?: number
  /** Frame at which the stack should dim (becomes backdrop). Omit to keep full opacity. */
  dimAfter?: number
  /** Target opacity when dimmed. Default 0.22 (subtle backdrop). */
  dimTo?: number
  /** Card width in px. Default 580. */
  cardWidth?: number
}

export const ArticleStack: React.FC<Props> = ({
  startAt = 0,
  dimAfter,
  dimTo = 0.22,
  cardWidth = 580,
}) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const dimOpacity =
    dimAfter !== undefined
      ? interpolate(frame, [dimAfter, dimAfter + 24], [1, dimTo], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 1

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity: dimOpacity,
        pointerEvents: 'none',
      }}
    >
      {ARTICLES.map((a, i) => {
        const localFrame = frame - startAt - a.delay
        const appearProgress = spring({
          frame: localFrame,
          fps,
          config: { damping: 14, mass: 0.8 },
        })

        // Slide in from the nearer side so cards "fly onto the pile"
        const fromLeft = a.x < 960
        const offsetX = (1 - appearProgress) * (fromLeft ? -260 : 260)
        const offsetY = (1 - appearProgress) * 40

        return (
          <div
            key={a.src}
            style={{
              position: 'absolute',
              left: a.x,
              top: a.y,
              width: cardWidth,
              transform: `translate(${offsetX}px, ${offsetY}px) rotate(${a.rot * appearProgress}deg)`,
              opacity: appearProgress,
              zIndex: i,
              boxShadow: '0 18px 36px rgba(26, 22, 20, 0.18), 0 4px 12px rgba(26, 22, 20, 0.08)',
              borderRadius: 14,
              overflow: 'hidden',
              background: theme.colors.bg,
              border: `1px solid ${theme.colors.divider}`,
            }}
          >
            <Img
              src={staticFile(`articles/${a.src}`)}
              style={{
                width: '100%',
                display: 'block',
              }}
            />
          </div>
        )
      })}
    </div>
  )
}
