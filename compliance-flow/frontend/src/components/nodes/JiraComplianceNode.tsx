import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { Ticket } from 'lucide-react'
import { BaseNode } from './BaseNode'

export const JiraComplianceNode = memo((props: NodeProps) => {
  const nodeData = props.data as { label: string; config?: Record<string, unknown> }
  const analysisType = (nodeData.config?.analysisType as string) || 'resolution_time'
  const authType = (nodeData.config?.authType as string) || 'oauth'

  const analysisLabels: Record<string, string> = {
    resolution_time: 'Resolution Time',
    sla_compliance: 'SLA Compliance',
    sprint_velocity: 'Sprint Velocity',
    audit_trail: 'Audit Trail',
  }

  return (
    <BaseNode {...props} icon={<Ticket size={16} />} color="bg-indigo-600">
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Analysis:</span>
          <span className="text-indigo-400">{analysisLabels[analysisType] || analysisType}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Auth:</span>
          <span className="text-[var(--nomu-text)]">{authType === 'oauth' ? 'OAuth 2.0' : 'API Token'}</span>
        </div>
      </div>
    </BaseNode>
  )
})

JiraComplianceNode.displayName = 'JiraComplianceNode'
