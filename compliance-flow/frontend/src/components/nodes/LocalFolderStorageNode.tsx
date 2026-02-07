import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { FolderOpen } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { getNodeColorClass } from '../../config/nodeColors'

const OPERATION_LABELS: Record<string, string> = {
  list: 'List Files',
  read: 'Read File',
  write: 'Write File',
  monitor: 'Monitor Changes',
}

export const LocalFolderStorageNode = memo((props: NodeProps) => {
  const config = (props.data as { config?: Record<string, unknown> }).config
  const operation = (config?.operation as string) || 'list'
  const filePattern = (config?.filePattern as string) || '*'
  const recursive = config?.recursive === true

  return (
    <BaseNode {...props} icon={<FolderOpen size={16} />} color={getNodeColorClass('localFolderStorageNode')}>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Operation:</span>
          <span className="text-amber-400">{OPERATION_LABELS[operation] || operation}</span>
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
