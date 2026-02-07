import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { Archive } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { getNodeColorClass } from '../../config/nodeColors'

export const EvidenceCollectionNode = memo((props: NodeProps) => {
  const nodeData = props.data as { label: string; config?: Record<string, unknown> }
  const artifactTypes = (nodeData.config?.artifactTypes as string[]) || ['logs']
  const targetFramework = (nodeData.config?.targetFramework as string) || 'soc2'
  const autoPackage = nodeData.config?.autoPackage !== false

  const frameworkLabels: Record<string, string> = {
    soc2: 'SOC 2',
    iso27001: 'ISO 27001',
    hipaa: 'HIPAA',
    gdpr: 'GDPR',
    eu_ai_act: 'EU AI Act',
  }

  return (
    <BaseNode {...props} icon={<Archive size={16} />} color={getNodeColorClass('evidenceCollectionNode')}>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Framework:</span>
          <span className="text-teal-400">{frameworkLabels[targetFramework] || targetFramework}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Artifacts:</span>
          <span className="text-[var(--nomu-text)]">{artifactTypes.length} types</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Auto-pack:</span>
          <span className={autoPackage ? 'text-green-400' : 'text-[var(--nomu-text-secondary)]'}>
            {autoPackage ? '● On' : '○ Off'}
          </span>
        </div>
      </div>
    </BaseNode>
  )
})

EvidenceCollectionNode.displayName = 'EvidenceCollectionNode'
