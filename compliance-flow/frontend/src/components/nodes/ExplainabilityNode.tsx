import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { Lightbulb } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { getNodeColorClass } from '../../config/nodeColors'

export const ExplainabilityNode = memo((props: NodeProps) => {
  const nodeData = props.data as { label: string; config?: Record<string, unknown> }
  const method = (nodeData.config?.method as string) ?? 'feature_importance'
  const model = (nodeData.config?.model as string) ?? 'llama3.2'
  const detailLevel = (nodeData.config?.detailLevel as string) ?? 'summary'

  const methodLabels: Record<string, string> = {
    feature_importance: 'Feature Importance',
    counterfactual: 'Counterfactual',
    decision_trail: 'Decision Trail',
    shap_proxy: 'SHAP Proxy (LLM)',
  }

  return (
    <BaseNode {...props} icon={<Lightbulb size={16} />} color={getNodeColorClass('explainabilityNode')}>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Method:</span>
          <span className="text-amber-400">{methodLabels[method] || method}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Model:</span>
          <span className="text-[var(--nomu-text)]">{model}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Detail:</span>
          <span className="text-[var(--nomu-text)] capitalize">{detailLevel}</span>
        </div>
      </div>
    </BaseNode>
  )
})

ExplainabilityNode.displayName = 'ExplainabilityNode'
