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
        min-w-[180px] rounded-lg border-2 bg-[var(--nomu-surface)] shadow-lg
        transition-all duration-200
        ${selected ? 'border-[var(--nomu-primary)] shadow-[0_0_12px_rgba(64,4,218,0.25)]' : 'border-[var(--nomu-border)]'}
        hover:border-[var(--nomu-text-muted)]
      `}
    >
      <div className={`flex items-center gap-2 rounded-t-md px-3 py-2 ${color}`}>
        <div className="text-white">{icon}</div>
        <span className="text-sm font-medium text-white">{nodeData.label}</span>
      </div>
      <div className="p-3 text-xs text-[var(--nomu-text-secondary)]">{children}</div>
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-[var(--nomu-surface)] !bg-[var(--nomu-primary)]"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !border-2 !border-[var(--nomu-surface)] !bg-[var(--nomu-accent)]"
      />
    </div>
  )
})

BaseNode.displayName = 'BaseNode'
