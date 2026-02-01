import { memo } from 'react'
import type { ReactNode } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'

interface BaseNodeProps extends NodeProps {
  icon: ReactNode
  color: string
  children?: ReactNode
}

export const BaseNode = memo(({ data, selected, icon, color, children }: BaseNodeProps) => {
  const nodeData = data as { label: string; config?: Record<string, unknown> }

  return (
    <div
      className={`
        min-w-[180px] rounded-lg border-2 bg-slate-800 shadow-lg
        transition-all duration-200
        ${selected ? 'border-blue-500 shadow-blue-500/25' : 'border-slate-600'}
        hover:border-slate-500
      `}
    >
      <div className={`flex items-center gap-2 rounded-t-md px-3 py-2 ${color}`}>
        <div className="text-white">{icon}</div>
        <span className="text-sm font-medium text-white">{nodeData.label}</span>
      </div>
      <div className="p-3 text-xs text-slate-300">{children}</div>
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-slate-800 !bg-blue-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !border-2 !border-slate-800 !bg-green-500"
      />
    </div>
  )
})

BaseNode.displayName = 'BaseNode'
