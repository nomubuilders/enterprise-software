import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { Globe } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { getNodeColorClass } from '../../config/nodeColors'

export const WebSearchNode = memo((props: NodeProps) => {
  const nodeData = props.data as { label: string; config?: Record<string, unknown> }
  const engine = (nodeData.config?.engine as string) ?? 'searxng'
  const engineUrl = nodeData.config?.engineUrl as string | undefined
  const maxResults = (nodeData.config?.maxResults as number) ?? 10
  const categories = (nodeData.config?.categories as string[]) ?? []

  const hasConfig = !!engineUrl

  const engineLabels: Record<string, string> = {
    searxng: 'SearXNG',
    duckduckgo: 'DuckDuckGo',
  }

  const getStatus = () => {
    if (hasConfig) return { text: 'Configured', color: 'text-[var(--nomu-accent)]', dot: '●' }
    return { text: 'Not configured', color: 'text-[var(--nomu-text-secondary)]', dot: '○' }
  }

  const status = getStatus()

  return (
    <BaseNode {...props} icon={<Globe size={16} />} color={getNodeColorClass('webSearchNode')}>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Engine:</span>
          <span className="text-[var(--nomu-primary)]">
            {engineLabels[engine] || engine}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Max Results:</span>
          <span className="text-[var(--nomu-text)]">{maxResults}</span>
        </div>
        {categories.length > 0 && (
          <div className="flex justify-between">
            <span className="text-[var(--nomu-text-secondary)]">Categories:</span>
            <span className="text-[var(--nomu-text)] truncate max-w-[100px]">
              {categories.join(', ')}
            </span>
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

WebSearchNode.displayName = 'WebSearchNode'
