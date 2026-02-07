import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { Play, Clock, Webhook } from 'lucide-react'
import { getNodeColorClass } from '../../config/nodeColors'

export const TriggerNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as { label: string; config?: Record<string, unknown> }
  const triggerType = (nodeData.config?.triggerType as string) || 'manual'

  const triggerIcons: Record<string, React.ReactNode> = {
    manual: <Play size={16} />,
    schedule: <Clock size={16} />,
    webhook: <Webhook size={16} />,
  }

  const triggerLabels: Record<string, string> = {
    manual: 'Click to run',
    schedule: 'Every 5 min',
    webhook: '/api/trigger',
  }

  return (
    <div
      className={`
        min-w-[180px] rounded-lg border-2 bg-[var(--nomu-surface)] shadow-lg
        transition-all duration-200
        ${selected ? 'border-[var(--nomu-accent)] shadow-[0_0_12px_rgba(255,108,29,0.25)]' : 'border-[var(--nomu-border)]'}
        hover:border-[var(--nomu-text-muted)]
      `}
    >
      <div className={`flex items-center gap-2 rounded-t-md px-3 py-2 ${getNodeColorClass('triggerNode')}`}>
        <div className="text-white">{triggerIcons[triggerType]}</div>
        <span className="text-sm font-medium text-white">{nodeData.label}</span>
      </div>
      <div className="p-3 text-xs text-[var(--nomu-text-secondary)]">
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Type:</span>
          <span className="capitalize text-[var(--nomu-accent)]">{triggerType}</span>
        </div>
        <div className="mt-1 flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Info:</span>
          <span className="text-[var(--nomu-text-secondary)]">{triggerLabels[triggerType]}</span>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !border-2 !border-[var(--nomu-surface)] !bg-[var(--nomu-accent)]"
      />
    </div>
  )
})

TriggerNode.displayName = 'TriggerNode'
