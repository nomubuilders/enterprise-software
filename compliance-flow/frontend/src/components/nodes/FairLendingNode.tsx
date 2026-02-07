import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { Landmark } from 'lucide-react'
import { BaseNode } from './BaseNode'

export const FairLendingNode = memo((props: NodeProps) => {
  const nodeData = props.data as { label: string; config?: Record<string, unknown> }
  const regulation = (nodeData.config?.regulation as string) || 'ecoa'
  const analysisType = (nodeData.config?.analysisType as string) || 'disparate_impact'
  const protectedClasses = (nodeData.config?.protectedClasses as string[]) || []

  const regLabels: Record<string, string> = {
    ecoa: 'ECOA',
    reg_b: 'Reg B',
    hmda: 'HMDA',
    cra: 'CRA',
  }

  return (
    <BaseNode {...props} icon={<Landmark size={16} />} color="bg-green-700">
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Regulation:</span>
          <span className="text-green-400">{regLabels[regulation] || regulation}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Analysis:</span>
          <span className="text-[var(--nomu-text)] capitalize">{analysisType.replace(/_/g, ' ')}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Classes:</span>
          <span className="text-[var(--nomu-text)]">{protectedClasses.length || 'All'}</span>
        </div>
      </div>
    </BaseNode>
  )
})

FairLendingNode.displayName = 'FairLendingNode'
