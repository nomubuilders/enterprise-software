import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { FileSpreadsheet } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { getNodeColorClass } from '../../config/nodeColors'

export const SpreadsheetNode = memo((props: NodeProps) => {
  const nodeData = props.data as { label: string; config?: Record<string, unknown> }
  const format = (nodeData.config?.format as string) ?? 'csv'
  const operation = (nodeData.config?.operation as string) ?? 'import'
  const rowCount = nodeData.config?.rowCount as number | undefined
  const hasConfig = !!(nodeData.config?.filePath || nodeData.config?.sheetName)

  const formatLabels: Record<string, string> = {
    csv: 'CSV',
    xlsx: 'XLSX',
    google_sheets: 'Google Sheets',
  }

  const operationLabels: Record<string, string> = {
    import: 'Import',
    export: 'Export',
    transform: 'Transform',
  }

  const getStatus = () => {
    if (hasConfig) return { text: 'Configured', color: 'text-[var(--nomu-accent)]', dot: '\u25CF' }
    return { text: 'Not configured', color: 'text-[var(--nomu-text-secondary)]', dot: '\u25CB' }
  }

  const status = getStatus()

  return (
    <BaseNode {...props} icon={<FileSpreadsheet size={16} />} color={getNodeColorClass('spreadsheetNode')}>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Format:</span>
          <span className="text-[var(--nomu-primary)]">
            {formatLabels[format] || format.toUpperCase()}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Operation:</span>
          <span className="text-[var(--nomu-primary)]">
            {operationLabels[operation] || operation}
          </span>
        </div>
        {rowCount !== undefined && (
          <div className="flex justify-between">
            <span className="text-[var(--nomu-text-secondary)]">Rows:</span>
            <span className="text-[var(--nomu-primary)]">{rowCount.toLocaleString()}</span>
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

SpreadsheetNode.displayName = 'SpreadsheetNode'
