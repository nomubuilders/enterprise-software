import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { Mail } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { getNodeColorClass } from '../../config/nodeColors'

export const EmailInboxNode = memo((props: NodeProps) => {
  const nodeData = props.data as { label: string; config?: Record<string, unknown> }
  const protocol = (nodeData.config?.protocol as string) || 'imap'
  const email = nodeData.config?.email as string | undefined
  const host = nodeData.config?.host as string | undefined
  const isConnected = nodeData.config?.isConnected === true
  const hasConfig = !!(host && email)
  const filterUnread = nodeData.config?.filterUnread === true
  const filterFrom = nodeData.config?.filterFrom as string | undefined

  const getStatus = () => {
    if (isConnected) return { text: 'Connected', color: 'text-[var(--nomu-accent)]', dot: '●' }
    if (hasConfig) return { text: 'Configured', color: 'text-yellow-400', dot: '○' }
    return { text: 'Not configured', color: 'text-[var(--nomu-text-secondary)]', dot: '○' }
  }

  const getFilterLabel = () => {
    const parts: string[] = []
    if (filterUnread) parts.push('Unread only')
    if (filterFrom) parts.push(`From: ${filterFrom}`)
    return parts.length > 0 ? parts.join(', ') : null
  }

  const status = getStatus()
  const filterLabel = getFilterLabel()

  return (
    <BaseNode {...props} icon={<Mail size={16} />} color={getNodeColorClass('emailInboxNode')}>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Protocol:</span>
          <span className="text-[var(--nomu-accent)]">{protocol.toUpperCase()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Status:</span>
          <span className={status.color}>{status.dot} {status.text}</span>
        </div>
        {email && (
          <div className="flex justify-between">
            <span className="text-[var(--nomu-text-secondary)]">Email:</span>
            <span className="text-[var(--nomu-text)] truncate max-w-[120px]" title={email}>
              {email}
            </span>
          </div>
        )}
        {filterLabel && (
          <div className="flex justify-between">
            <span className="text-[var(--nomu-text-secondary)]">Filter:</span>
            <span className="text-[var(--nomu-text-muted)] truncate max-w-[120px]" title={filterLabel}>
              {filterLabel}
            </span>
          </div>
        )}
      </div>
    </BaseNode>
  )
})

EmailInboxNode.displayName = 'EmailInboxNode'
