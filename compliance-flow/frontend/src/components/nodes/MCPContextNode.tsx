import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { Plug } from 'lucide-react'
import { BaseNode } from './BaseNode'

export const MCPContextNode = memo((props: NodeProps) => {
  const nodeData = props.data as { label: string; config?: Record<string, unknown> }
  const serverUrl = nodeData.config?.serverUrl as string | undefined
  const toolCount = (nodeData.config?.toolCount as number) || 0
  const protocol = (nodeData.config?.protocol as string) || 'stdio'
  const isConnected = nodeData.config?.isConnected === true

  const getStatus = () => {
    if (isConnected) return { text: 'Connected', color: 'text-[var(--nomu-accent)]', dot: '●' }
    if (serverUrl) return { text: 'Configured', color: 'text-yellow-400', dot: '○' }
    return { text: 'Not configured', color: 'text-[var(--nomu-text-secondary)]', dot: '○' }
  }

  const status = getStatus()

  return (
    <BaseNode {...props} icon={<Plug size={16} />} color="bg-[var(--nomu-primary)]">
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Protocol:</span>
          <span className="text-[var(--nomu-primary)]">{protocol.toUpperCase()}</span>
        </div>
        {serverUrl && (
          <div className="flex justify-between">
            <span className="text-[var(--nomu-text-secondary)]">Server:</span>
            <span className="text-[var(--nomu-text)] truncate max-w-[100px]" title={serverUrl}>
              {serverUrl}
            </span>
          </div>
        )}
        {toolCount > 0 && (
          <div className="flex justify-between">
            <span className="text-[var(--nomu-text-secondary)]">Tools:</span>
            <span className="text-[var(--nomu-text)]">{toolCount} available</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Status:</span>
          <span className={status.color}>{status.dot} {status.text}</span>
        </div>
      </div>
    </BaseNode>
  )
})

MCPContextNode.displayName = 'MCPContextNode'
