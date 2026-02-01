import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { Play, Clock, Webhook } from 'lucide-react'

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
        min-w-[180px] rounded-lg border-2 bg-slate-800 shadow-lg
        transition-all duration-200
        ${selected ? 'border-green-500 shadow-green-500/25' : 'border-slate-600'}
        hover:border-slate-500
      `}
    >
      <div className="flex items-center gap-2 rounded-t-md bg-green-600 px-3 py-2">
        <div className="text-white">{triggerIcons[triggerType]}</div>
        <span className="text-sm font-medium text-white">{nodeData.label}</span>
      </div>
      <div className="p-3 text-xs text-slate-300">
        <div className="flex justify-between">
          <span className="text-slate-400">Type:</span>
          <span className="capitalize text-green-400">{triggerType}</span>
        </div>
        <div className="mt-1 flex justify-between">
          <span className="text-slate-400">Info:</span>
          <span className="text-slate-300">{triggerLabels[triggerType]}</span>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !border-2 !border-slate-800 !bg-green-500"
      />
    </div>
  )
})

TriggerNode.displayName = 'TriggerNode'
