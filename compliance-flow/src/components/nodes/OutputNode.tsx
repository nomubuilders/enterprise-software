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
    chat: 'bg-cyan-600',
    spreadsheet: 'bg-emerald-600',
    email: 'bg-rose-600',
    telegram: 'bg-sky-600',
  }

  return (
    <div
      className={`
        min-w-[180px] rounded-lg border-2 bg-slate-800 shadow-lg
        transition-all duration-200
        ${selected ? 'border-cyan-500 shadow-cyan-500/25' : 'border-slate-600'}
        hover:border-slate-500
      `}
    >
      <div className={`flex items-center gap-2 rounded-t-md px-3 py-2 ${outputColors[outputType]}`}>
        <div className="text-white">{outputIcons[outputType]}</div>
        <span className="text-sm font-medium text-white">{nodeData.label}</span>
      </div>
      <div className="p-3 text-xs text-slate-300">
        <div className="flex justify-between">
          <span className="text-slate-400">Output:</span>
          <span className="capitalize text-cyan-400">{outputType}</span>
        </div>
        <div className="mt-1 flex justify-between">
          <span className="text-slate-400">Status:</span>
          <span className="text-green-400">● Ready</span>
        </div>
      </div>
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-slate-800 !bg-blue-500"
      />
    </div>
  )
})

OutputNode.displayName = 'OutputNode'
