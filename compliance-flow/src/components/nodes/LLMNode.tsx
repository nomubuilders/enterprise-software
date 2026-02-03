import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { Bot, Zap } from 'lucide-react'
import { BaseNode } from './BaseNode'

export const LLMNode = memo((props: NodeProps) => {
  const nodeData = props.data as { label: string; config?: Record<string, unknown> }
  const model = (nodeData.config?.model as string) || 'llama3.2'
  const temperature = (nodeData.config?.temperature as number) || 0.7

  // Temperature indicator
  const getTempColor = () => {
    if (temperature < 0.3) return 'text-blue-400'
    if (temperature < 0.7) return 'text-green-400'
    return 'text-orange-400'
  }

  const getTempLabel = () => {
    if (temperature < 0.3) return 'Precise'
    if (temperature < 0.7) return 'Balanced'
    return 'Creative'
  }

  return (
    <BaseNode {...props} icon={<Bot size={16} />} color="bg-purple-600">
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-slate-400 text-[10px]">Model:</span>
          <span className="text-purple-400 font-medium">{model}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-400 text-[10px]">Mode:</span>
          <div className="flex items-center gap-1">
            <Zap size={10} className={getTempColor()} />
            <span className={`text-[10px] ${getTempColor()}`}>{getTempLabel()}</span>
          </div>
        </div>
        <div className="mt-1 text-[9px] text-slate-500">
          100% Local • Ollama
        </div>
      </div>
    </BaseNode>
  )
})

LLMNode.displayName = 'LLMNode'
