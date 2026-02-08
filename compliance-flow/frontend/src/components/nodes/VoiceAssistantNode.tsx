import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { Mic } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { getNodeColorClass } from '../../config/nodeColors'

const MODEL_LABELS: Record<string, string> = {
  tiny: 'Tiny',
  small: 'Small',
  medium: 'Medium',
  'large-v3-turbo': 'Large v3 Turbo',
}

export const VoiceAssistantNode = memo((props: NodeProps) => {
  const config = (props.data as { config?: Record<string, unknown> }).config
  const model = (config?.transcription_model as string) ?? 'small'
  const language = (config?.language as string) ?? 'en'
  const useBackend = config?.use_backend === true
  const personaplexEnabled = config?.personaplex_enabled === true

  return (
    <BaseNode {...props} icon={<Mic size={16} />} color={getNodeColorClass('voiceAssistantNode')}>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Model:</span>
          <span className="text-blue-400">{MODEL_LABELS[model] ?? model}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Language:</span>
          <span className="text-blue-400">{language.toUpperCase()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Backend:</span>
          <span className={useBackend ? 'text-green-400' : 'text-[var(--nomu-text-secondary)]'}>
            {useBackend ? '● On' : '○ Off'}
          </span>
        </div>
        {personaplexEnabled && (
          <div className="flex justify-between">
            <span className="text-[var(--nomu-text-secondary)]">PersonaPlex:</span>
            <span className="text-purple-400">● Active</span>
          </div>
        )}
      </div>
    </BaseNode>
  )
})

VoiceAssistantNode.displayName = 'VoiceAssistantNode'
