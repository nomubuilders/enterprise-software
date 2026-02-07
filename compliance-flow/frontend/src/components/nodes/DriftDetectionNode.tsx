import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { Activity } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { getNodeColorClass } from '../../config/nodeColors'

export const DriftDetectionNode = memo((props: NodeProps) => {
  const nodeData = props.data as { label: string; config?: Record<string, unknown> }
  const metric = (nodeData.config?.metric as string) || 'output_similarity'
  const threshold = (nodeData.config?.driftThreshold as number) || 0.15
  const schedule = (nodeData.config?.schedule as string) || 'daily'
  const baselineSet = !!(nodeData.config?.baselineId)

  return (
    <BaseNode {...props} icon={<Activity size={16} />} color={getNodeColorClass('driftDetectionNode')}>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Metric:</span>
          <span className="text-cyan-400 capitalize">{metric.replace(/_/g, ' ')}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Threshold:</span>
          <span className="text-[var(--nomu-text)]">{(threshold * 100).toFixed(0)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Schedule:</span>
          <span className="text-[var(--nomu-text)] capitalize">{schedule}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Baseline:</span>
          <span className={baselineSet ? 'text-green-400' : 'text-[var(--nomu-text-secondary)]'}>
            {baselineSet ? '● Set' : '○ Not set'}
          </span>
        </div>
      </div>
    </BaseNode>
  )
})

DriftDetectionNode.displayName = 'DriftDetectionNode'
