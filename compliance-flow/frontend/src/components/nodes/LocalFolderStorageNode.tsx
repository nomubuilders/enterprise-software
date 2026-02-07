import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { FolderOpen } from 'lucide-react'
import { BaseNode } from './BaseNode'

export const LocalFolderStorageNode = memo((props: NodeProps) => {
  const nodeData = props.data as { label: string; config?: Record<string, unknown> }
  const operation = (nodeData.config?.operation as string) || 'list'
  const filePattern = (nodeData.config?.filePattern as string) || '*'
  const recursive = nodeData.config?.recursive === true

  const opLabels: Record<string, string> = {
    list: 'List Files',
    read: 'Read File',
    write: 'Write File',
    monitor: 'Monitor Changes',
  }

  return (
    <BaseNode {...props} icon={<FolderOpen size={16} />} color="bg-amber-600">
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Operation:</span>
          <span className="text-amber-400">{opLabels[operation] || operation}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Pattern:</span>
          <span className="text-[var(--nomu-text)] truncate max-w-[100px]">{filePattern}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Recursive:</span>
          <span className={recursive ? 'text-green-400' : 'text-[var(--nomu-text-secondary)]'}>
            {recursive ? '● Yes' : '○ No'}
          </span>
        </div>
      </div>
    </BaseNode>
  )
})

LocalFolderStorageNode.displayName = 'LocalFolderStorageNode'
