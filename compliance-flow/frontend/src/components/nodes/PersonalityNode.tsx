import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { UserCircle } from 'lucide-react'
import { BaseNode } from './BaseNode'

export const PersonalityNode = memo((props: NodeProps) => {
  const nodeData = props.data as { label: string; config?: Record<string, unknown> }
  const persona = (nodeData.config?.persona as string) || 'professional'
  const tone = (nodeData.config?.tone as string) || 'formal'
  const language = (nodeData.config?.language as string) || 'en'

  const personaLabels: Record<string, string> = {
    professional: 'Professional',
    technical: 'Technical',
    friendly: 'Friendly',
    legal: 'Legal Expert',
  }

  const toneLabels: Record<string, string> = {
    formal: 'Formal',
    casual: 'Casual',
    concise: 'Concise',
    detailed: 'Detailed',
  }

  return (
    <BaseNode {...props} icon={<UserCircle size={16} />} color="bg-[var(--nomu-primary)]">
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Persona:</span>
          <span className="text-[var(--nomu-primary)]">
            {personaLabels[persona] || persona}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Tone:</span>
          <span className="text-[var(--nomu-primary)]">
            {toneLabels[tone] || tone}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Language:</span>
          <span className="text-[var(--nomu-text)]">{language.toUpperCase()}</span>
        </div>
      </div>
    </BaseNode>
  )
})

PersonalityNode.displayName = 'PersonalityNode'
