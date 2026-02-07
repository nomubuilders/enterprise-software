import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { FileCode } from 'lucide-react'
import { BaseNode } from './BaseNode'

export const CodeReviewNode = memo((props: NodeProps) => {
  const nodeData = props.data as { label: string; config?: Record<string, unknown> }
  const language = (nodeData.config?.language as string) || 'auto'
  const reviewType = (nodeData.config?.reviewType as string) || 'security'
  const severity = (nodeData.config?.minSeverity as string) || 'medium'
  const hasConfig = !!(nodeData.config?.sourceUrl || nodeData.config?.sourceText)

  const reviewLabels: Record<string, string> = {
    security: 'Security',
    style: 'Style',
    bugs: 'Bug Detection',
    performance: 'Performance',
    all: 'Full Review',
  }

  const severityColors: Record<string, string> = {
    low: 'text-green-400',
    medium: 'text-yellow-400',
    high: 'text-[var(--nomu-accent)]',
    critical: 'text-red-400',
  }

  const getStatus = () => {
    if (hasConfig) return { text: 'Configured', color: 'text-[var(--nomu-accent)]', dot: '●' }
    return { text: 'Not configured', color: 'text-[var(--nomu-text-secondary)]', dot: '○' }
  }

  const status = getStatus()

  return (
    <BaseNode {...props} icon={<FileCode size={16} />} color="bg-[var(--nomu-primary)]">
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Review:</span>
          <span className="text-[var(--nomu-primary)]">
            {reviewLabels[reviewType] || reviewType}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Language:</span>
          <span className="text-[var(--nomu-text)]">
            {language === 'auto' ? 'Auto-detect' : language}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Min Severity:</span>
          <span className={severityColors[severity] || 'text-[var(--nomu-text)]'}>
            {severity.charAt(0).toUpperCase() + severity.slice(1)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Status:</span>
          <span className={status.color}>{status.dot} {status.text}</span>
        </div>
      </div>
    </BaseNode>
  )
})

CodeReviewNode.displayName = 'CodeReviewNode'
