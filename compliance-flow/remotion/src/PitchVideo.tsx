import { AbsoluteFill, Sequence } from 'remotion'
import { z } from 'zod'
import { zColor } from '@remotion/zod-types'
import { sceneTimings, theme } from './theme'
import { HookScene, hookSceneDefaults } from './scenes/HookScene'
import { CostScene, costSceneDefaults } from './scenes/CostScene'
import { SolutionScene } from './scenes/SolutionScene'
import { VennScene, vennSceneDefaults } from './scenes/VennScene'
import { WorkflowScene, workflowSceneDefaults } from './scenes/WorkflowScene'
import { OutroScene, outroSceneDefaults } from './scenes/OutroScene'

const brandSchema = z.object({
  accentColor: zColor(),
  primaryColor: zColor(),
})

const hookContentSchema = z.object({
  providers: z.string(),
  subtitleLead: z.string(),
  subtitleAccent: z.string(),
  problems: z
    .array(
      z.object({
        headline: z.string(),
        sub: z.string(),
      }),
    )
    .min(1)
    .max(5),
})

const costContentSchema = z.object({
  titleLead: z.string(),
  titleAccent: z.string(),
  subtitle: z.string(),
  cloudFinalValue: z.string(),
  cloudLabel: z.string(),
  localFinalValue: z.string(),
  localLabel: z.string(),
})

const vennContentSchema = z.object({
  title: z.string(),
  centerLead: z.string(),
  centerAccent: z.string(),
  circles: z
    .array(
      z.object({
        label: z.string(),
        sub: z.string(),
      }),
    )
    .length(3),
})

const workflowContentSchema = z.object({
  titleLead: z.string(),
  titleAccent: z.string(),
  totalNodes: z.number().int().min(0).max(999),
  caption: z.string(),
})

const outroContentSchema = z.object({
  tagline: z.string(),
})

export const pitchVideoSchema = z.object({
  brand: brandSchema,
  hook: hookContentSchema,
  cost: costContentSchema,
  venn: vennContentSchema,
  workflow: workflowContentSchema,
  outro: outroContentSchema,
})

export type PitchVideoProps = z.infer<typeof pitchVideoSchema>

export const pitchVideoDefaults: PitchVideoProps = {
  brand: {
    accentColor: theme.colors.orange,
    primaryColor: theme.colors.purple,
  },
  hook: {
    providers: hookSceneDefaults.providers,
    subtitleLead: hookSceneDefaults.subtitleLead,
    subtitleAccent: hookSceneDefaults.subtitleAccent,
    problems: hookSceneDefaults.problems,
  },
  cost: {
    titleLead: costSceneDefaults.titleLead,
    titleAccent: costSceneDefaults.titleAccent,
    subtitle: costSceneDefaults.subtitle,
    cloudFinalValue: costSceneDefaults.cloudFinalValue,
    cloudLabel: costSceneDefaults.cloudLabel,
    localFinalValue: costSceneDefaults.localFinalValue,
    localLabel: costSceneDefaults.localLabel,
  },
  venn: {
    title: vennSceneDefaults.title,
    centerLead: vennSceneDefaults.centerLead,
    centerAccent: vennSceneDefaults.centerAccent,
    circles: vennSceneDefaults.circles,
  },
  workflow: {
    titleLead: workflowSceneDefaults.titleLead,
    titleAccent: workflowSceneDefaults.titleAccent,
    totalNodes: workflowSceneDefaults.totalNodes,
    caption: workflowSceneDefaults.caption,
  },
  outro: {
    tagline: outroSceneDefaults.tagline,
  },
}

export const PitchVideo: React.FC<Partial<PitchVideoProps>> = (props) => {
  const { brand, hook, cost, venn, workflow, outro } = {
    ...pitchVideoDefaults,
    ...props,
  }

  return (
    <AbsoluteFill style={{ background: theme.colors.bg }}>
      <Sequence from={sceneTimings.hook.from} durationInFrames={sceneTimings.hook.durationInFrames}>
        <HookScene {...hook} accentColor={brand.accentColor} />
      </Sequence>

      <Sequence from={sceneTimings.cost.from} durationInFrames={sceneTimings.cost.durationInFrames}>
        <CostScene {...cost} accentColor={brand.accentColor} primaryColor={brand.primaryColor} />
      </Sequence>

      <Sequence from={sceneTimings.solution.from} durationInFrames={sceneTimings.solution.durationInFrames}>
        <SolutionScene />
      </Sequence>

      <Sequence from={sceneTimings.venn.from} durationInFrames={sceneTimings.venn.durationInFrames}>
        <VennScene {...venn} accentColor={brand.accentColor} />
      </Sequence>

      <Sequence from={sceneTimings.workflow.from} durationInFrames={sceneTimings.workflow.durationInFrames}>
        <WorkflowScene {...workflow} accentColor={brand.accentColor} primaryColor={brand.primaryColor} />
      </Sequence>

      <Sequence from={sceneTimings.outro.from} durationInFrames={sceneTimings.outro.durationInFrames}>
        <OutroScene {...outro} accentColor={brand.accentColor} />
      </Sequence>
    </AbsoluteFill>
  )
}
