import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { DatabaseZap } from 'lucide-react'
import { BaseNode } from './BaseNode'

export const DatabaseCreatorNode = memo((props: NodeProps) => {
  const nodeData = props.data as { label: string; config?: Record<string, unknown> }
  const dbType = (nodeData.config?.dbType as string) || 'sqlite'
  const encrypted = nodeData.config?.encrypted === true
  const databaseName = (nodeData.config?.databaseName as string) || ''

  const typeLabels: Record<string, string> = {
    sqlite: 'SQLite (Local)',
    postgresql: 'PostgreSQL',
    mysql: 'MySQL',
    mongodb: 'MongoDB',
  }

  return (
    <BaseNode {...props} icon={<DatabaseZap size={16} />} color="bg-emerald-600">
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Type:</span>
          <span className="text-emerald-400">{typeLabels[dbType] || dbType}</span>
        </div>
        {databaseName && (
          <div className="flex justify-between">
            <span className="text-[var(--nomu-text-secondary)]">Name:</span>
            <span className="text-[var(--nomu-text)] truncate max-w-[100px]">{databaseName}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Encrypted:</span>
          <span className={encrypted ? 'text-green-400' : 'text-[var(--nomu-text-secondary)]'}>
            {encrypted ? '● SQLCipher' : '○ No'}
          </span>
        </div>
      </div>
    </BaseNode>
  )
})

DatabaseCreatorNode.displayName = 'DatabaseCreatorNode'
