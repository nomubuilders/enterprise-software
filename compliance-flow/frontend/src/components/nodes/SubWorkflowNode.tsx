import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { Layers } from 'lucide-react'
import { BaseNode } from './BaseNode'

export const SubWorkflowNode = memo((props: NodeProps) => {
  const nodeData = props.data as { label: string; config?: Record<string, unknown> }
  const workflowId = (nodeData.config?.targetWorkflowId as string) || ''
  const workflowName = (nodeData.config?.targetWorkflowName as string) || ''
  const passData = nodeData.config?.passData !== false

  return (
    <BaseNode {...props} icon={<Layers size={16} />} color="bg-purple-700">
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Workflow:</span>
          <span className="text-purple-400">{workflowName || 'Not selected'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Pass Data:</span>
          <span className={passData ? 'text-green-400' : 'text-[var(--nomu-text-secondary)]'}>
            {passData ? '● Yes' : '○ No'}
          </span>
        </div>
        {workflowId && (
          <div className="flex justify-between">
            <span className="text-[var(--nomu-text-secondary)]">ID:</span>
            <span className="text-[var(--nomu-text)] font-mono text-[10px]">{workflowId.slice(0, 12)}...</span>
          </div>
        )}
      </div>
    </BaseNode>
  )
})

SubWorkflowNode.displayName = 'SubWorkflowNode'
