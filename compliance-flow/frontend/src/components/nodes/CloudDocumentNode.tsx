import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { Cloud } from 'lucide-react'
import { BaseNode } from './BaseNode'

export const CloudDocumentNode = memo((props: NodeProps) => {
  const nodeData = props.data as { label: string; config?: Record<string, unknown> }
  const provider = (nodeData.config?.provider as string) || 'google_drive'
  const operation = (nodeData.config?.operation as string) || 'list'

  const providerLabels: Record<string, string> = {
    google_drive: 'Google Drive',
    dropbox: 'Dropbox',
    onedrive: 'OneDrive',
    mega: 'MEGA',
  }

  const opLabels: Record<string, string> = {
    list: 'List Files',
    download: 'Download',
    upload: 'Upload',
    search: 'Search',
    share: 'Share Link',
    delete: 'Delete',
  }

  return (
    <BaseNode {...props} icon={<Cloud size={16} />} color="bg-sky-600">
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Provider:</span>
          <span className="text-sky-400">{providerLabels[provider] || provider}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Operation:</span>
          <span className="text-[var(--nomu-text)]">{opLabels[operation] || operation}</span>
        </div>
      </div>
    </BaseNode>
  )
})

CloudDocumentNode.displayName = 'CloudDocumentNode'
