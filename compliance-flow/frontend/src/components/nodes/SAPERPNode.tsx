import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { Building2 } from 'lucide-react'
import { BaseNode } from './BaseNode'

export const SAPERPNode = memo((props: NodeProps) => {
  const nodeData = props.data as { label: string; config?: Record<string, unknown> }
  const reportType = (nodeData.config?.reportType as string) || 'balance_sheet'
  const fiscalYear = (nodeData.config?.fiscalYear as string) || new Date().getFullYear().toString()

  const reportLabels: Record<string, string> = {
    balance_sheet: 'Balance Sheet',
    profit_loss: 'Profit & Loss',
    cost_center: 'Cost Center',
    general_ledger: 'General Ledger',
    custom_odata: 'Custom OData',
  }

  return (
    <BaseNode {...props} icon={<Building2 size={16} />} color="bg-teal-700">
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Report:</span>
          <span className="text-teal-400">{reportLabels[reportType] || reportType}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Fiscal Year:</span>
          <span className="text-[var(--nomu-text)]">{fiscalYear}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Framework:</span>
          <span className="text-amber-400">SOX / IFRS</span>
        </div>
      </div>
    </BaseNode>
  )
})

SAPERPNode.displayName = 'SAPERPNode'
