import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { Bot, Zap } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { getNodeColorClass } from '../../config/nodeColors'

export const LLMNode = memo((props: NodeProps) => {
  const nodeData = props.data as { label: string; config?: Record<string, unknown> }
  const model = (nodeData.config?.model as string) || 'llama3.2'
  const temperature = (nodeData.config?.temperature as number) || 0.7

  // Temperature indicator
  const getTempColor = () => {
    if (temperature < 0.3) return 'text-[var(--nomu-primary)]'
    if (temperature < 0.7) return 'text-[var(--nomu-accent)]'
    return 'text-[var(--nomu-accent)]'
  }

  const getTempLabel = () => {
    if (temperature < 0.3) return 'Precise'
    if (temperature < 0.7) return 'Balanced'
    return 'Creative'
  }

  return (
    <BaseNode {...props} icon={<Bot size={16} />} color={getNodeColorClass('llmNode')}>
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-[var(--nomu-text-secondary)] text-[10px]">Model:</span>
          <span className="text-[var(--nomu-primary)] font-medium">{model}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[var(--nomu-text-secondary)] text-[10px]">Mode:</span>
          <div className="flex items-center gap-1">
            <Zap size={10} className={getTempColor()} />
            <span className={`text-[10px] ${getTempColor()}`}>{getTempLabel()}</span>
          </div>
        </div>
        <div className="mt-1 text-[9px] text-[var(--nomu-text-secondary)]">
          100% Local • Ollama
        </div>
      </div>
    </BaseNode>
  )
})

LLMNode.displayName = 'LLMNode'
