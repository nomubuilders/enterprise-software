import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { Bot } from 'lucide-react'
import { BaseNode } from './BaseNode'

export const LLMNode = memo((props: NodeProps) => {
  const nodeData = props.data as { label: string; config?: Record<string, unknown> }
  const model = (nodeData.config?.model as string) || 'llama3.2'

  return (
    <BaseNode {...props} icon={<Bot size={16} />} color="bg-purple-600">
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-slate-400">Model:</span>
          <span className="text-purple-400">{model}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Provider:</span>
          <span className="text-slate-300">Ollama (Local)</span>
        </div>
      </div>
    </BaseNode>
  )
})

LLMNode.displayName = 'LLMNode'
