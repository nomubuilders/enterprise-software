import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { Bug } from 'lucide-react'
import { BaseNode } from './BaseNode'

export const RedTeamingNode = memo((props: NodeProps) => {
  const nodeData = props.data as { label: string; config?: Record<string, unknown> }
  const attackVectors = (nodeData.config?.attackVectors as string[]) || ['prompt_injection']
  const severity = (nodeData.config?.minSeverity as string) || 'medium'
  const iterations = (nodeData.config?.iterations as number) || 10

  const severityColors: Record<string, string> = {
    low: 'text-green-400',
    medium: 'text-yellow-400',
    high: 'text-orange-400',
    critical: 'text-red-400',
  }

  return (
    <BaseNode {...props} icon={<Bug size={16} />} color="bg-red-700">
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Vectors:</span>
          <span className="text-red-400">{attackVectors.length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Min Severity:</span>
          <span className={`capitalize ${severityColors[severity] || 'text-yellow-400'}`}>{severity}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Iterations:</span>
          <span className="text-[var(--nomu-text)]">{iterations}</span>
        </div>
      </div>
    </BaseNode>
  )
})

RedTeamingNode.displayName = 'RedTeamingNode'
