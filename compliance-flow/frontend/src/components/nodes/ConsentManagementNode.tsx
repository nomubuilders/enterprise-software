import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { UserCheck } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { getNodeColorClass } from '../../config/nodeColors'

export const ConsentManagementNode = memo((props: NodeProps) => {
  const nodeData = props.data as { label: string; config?: Record<string, unknown> }
  const regulation = (nodeData.config?.regulation as string) ?? 'gdpr'
  const consentType = (nodeData.config?.consentType as string) ?? 'explicit'
  const blockOnMissing = nodeData.config?.blockOnMissing !== false

  const regLabels: Record<string, string> = {
    gdpr: 'GDPR Art. 7',
    hipaa: 'HIPAA Auth.',
    ccpa: 'CCPA',
    lgpd: 'LGPD',
  }

  return (
    <BaseNode {...props} icon={<UserCheck size={16} />} color={getNodeColorClass('consentManagementNode')}>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Regulation:</span>
          <span className="text-lime-400">{regLabels[regulation] || regulation}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Consent:</span>
          <span className="text-[var(--nomu-text)] capitalize">{consentType}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Block if missing:</span>
          <span className={blockOnMissing ? 'text-red-400' : 'text-[var(--nomu-text-secondary)]'}>
            {blockOnMissing ? '● Yes' : '○ No'}
          </span>
        </div>
      </div>
    </BaseNode>
  )
})

ConsentManagementNode.displayName = 'ConsentManagementNode'
