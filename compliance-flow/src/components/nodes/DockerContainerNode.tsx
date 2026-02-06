import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { Container } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { useDockerStore } from '../../store/dockerStore'

export const DockerContainerNode = memo((props: NodeProps) => {
  const nodeData = props.data as { label: string; config?: Record<string, unknown> }
  const image = (nodeData.config?.image as string) || 'Not selected'
  const tag = (nodeData.config?.tag as string) || 'latest'
  const cpuLimit = (nodeData.config?.cpuLimit as number) || 0.5
  const memoryLimit = (nodeData.config?.memoryLimit as number) || 512
  const networkMode = (nodeData.config?.networkMode as string) || 'none'
  const status = (nodeData.config?.status as string) || 'idle'
  const dockerAvailable = useDockerStore((s) => s.dockerAvailable)

  const getStatusDisplay = () => {
    switch (status) {
      case 'running': return { text: 'Running', color: 'text-blue-400', dot: '\u25CF' }
      case 'completed': return { text: 'Completed', color: 'text-green-400', dot: '\u25CF' }
      case 'error': return { text: 'Error', color: 'text-red-400', dot: '\u25CF' }
      case 'pulling': return { text: 'Pulling...', color: 'text-yellow-400', dot: '\u25CB' }
      default: return { text: 'Idle', color: 'text-[var(--nomu-text-secondary)]', dot: '\u25CB' }
    }
  }

  const statusDisplay = getStatusDisplay()

  return (
    <BaseNode {...props} icon={<Container size={16} />} color="bg-[var(--nomu-primary)]">
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-[var(--nomu-text-secondary)]">Image:</span>
          <span className="text-[var(--nomu-text-secondary)] font-medium truncate max-w-[120px]" title={`${image}:${tag}`}>
            {image}:{tag}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[var(--nomu-text-secondary)]">Resources:</span>
          <span className="text-[var(--nomu-text-secondary)]">{cpuLimit} CPU / {memoryLimit}MB</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[var(--nomu-text-secondary)]">Status:</span>
          <span className={statusDisplay.color}>{statusDisplay.dot} {statusDisplay.text}</span>
        </div>
        <div className="mt-1">
          {networkMode === 'none' ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--nomu-primary)]/20 px-2 py-0.5 text-[10px] font-medium text-[var(--nomu-primary)]">
              Air-Gapped
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--nomu-accent)]/20 px-2 py-0.5 text-[10px] font-medium text-[var(--nomu-accent)]">
              Internal Only
            </span>
          )}
          {!dockerAvailable && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-500/20 px-2 py-0.5 text-[10px] font-medium text-gray-400">
              Docker Unavailable
            </span>
          )}
        </div>
      </div>
    </BaseNode>
  )
})

DockerContainerNode.displayName = 'DockerContainerNode'
