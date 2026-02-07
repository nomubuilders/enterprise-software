import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { Cloud } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { getNodeColorClass } from '../../config/nodeColors'

const PROVIDER_LABELS: Record<string, string> = {
  google_drive: 'Google Drive',
  dropbox: 'Dropbox',
  onedrive: 'OneDrive',
  mega: 'MEGA',
}

const OPERATION_LABELS: Record<string, string> = {
  list: 'List Files',
  download: 'Download',
  upload: 'Upload',
  search: 'Search',
  share: 'Share Link',
  delete: 'Delete',
}

export const CloudDocumentNode = memo((props: NodeProps) => {
  const config = (props.data as { config?: Record<string, unknown> }).config
  const provider = (config?.provider as string) || 'google_drive'
  const operation = (config?.operation as string) || 'list'

  return (
    <BaseNode {...props} icon={<Cloud size={16} />} color={getNodeColorClass('cloudDocumentNode')}>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Provider:</span>
          <span className="text-sky-400">{PROVIDER_LABELS[provider] || provider}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Operation:</span>
          <span className="text-[var(--nomu-text)]">{OPERATION_LABELS[operation] || operation}</span>
        </div>
      </div>
    </BaseNode>
  )
})

CloudDocumentNode.displayName = 'CloudDocumentNode'
