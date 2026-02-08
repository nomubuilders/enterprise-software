import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { Brain } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { getNodeColorClass } from '../../config/nodeColors'

export const ModelRegistryNode = memo((props: NodeProps) => {
  const nodeData = props.data as { label: string; config?: Record<string, unknown> }
  const modelName = (nodeData.config?.modelName as string) ?? ''
  const riskLevel = (nodeData.config?.riskLevel as string) ?? 'unclassified'
  const version = (nodeData.config?.modelVersion as string) ?? '1.0'

  const riskColors: Record<string, string> = {
    unacceptable: 'text-red-500',
    high: 'text-orange-400',
    limited: 'text-yellow-400',
    minimal: 'text-green-400',
    unclassified: 'text-[var(--nomu-text-secondary)]',
  }

  return (
    <BaseNode {...props} icon={<Brain size={16} />} color={getNodeColorClass('modelRegistryNode')}>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Model:</span>
          <span className="text-[var(--nomu-text)]">{modelName || 'Not set'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Risk:</span>
          <span className={`capitalize ${riskColors[riskLevel] || riskColors.unclassified}`}>{riskLevel}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Version:</span>
          <span className="text-[var(--nomu-text)]">v{version}</span>
        </div>
      </div>
    </BaseNode>
  )
})

ModelRegistryNode.displayName = 'ModelRegistryNode'
