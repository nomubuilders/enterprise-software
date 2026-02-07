import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { FileCheck } from 'lucide-react'
import { BaseNode } from './BaseNode'

export const ClaimsAuditNode = memo((props: NodeProps) => {
  const nodeData = props.data as { label: string; config?: Record<string, unknown> }
  const auditType = (nodeData.config?.auditType as string) || 'full'
  const flagAutoDenials = nodeData.config?.flagAutoDenials !== false
  const generateExplanation = nodeData.config?.generateExplanation !== false

  return (
    <BaseNode {...props} icon={<FileCheck size={16} />} color="bg-orange-700">
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Audit:</span>
          <span className="text-orange-400 capitalize">{auditType}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Auto-Denial Flag:</span>
          <span className={flagAutoDenials ? 'text-green-400' : 'text-[var(--nomu-text-secondary)]'}>
            {flagAutoDenials ? '● On' : '○ Off'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Explanation:</span>
          <span className={generateExplanation ? 'text-green-400' : 'text-[var(--nomu-text-secondary)]'}>
            {generateExplanation ? '● On' : '○ Off'}
          </span>
        </div>
      </div>
    </BaseNode>
  )
})

ClaimsAuditNode.displayName = 'ClaimsAuditNode'
