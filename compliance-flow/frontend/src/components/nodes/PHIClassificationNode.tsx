import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { HeartPulse } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { getNodeColorClass } from '../../config/nodeColors'

export const PHIClassificationNode = memo((props: NodeProps) => {
  const nodeData = props.data as { label: string; config?: Record<string, unknown> }
  const method = (nodeData.config?.deidentMethod as string) ?? 'safe_harbor'
  const identifierCount = (nodeData.config?.identifiers as string[])?.length ?? 18

  const methodLabels: Record<string, string> = {
    safe_harbor: 'Safe Harbor (18 IDs)',
    expert_determination: 'Expert Determination',
    limited_dataset: 'Limited Dataset',
  }

  return (
    <BaseNode {...props} icon={<HeartPulse size={16} />} color={getNodeColorClass('phiClassificationNode')}>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Method:</span>
          <span className="text-pink-400">{methodLabels[method] || method}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Identifiers:</span>
          <span className="text-[var(--nomu-text)]">{identifierCount} types</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Standard:</span>
          <span className="text-pink-400">HIPAA</span>
        </div>
      </div>
    </BaseNode>
  )
})

PHIClassificationNode.displayName = 'PHIClassificationNode'
