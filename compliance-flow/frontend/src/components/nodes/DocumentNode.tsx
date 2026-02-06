import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { FileText, Search, Layers } from 'lucide-react'
import { BaseNode } from './BaseNode'

export const DocumentNode = memo((props: NodeProps) => {
  const nodeData = props.data as { label: string; config?: Record<string, unknown> }
  const mode = (nodeData.config?.mode as string) || 'summarize'
  const documents = (nodeData.config?.documents as unknown[]) || []

  const getModeIcon = () => {
    if (mode === 'search') return <Search size={10} className="text-[var(--nomu-primary)]" />
    if (mode === 'batch') return <Layers size={10} className="text-[var(--nomu-primary)]" />
    return <FileText size={10} className="text-[var(--nomu-primary)]" />
  }

  const getModeLabel = () => {
    if (mode === 'search') return 'Search'
    if (mode === 'batch') return 'Batch'
    return 'Summarize'
  }

  return (
    <BaseNode {...props} icon={<FileText size={16} />} color="bg-[var(--nomu-primary)]">
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-[var(--nomu-text-secondary)] text-[10px]">Docs:</span>
          <span className="text-[var(--nomu-primary)] font-medium">
            {documents.length > 0 ? `${documents.length} document(s)` : 'No documents'}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[var(--nomu-text-secondary)] text-[10px]">Mode:</span>
          <div className="flex items-center gap-1">
            {getModeIcon()}
            <span className="text-[10px] text-[var(--nomu-primary)]">{getModeLabel()}</span>
          </div>
        </div>
        <div className="mt-1 text-[9px] text-[var(--nomu-text-secondary)]">
          100% Local &bull; Privacy-First
        </div>
      </div>
    </BaseNode>
  )
})

DocumentNode.displayName = 'DocumentNode'
