import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { Radio } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { getNodeColorClass } from '../../config/nodeColors'

export const WebhookGatewayNode = memo((props: NodeProps) => {
  const nodeData = props.data as { label: string; config?: Record<string, unknown> }
  const method = (nodeData.config?.method as string) || 'POST'
  const authType = (nodeData.config?.authType as string) || 'api_key'
  const endpointPath = (nodeData.config?.endpointPath as string) || ''

  return (
    <BaseNode {...props} icon={<Radio size={16} />} color={getNodeColorClass('webhookGatewayNode')}>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Method:</span>
          <span className="text-sky-400 font-mono">{method}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Auth:</span>
          <span className="text-[var(--nomu-text)] capitalize">{authType.replace(/_/g, ' ')}</span>
        </div>
        {endpointPath && (
          <div className="flex justify-between">
            <span className="text-[var(--nomu-text-secondary)]">Path:</span>
            <span className="text-[var(--nomu-text)] font-mono text-[10px]">{endpointPath}</span>
          </div>
        )}
      </div>
    </BaseNode>
  )
})

WebhookGatewayNode.displayName = 'WebhookGatewayNode'
