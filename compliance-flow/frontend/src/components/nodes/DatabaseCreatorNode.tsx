import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { DatabaseZap } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { getNodeColorClass } from '../../config/nodeColors'

const DB_TYPE_LABELS: Record<string, string> = {
  sqlite: 'SQLite (Local)',
  postgresql: 'PostgreSQL',
  mysql: 'MySQL',
  mongodb: 'MongoDB',
}

export const DatabaseCreatorNode = memo((props: NodeProps) => {
  const config = (props.data as { config?: Record<string, unknown> }).config
  const dbType = (config?.dbType as string) ?? 'sqlite'
  const encrypted = config?.encrypted === true
  const databaseName = (config?.databaseName as string) ?? ''

  return (
    <BaseNode {...props} icon={<DatabaseZap size={16} />} color={getNodeColorClass('databaseCreatorNode')}>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Type:</span>
          <span className="text-emerald-400">{DB_TYPE_LABELS[dbType] || dbType}</span>
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
