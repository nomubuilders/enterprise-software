import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { Bell } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { getNodeColorClass } from '../../config/nodeColors'

export const NotificationNode = memo((props: NodeProps) => {
  const nodeData = props.data as { label: string; config?: Record<string, unknown> }
  const channel = (nodeData.config?.channel as string) || 'webhook'
  const templateSet = !!(nodeData.config?.messageTemplate)

  const channelLabels: Record<string, string> = {
    slack: 'Slack',
    teams: 'MS Teams',
    sms: 'SMS (Twilio)',
    webhook: 'Webhook',
    email: 'Email',
  }

  return (
    <BaseNode {...props} icon={<Bell size={16} />} color={getNodeColorClass('notificationNode')}>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Channel:</span>
          <span className="text-blue-400">{channelLabels[channel] || channel}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Template:</span>
          <span className={templateSet ? 'text-green-400' : 'text-[var(--nomu-text-secondary)]'}>
            {templateSet ? '● Set' : '○ Default'}
          </span>
        </div>
      </div>
    </BaseNode>
  )
})

NotificationNode.displayName = 'NotificationNode'
