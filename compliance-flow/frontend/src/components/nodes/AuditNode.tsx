import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { ScrollText } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { getNodeColorClass } from '../../config/nodeColors'

export const AuditNode = memo((props: NodeProps) => {
  const nodeData = props.data as { label: string; config?: Record<string, unknown> }
  const auditLevel = (nodeData.config?.auditLevel as string) || 'full'
  const retention = (nodeData.config?.retentionDays as number) || 90
  const logFormat = (nodeData.config?.logFormat as string) || 'json'
  const isEnabled = nodeData.config?.enabled !== false

  const getStatus = () => {
    if (isEnabled) return { text: 'Active', color: 'text-[var(--nomu-accent)]', dot: '●' }
    return { text: 'Disabled', color: 'text-[var(--nomu-text-secondary)]', dot: '○' }
  }

  const status = getStatus()

  return (
    <BaseNode {...props} icon={<ScrollText size={16} />} color={getNodeColorClass('auditNode')}>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Level:</span>
          <span className="text-[var(--nomu-accent)] capitalize">{auditLevel}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Retention:</span>
          <span className="text-[var(--nomu-text)]">{retention} days</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Format:</span>
          <span className="text-[var(--nomu-text)]">{logFormat.toUpperCase()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Status:</span>
          <span className={status.color}>{status.dot} {status.text}</span>
        </div>
      </div>
    </BaseNode>
  )
})

AuditNode.displayName = 'AuditNode'
