import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { GitBranch } from 'lucide-react'
import { getNodeColorClass } from '../../config/nodeColors'

export const ConditionalNode = memo((props: NodeProps) => {
  const { data, selected } = props
  const nodeData = data as { label: string; config?: Record<string, unknown> }
  const field = (nodeData.config?.field as string) || ''
  const operator = (nodeData.config?.operator as string) || 'equals'
  const value = (nodeData.config?.value as string) || ''

  const operatorLabels: Record<string, string> = {
    equals: '==',
    not_equals: '!=',
    contains: '∋',
    greater_than: '>',
    less_than: '<',
    is_empty: '∅',
    is_not_empty: '≠∅',
    regex: '~',
  }

  return (
    <div
      className={`
        min-w-[200px] rounded-lg border-2 bg-[var(--nomu-surface)] shadow-lg
        transition-all duration-200
        ${selected ? 'border-[var(--nomu-primary)] shadow-[0_0_12px_rgba(64,4,218,0.25)]' : 'border-[var(--nomu-border)]'}
        hover:border-[var(--nomu-text-muted)]
      `}
    >
      <div className={`flex items-center gap-2 rounded-t-md px-3 py-2 ${getNodeColorClass('conditionalNode')}`}>
        <div className="text-white"><GitBranch size={16} /></div>
        <span className="text-sm font-medium text-white">{nodeData.label}</span>
      </div>
      <div className="p-3 text-xs text-[var(--nomu-text-secondary)]">
        <div className="space-y-1">
          {field ? (
            <>
              <div className="flex justify-between">
                <span className="text-[var(--nomu-text-secondary)]">Field:</span>
                <span className="text-[var(--nomu-text)] font-mono">{field}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--nomu-text-secondary)]">Condition:</span>
                <span className="text-yellow-400">{operatorLabels[operator] || operator} {value}</span>
              </div>
            </>
          ) : (
            <span className="text-[var(--nomu-text-muted)] italic">No condition set</span>
          )}
        </div>
      </div>
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-[var(--nomu-surface)] !bg-[var(--nomu-primary)]"
      />
      {/* True output handle (top-right) */}
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        style={{ top: '35%' }}
        className="!h-3 !w-3 !border-2 !border-[var(--nomu-surface)] !bg-green-500"
      />
      {/* False output handle (bottom-right) */}
      <Handle
        type="source"
        position={Position.Right}
        id="false"
        style={{ top: '65%' }}
        className="!h-3 !w-3 !border-2 !border-[var(--nomu-surface)] !bg-red-500"
      />
      {/* Labels for handles */}
      <div className="absolute right-5 text-[10px] font-medium" style={{ top: 'calc(35% - 6px)' }}>
        <span className="text-green-400">True</span>
      </div>
      <div className="absolute right-5 text-[10px] font-medium" style={{ top: 'calc(65% - 6px)' }}>
        <span className="text-red-400">False</span>
      </div>
    </div>
  )
})

ConditionalNode.displayName = 'ConditionalNode'
