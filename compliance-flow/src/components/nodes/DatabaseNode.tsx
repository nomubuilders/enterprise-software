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
    postgresql: 'text-blue-400',
    mysql: 'text-orange-400',
    mongodb: 'text-green-400',
    redis: 'text-red-400',
  }

  const getStatus = () => {
    if (isConnected) return { text: 'Connected', color: 'text-green-400', dot: '●' }
    if (hasConfig) return { text: 'Configured', color: 'text-yellow-400', dot: '○' }
    return { text: 'Not configured', color: 'text-slate-500', dot: '○' }
  }

  const status = getStatus()

  return (
    <BaseNode {...props} icon={<Database size={16} />} color="bg-blue-600">
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-slate-400">Type:</span>
          <span className={dbColors[dbType] || 'text-slate-300'}>
            {dbType.toUpperCase()}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Status:</span>
          <span className={status.color}>{status.dot} {status.text}</span>
        </div>
      </div>
    </BaseNode>
  )
})

DatabaseNode.displayName = 'DatabaseNode'
