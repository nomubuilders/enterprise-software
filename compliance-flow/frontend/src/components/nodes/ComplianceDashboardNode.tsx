import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { BarChart3 } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { getNodeColorClass } from '../../config/nodeColors'

export const ComplianceDashboardNode = memo((props: NodeProps) => {
  const nodeData = props.data as { label: string; config?: Record<string, unknown> }
  const frameworks = (nodeData.config?.frameworks as string[]) ?? []
  const reportFormat = (nodeData.config?.reportFormat as string) ?? 'pdf'
  const autoGenerate = nodeData.config?.autoGenerate !== false

  return (
    <BaseNode {...props} icon={<BarChart3 size={16} />} color={getNodeColorClass('complianceDashboardNode')}>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Frameworks:</span>
          <span className="text-indigo-400">{frameworks.length > 0 ? frameworks.join(', ') : 'None'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Report:</span>
          <span className="text-[var(--nomu-text)]">{reportFormat.toUpperCase()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Auto-gen:</span>
          <span className={autoGenerate ? 'text-green-400' : 'text-[var(--nomu-text-secondary)]'}>
            {autoGenerate ? '● On' : '○ Off'}
          </span>
        </div>
      </div>
    </BaseNode>
  )
})

ComplianceDashboardNode.displayName = 'ComplianceDashboardNode'
