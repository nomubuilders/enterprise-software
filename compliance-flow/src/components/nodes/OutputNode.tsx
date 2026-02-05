import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { MessageSquare, FileSpreadsheet, Mail, Send } from 'lucide-react'

export const OutputNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as { label: string; config?: Record<string, unknown> }
  const outputType = (nodeData.config?.outputType as string) || 'chat'

  const outputIcons: Record<string, React.ReactNode> = {
    chat: <MessageSquare size={16} />,
    spreadsheet: <FileSpreadsheet size={16} />,
    email: <Mail size={16} />,
    telegram: <Send size={16} />,
  }

  const outputColors: Record<string, string> = {
    chat: 'bg-[#4004DA]',
    spreadsheet: 'bg-[#4D4D4D]',
    email: 'bg-[#FF6C1D]',
    telegram: 'bg-[#4D4D4D]',
  }

  return (
    <div
      className={`
        min-w-[180px] rounded-lg border-2 bg-[var(--nomu-surface)] shadow-lg
        transition-all duration-200
        ${selected ? 'border-[var(--nomu-primary)] shadow-[0_0_12px_rgba(64,4,218,0.25)]' : 'border-[var(--nomu-border)]'}
        hover:border-[var(--nomu-text-muted)]
      `}
    >
      <div className={`flex items-center gap-2 rounded-t-md px-3 py-2 ${outputColors[outputType]}`}>
        <div className="text-white">{outputIcons[outputType]}</div>
        <span className="text-sm font-medium text-white">{nodeData.label}</span>
      </div>
      <div className="p-3 text-xs text-[var(--nomu-text-muted)]">
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-muted)]">Output:</span>
          <span className="capitalize text-[var(--nomu-primary)]">{outputType}</span>
        </div>
        <div className="mt-1 flex justify-between">
          <span className="text-[var(--nomu-text-muted)]">Status:</span>
          <span className="text-[#FF6C1D]">● Ready</span>
        </div>
      </div>
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-[var(--nomu-surface)] !bg-[#4004DA]"
      />
    </div>
  )
})

OutputNode.displayName = 'OutputNode'
