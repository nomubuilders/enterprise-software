import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { Scale } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { getNodeColorClass } from '../../config/nodeColors'

export const BiasTestingNode = memo((props: NodeProps) => {
  const nodeData = props.data as { label: string; config?: Record<string, unknown> }
  const testType = (nodeData.config?.testType as string) ?? 'disparate_impact'
  const protectedAttributes = (nodeData.config?.protectedAttributes as string[]) ?? []
  const threshold = (nodeData.config?.threshold as number) ?? 0.8

  const testLabels: Record<string, string> = {
    disparate_impact: 'Disparate Impact',
    demographic_parity: 'Demographic Parity',
    equalized_odds: 'Equalized Odds',
    calibration: 'Calibration',
  }

  return (
    <BaseNode {...props} icon={<Scale size={16} />} color={getNodeColorClass('biasTestingNode')}>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Test:</span>
          <span className="text-rose-400">{testLabels[testType] || testType}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Attributes:</span>
          <span className="text-[var(--nomu-text)]">{protectedAttributes.length || 'None'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Threshold:</span>
          <span className="text-[var(--nomu-text)]">{threshold}</span>
        </div>
      </div>
    </BaseNode>
  )
})

BiasTestingNode.displayName = 'BiasTestingNode'
