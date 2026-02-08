import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { ShieldCheck } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { getNodeColorClass } from '../../config/nodeColors'

export const ApprovalGateNode = memo((props: NodeProps) => {
  const nodeData = props.data as { label: string; config?: Record<string, unknown> }
  const approvalType = (nodeData.config?.approvalType as string) ?? 'single'
  const approvers = (nodeData.config?.approvers as string[]) ?? []
  const status = (nodeData.config?.approvalStatus as string) ?? 'pending'
  const requireAll = nodeData.config?.requireAll !== false

  const getStatusDisplay = () => {
    switch (status) {
      case 'approved':
        return { text: 'Approved', color: 'text-green-400', dot: '●' }
      case 'rejected':
        return { text: 'Rejected', color: 'text-red-400', dot: '●' }
      case 'waiting':
        return { text: 'Waiting', color: 'text-yellow-400', dot: '◐' }
      default:
        return { text: 'Pending', color: 'text-[var(--nomu-text-secondary)]', dot: '○' }
    }
  }

  const statusDisplay = getStatusDisplay()

  return (
    <BaseNode {...props} icon={<ShieldCheck size={16} />} color={getNodeColorClass('approvalGateNode')}>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Type:</span>
          <span className="text-orange-400 capitalize">{approvalType}</span>
        </div>
        {approvers.length > 0 && (
          <div className="flex justify-between">
            <span className="text-[var(--nomu-text-secondary)]">Approvers:</span>
            <span className="text-[var(--nomu-text)]">{approvers.length}</span>
          </div>
        )}
        {approvalType === 'multi' && (
          <div className="flex justify-between">
            <span className="text-[var(--nomu-text-secondary)]">Require:</span>
            <span className="text-[var(--nomu-text)]">{requireAll ? 'All' : 'Any'}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Status:</span>
          <span className={statusDisplay.color}>{statusDisplay.dot} {statusDisplay.text}</span>
        </div>
      </div>
    </BaseNode>
  )
})

ApprovalGateNode.displayName = 'ApprovalGateNode'
