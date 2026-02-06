import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { Database } from 'lucide-react'
import { BaseNode } from './BaseNode'

export const DatabaseNode = memo((props: NodeProps) => {
  const nodeData = props.data as { label: string; config?: Record<string, unknown> }
  const dbType = (nodeData.config?.dbType as string) || 'postgresql'
  const isConnected = nodeData.config?.isConnected === true
  const hasConfig = !!(nodeData.config?.host && nodeData.config?.database)

  const dbColors: Record<string, string> = {
    postgresql: 'text-[var(--nomu-primary)]',
    mysql: 'text-[var(--nomu-accent)]',
    mongodb: 'text-[var(--nomu-accent)]',
    redis: 'text-red-400',
  }

  const getStatus = () => {
    if (isConnected) return { text: 'Connected', color: 'text-[var(--nomu-accent)]', dot: '●' }
    if (hasConfig) return { text: 'Configured', color: 'text-yellow-400', dot: '○' }
    return { text: 'Not configured', color: 'text-[var(--nomu-text-muted)]', dot: '○' }
  }

  const status = getStatus()

  return (
    <BaseNode {...props} icon={<Database size={16} />} color="bg-[var(--nomu-primary)]">
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-muted)]">Type:</span>
          <span className={dbColors[dbType] || 'text-[var(--nomu-text-muted)]'}>
            {dbType.toUpperCase()}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-muted)]">Status:</span>
          <span className={status.color}>{status.dot} {status.text}</span>
        </div>
      </div>
    </BaseNode>
  )
})

DatabaseNode.displayName = 'DatabaseNode'
