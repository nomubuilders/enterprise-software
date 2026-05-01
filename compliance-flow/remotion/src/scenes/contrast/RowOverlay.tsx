import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion'
import { loadFont as loadBarlow } from '@remotion/google-fonts/Barlow'
import { theme } from '../../theme'
import { TL, ROW_BEATS, ROW_TEXT } from './timeline'

// ─────────────────────────────────────────────────────────────────────────
// RowOverlay · 2D HTML cards layered on top of the 3D ProductStage.
//
// Why this exists:
// The 3D <CardPair> component was rendering cards via Drei <Text>, which
// uses troika-three-text under the hood. troika fails silently in headless
// Remotion render (font shaping is async and the snapshot hits before the
// glyphs are ready), so the entire 33-second contrast scene was playing
// with zero visible comparison text · just abstract cubes growing and
// shrinking. The viewer literally couldn't see what they were supposed
// to compare.
//
// Rather than fight troika in headless, this component renders the same
// row content as 2D HTML cards via standard React + Tailwind-style inline
// styles. They sit on top of the 3D scene (z-stacked above the canvas)
// and use the same per-row timing the 3D cards used: row N starts at
// TL.rowStart[N], cloud card enters frames [0..14], local card enters
// frames [30..42] of the row's local clock.
//
// This is a hybrid 2D/3D motion-graphics approach standard in
// Apple-keynote / Stripe-press visual language: 3D objects as scene
// anchors, 2D typography as the focal communication.
// ─────────────────────────────────────────────────────────────────────────

const { fontFamily: barlow } = loadBarlow('normal', {
  weights: ['500', '700'],
})

const EASE_ENTER = Easing.bezier(0.16, 1, 0.3, 1)
const EASE_IMPACT = Easing.bezier(0.34, 1.56, 0.64, 1)

// One row = a Cloud card on the left + a Local card on the right.
// Cards live in the BOTTOM THIRD of the canvas, below the cubes (which
// dominate the upper-mid region from the camera's perspective). Each
// pair stacks vertically as more rows arrive · later rows render on top
// (higher z-index) and earlier rows fade slightly to suggest "case
// stacking up" without ever pushing them off-screen.

interface RowProps {
  rowIndex: number
}

const Row: React.FC<RowProps> = ({ rowIndex }) => {
  const frame = useCurrentFrame()
  const startFrame = TL.rowStart[rowIndex]
  const cloudText = ROW_TEXT[rowIndex]!.cloud
  const localText = ROW_TEXT[rowIndex]!.local

  // Rows above this one (older rows further down the stack)
  // are not the visual focus. Newer rows arrive ABOVE older rows
  // and the older ones fade slightly. This creates a "case piling up"
  // sense as evidence accumulates.
  let rowsAfter = 0
  for (let i = rowIndex + 1; i < 5; i++) {
    if (frame >= TL.rowStart[i]!) rowsAfter++
  }

  // Cloud card entrance (frames 0..14 of the row)
  const cloudP = interpolate(
    frame,
    [startFrame + ROW_BEATS.cloudEnterStart, startFrame + ROW_BEATS.cloudEnterEnd],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_ENTER },
  )
  // Local card entrance (frames 30..42 of the row, with overshoot bezier)
  const localP = interpolate(
    frame,
    [startFrame + ROW_BEATS.localEnterStart, startFrame + ROW_BEATS.localEnterEnd],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_IMPACT },
  )

  // Cloud card slides in from the left, lands centered on its lane.
  // 36px translate-from offset · entrance, opacity coupled to progress.
  const cloudTranslateX = interpolate(cloudP, [0, 1], [-60, 0])
  const cloudOpacity = cloudP * Math.max(0.55, Math.pow(0.92, rowsAfter))

  // Local card slides in from the right with overshoot.
  const localTranslateX = interpolate(localP, [0, 1], [60, 0])
  const localOpacity = localP * Math.max(0.65, Math.pow(0.95, rowsAfter))

  // Don't render until the row begins · also don't render once we have
  // moved well past it (saves the layout from accumulating 5 invisible
  // rows during the wipe phase).
  if (frame < startFrame || frame > TL.morphStart) return null

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        columnGap: 64,
        alignItems: 'center',
        justifyItems: 'stretch',
        marginBottom: 18,
      }}
    >
      {/* CLOUD CARD · the constraint side */}
      <div
        style={{
          padding: '20px 28px',
          borderRadius: 14,
          background: 'rgba(248, 242, 235, 0.96)',
          borderLeft: `4px solid ${theme.colors.bad}`,
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45), 0 4px 8px rgba(0, 0, 0, 0.3)',
          fontFamily: barlow,
          fontSize: 30,
          fontWeight: 500,
          lineHeight: 1.25,
          letterSpacing: -0.4,
          color: theme.colors.ink,
          textAlign: 'left',
          opacity: cloudOpacity,
          transform: `translateX(${cloudTranslateX}px)`,
          willChange: 'transform, opacity',
        }}
      >
        {cloudText}
      </div>

      {/* LOCAL CARD · the answer side */}
      <div
        style={{
          padding: '20px 28px',
          borderRadius: 14,
          background: 'rgba(240, 234, 255, 0.98)',
          borderLeft: `4px solid ${theme.colors.purple}`,
          boxShadow: `0 12px 32px rgba(64, 4, 218, 0.35), 0 4px 8px rgba(0, 0, 0, 0.3)`,
          fontFamily: barlow,
          fontSize: 30,
          fontWeight: 700,
          lineHeight: 1.25,
          letterSpacing: -0.4,
          color: theme.colors.ink,
          textAlign: 'left',
          opacity: localOpacity,
          transform: `translateX(${localTranslateX}px)`,
          willChange: 'transform, opacity',
        }}
      >
        {localText}
      </div>
    </div>
  )
}

// Column headers · pinned above the row stack. Fade in alongside row 1
// (frames 158..200) and stay until the wipe begins.
const Headers: React.FC = () => {
  const frame = useCurrentFrame()
  const opacity = interpolate(
    frame,
    [TL.rowStart[0] - 12, TL.rowStart[0] + 18, TL.morphStart - 12, TL.morphStart],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_ENTER },
  )

  if (opacity <= 0) return null

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        columnGap: 64,
        marginBottom: 24,
        opacity,
      }}
    >
      <div
        style={{
          fontFamily: barlow,
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: 4,
          textTransform: 'uppercase',
          color: 'rgba(232, 238, 245, 0.6)',
          textAlign: 'left',
          paddingLeft: 28,
        }}
      >
        Cloud AI
      </div>
      <div
        style={{
          fontFamily: barlow,
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: 4,
          textTransform: 'uppercase',
          color: theme.colors.purple,
          textAlign: 'left',
          paddingLeft: 28,
        }}
      >
        ComplianceFlow
      </div>
    </div>
  )
}

export const RowOverlay: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        // Position the row stack in the lower-middle band of the canvas
        // so it sits below the cubes (which the camera frames in the
        // upper-mid region). 1920x1080 layout.
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        alignItems: 'stretch',
        paddingLeft: 160,
        paddingRight: 160,
        paddingBottom: 80,
        pointerEvents: 'none',
      }}
    >
      <Headers />
      {[0, 1, 2, 3, 4].map((i) => (
        <Row key={i} rowIndex={i} />
      ))}
    </AbsoluteFill>
  )
}
