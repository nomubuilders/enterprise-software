import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion'
import { TypeWriter } from 'remotion-bits'
import { z } from 'zod'
import { zColor } from '@remotion/zod-types'
import { theme } from '../theme'
import { BrandWordmark } from '../components/BrandWordmark'

export const outroSceneSchema = z.object({
  tagline: z.string(),
  accentColor: zColor(),
})

export type OutroSceneProps = z.infer<typeof outroSceneSchema>

export const outroSceneDefaults: OutroSceneProps = {
  tagline: 'Run AI on your terms.',
  accentColor: theme.colors.orange,
}

export const OutroScene: React.FC<Partial<OutroSceneProps>> = (props) => {
  const { tagline, accentColor } = { ...outroSceneDefaults, ...props }
  const frame = useCurrentFrame()

  const fadeIn = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill
      style={{
        background: theme.colors.bg,
        opacity: fadeIn,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 32,
      }}
    >
      <BrandWordmark delay={0} showTagline={false} />
      <div
        style={{
          fontFamily: theme.fonts.heading,
          fontSize: 36,
          color: accentColor,
          letterSpacing: 1,
          minHeight: 50,
        }}
      >
        <TypeWriter text={tagline} typeSpeed={2} pauseAfterType={9999} />
      </div>
    </AbsoluteFill>
  )
}
