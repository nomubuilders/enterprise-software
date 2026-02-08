import { memo } from 'react'
import type { ReactNode } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { CheckCircle2, XCircle, PowerOff } from 'lucide-react'
import { useWorkflowStore } from '../../store/workflowStore'

interface BaseNodeProps extends NodeProps {
  icon: ReactNode
  color: string
  children?: ReactNode
}

export const BaseNode = memo(({ id, data, selected, icon, color, children }: BaseNodeProps) => {
  const nodeData = data as { label: string; config?: Record<string, unknown>; disabled?: boolean }
  const disabled = nodeData.disabled ?? false

  // Derive per-node execution status from current execution logs
  const nodeExecStatus = useWorkflowStore((state) => {
    const exec = state.currentExecution
    if (!exec || exec.status === 'pending') return null
    const logs = exec.logs.filter((l) => l.nodeId === id)
    if (logs.length === 0) return null
    return logs.some((l) => l.level === 'error') ? 'error' : 'success'
  })

  return (
    <div
      className={`
        relative min-w-[180px] rounded-lg border-2 bg-[var(--nomu-surface)] shadow-lg
        transition-all duration-200
        ${disabled ? 'opacity-40 border-dashed' : ''}
        ${selected ? 'border-[var(--nomu-primary)] shadow-[0_0_12px_rgba(64,4,218,0.25)]' : 'border-[var(--nomu-border)]'}
        hover:border-[var(--nomu-text-muted)]
      `}
    >
      {/* Execution status badge */}
      {nodeExecStatus && !disabled && (
        <div className="absolute -right-1.5 -top-1.5 z-10">
          {nodeExecStatus === 'success' ? (
            <CheckCircle2 size={16} className="rounded-full bg-[var(--nomu-surface)] text-green-500" />
          ) : (
            <XCircle size={16} className="rounded-full bg-[var(--nomu-surface)] text-red-500" />
          )}
        </div>
      )}
      {/* Disabled indicator */}
      {disabled && (
        <div className="absolute -right-1.5 -top-1.5 z-10">
          <PowerOff size={16} className="rounded-full bg-[var(--nomu-surface)] text-[var(--nomu-text-muted)]" />
        </div>
      )}
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
