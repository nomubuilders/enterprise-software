import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { Ticket } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { getNodeColorClass } from '../../config/nodeColors'

const ANALYSIS_TYPE_LABELS: Record<string, string> = {
  resolution_time: 'Resolution Time',
  sla_compliance: 'SLA Compliance',
  sprint_velocity: 'Sprint Velocity',
  audit_trail: 'Audit Trail',
}

export const JiraComplianceNode = memo((props: NodeProps) => {
  const config = (props.data as { config?: Record<string, unknown> }).config
  const analysisType = (config?.analysisType as string) || 'resolution_time'
  const authType = (config?.authType as string) || 'oauth'

  return (
    <BaseNode {...props} icon={<Ticket size={16} />} color={getNodeColorClass('jiraComplianceNode')}>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Analysis:</span>
          <span className="text-indigo-400">{ANALYSIS_TYPE_LABELS[analysisType] || analysisType}</span>
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
