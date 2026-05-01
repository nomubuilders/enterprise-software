import { RoundedBox, Text } from '@react-three/drei'
import { interpolate, staticFile, useCurrentFrame } from 'remotion'
import { EASE_ENTER, EASE_IMPACT } from './easings'
import { TL, ROW_BEATS } from './timeline'

// Barlow Bold via local woff · shipped by @fontsource/barlow into public/fonts/.
// Drei <Text> uses troika-three-text which fetches the font URL. Remote URLs
// (Google Fonts) hang in headless Chromium render. staticFile() returns a
// local URL that the bundler embeds, so no network fetch.
const BARLOW_FONT = staticFile('fonts/Barlow-Bold.woff')

interface CardPairProps {
  rowIndex: number
  cloudText: string
  localText: string
}

// CardPair · per-row, two RoundedBox + two Drei Text. Sub-beat math internal.
//
// Sub-beat structure (frames relative to row's startFrame):
//   [0..14]  Cloud card materializes · rolls from rotateY -90° to -8°, scale 0.85→1.0
//   [14..30] Read hold · Cloud rests, hovers via sin
//   [30..42] Local snap · rotateY +90°→+8° with overshoot
//   [42..60] Both hold · pair faces camera
//
// Stack-back: when later rows arrive, this pair recedes in Z and dims to suggest
// "case stacking up" — Local cards stack tighter and brighter than Cloud cards.

export const CardPair: React.FC<CardPairProps> = ({ rowIndex, cloudText, localText }) => {
  const frame = useCurrentFrame()
  const startFrame = TL.rowStart[rowIndex]

  // === Cloud sub-beat ===
  const cloudEnterP = interpolate(
    frame,
    [startFrame + ROW_BEATS.cloudEnterStart, startFrame + ROW_BEATS.cloudEnterEnd],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_ENTER }
  )

  // === Local sub-beat ===
  const localEnterP = interpolate(
    frame,
    [startFrame + ROW_BEATS.localEnterStart, startFrame + ROW_BEATS.localEnterEnd],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_IMPACT }
  )

  // === Stack-back · how many rows have arrived AFTER this one ===
  // Each later row pushes this pair back by 0.3z and dims it.
  let rowsAbove = 0
  for (let i = rowIndex + 1; i < 5; i++) {
    if (frame >= TL.rowStart[i]) rowsAbove++
  }

  // Cloud card stack: more aggressive dim (Cloud's case is being overwhelmed)
  const cloudStackZ = -0.3 * rowsAbove
  const cloudStackOpacity = Math.max(0.30, Math.pow(0.85, rowsAbove))
  // Local card stack: less aggressive dim (Local's case stacks up)
  const localStackZ = -0.3 * rowsAbove
  const localStackOpacity = Math.max(0.45, Math.pow(0.92, rowsAbove))

  // === Cloud card transforms ===
  // Enter from [-3.0, 0.6, -1.2] to [-2.0, 0.6, -0.3]
  // Plus stack-back z offset (recedes when next row arrives)
  const cloudX = interpolate(cloudEnterP, [0, 1], [-3.0, -2.0])
  const cloudY = 0.6
  const cloudZ = interpolate(cloudEnterP, [0, 1], [-1.2, -0.3]) + cloudStackZ
  const cloudRotY = interpolate(cloudEnterP, [0, 1], [-Math.PI / 2, -0.14])
  const cloudScale = interpolate(cloudEnterP, [0, 1], [0.85, 1.0])
  // Hover during read hold (frame-driven sin)
  const cloudHoverY = cloudEnterP * Math.sin(frame * 0.08) * 0.02
  // Final opacity = enter progress * stack dim
  const cloudOpacity = cloudEnterP * cloudStackOpacity

  // === Local card transforms ===
  const localX = interpolate(localEnterP, [0, 1], [3.0, 2.0])
  const localY = 0.6
  const localZ = interpolate(localEnterP, [0, 1], [-1.2, -0.3]) + localStackZ
  const localRotY = interpolate(localEnterP, [0, 1], [Math.PI / 2, 0.14])
  const localScale = interpolate(localEnterP, [0, 1], [0.85, 1.0])
  // Local does not hover (static — doesn't fidget per spec)
  const localOpacity = localEnterP * localStackOpacity

  // Don't render until row begins (saves render time before cloud enter)
  if (frame < startFrame) return null

  return (
    <group>
      {/* CLOUD CARD · warm off-white, red rim, recedes with stack */}
      <group
        position={[cloudX, cloudY + cloudHoverY, cloudZ]}
        rotation={[0, cloudRotY, 0]}
        scale={cloudScale}
      >
        <RoundedBox args={[1.4, 0.42, 0.04]} radius={0.04} smoothness={4} castShadow>
          <meshPhysicalMaterial
            color="#F8F2EB"
            metalness={0.1}
            roughness={0.4}
            clearcoat={0.5}
            clearcoatRoughness={0.2}
            transparent
            opacity={cloudOpacity}
          />
        </RoundedBox>
        {/* Red rim (subtle inset edge mesh) */}
        <mesh position={[0, 0, 0.022]}>
          <planeGeometry args={[1.38, 0.40]} />
          <meshBasicMaterial color="#E04848" transparent opacity={0.10 * cloudOpacity} toneMapped={false} />
        </mesh>
        <Text
          position={[0, 0, 0.025]}
          fontSize={0.085}
          font={BARLOW_FONT}
          color="#1A1614"
          anchorX="center"
          anchorY="middle"
          maxWidth={1.3}
          textAlign="center"
          fillOpacity={cloudOpacity}
        >
          {cloudText}
        </Text>
      </group>

      {/* LOCAL CARD · purple-tinted off-white, green rim, advances with stack */}
      <group
        position={[localX, localY, localZ]}
        rotation={[0, localRotY, 0]}
        scale={localScale}
      >
        <RoundedBox args={[1.4, 0.42, 0.04]} radius={0.04} smoothness={4} castShadow>
          <meshPhysicalMaterial
            color="#F0EAFF"
            metalness={0.15}
            roughness={0.35}
            clearcoat={0.7}
            clearcoatRoughness={0.1}
            transparent
            opacity={localOpacity}
          />
        </RoundedBox>
        {/* Green rim */}
        <mesh position={[0, 0, 0.022]}>
          <planeGeometry args={[1.38, 0.40]} />
          <meshBasicMaterial color="#1FA760" transparent opacity={0.14 * localOpacity} toneMapped={false} />
        </mesh>
        <Text
          position={[0, 0, 0.025]}
          fontSize={0.085}
          font={BARLOW_FONT}
          color="#1A1614"
          anchorX="center"
          anchorY="middle"
          maxWidth={1.3}
          textAlign="center"
          fillOpacity={localOpacity}
          fontWeight={700}
        >
          {localText}
        </Text>
      </group>
    </group>
  )
}

