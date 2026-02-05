import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { Shield } from 'lucide-react'
import { BaseNode } from './BaseNode'

export const PIIFilterNode = memo((props: NodeProps) => {
  const nodeData = props.data as { label: string; config?: Record<string, unknown> }
  const mode = (nodeData.config?.mode as string) || 'redact'

  const modeDescriptions: Record<string, string> = {
    redact: 'Remove PII completely',
    mask: 'Replace with ***',
    hash: 'One-way hash',
    pseudonymize: 'Reversible tokens',
  }

  return (
    <BaseNode {...props} icon={<Shield size={16} />} color="bg-[#36312E] border-l-4 border-l-[#FF6C1D]">
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-muted)]">Mode:</span>
          <span className="capitalize text-[#FF6C1D]">{mode}</span>
        </div>
        <div className="mt-1 text-[10px] text-[var(--nomu-text-muted)]">
          {modeDescriptions[mode]}
        </div>
        <div className="mt-2 rounded bg-[#FF6C1D]/10 px-2 py-1 text-[10px] text-[#FF6C1D]">
          ✓ GDPR Article 17 Compliant
        </div>
      </div>
    </BaseNode>
  )
})

PIIFilterNode.displayName = 'PIIFilterNode'
