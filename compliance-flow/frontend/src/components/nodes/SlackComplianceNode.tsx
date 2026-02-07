import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { MessageSquare } from 'lucide-react'
import { BaseNode } from './BaseNode'

const SCAN_MODE_LABELS: Record<string, string> = {
  realtime: 'Real-time',
  batch: 'Batch Scan',
  discovery: 'Discovery',
}

export const SlackComplianceNode = memo((props: NodeProps) => {
  const config = (props.data as { config?: Record<string, unknown> }).config
  const scanMode = (config?.scanMode as string) || 'batch'
  const detectPII = config?.detectPII !== false
  const extractDocs = config?.extractDocs === true

  return (
    <BaseNode {...props} icon={<MessageSquare size={16} />} color="bg-purple-600">
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Mode:</span>
          <span className="text-purple-400">{SCAN_MODE_LABELS[scanMode] || scanMode}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">PII Scan:</span>
          <span className={detectPII ? 'text-green-400' : 'text-[var(--nomu-text-secondary)]'}>
            {detectPII ? '● On' : '○ Off'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Extract Docs:</span>
          <span className={extractDocs ? 'text-green-400' : 'text-[var(--nomu-text-secondary)]'}>
            {extractDocs ? '● Yes' : '○ No'}
          </span>
        </div>
      </div>
    </BaseNode>
  )
})

SlackComplianceNode.displayName = 'SlackComplianceNode'
