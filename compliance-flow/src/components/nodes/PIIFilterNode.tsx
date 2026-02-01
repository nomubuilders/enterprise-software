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
    <BaseNode {...props} icon={<Shield size={16} />} color="bg-amber-600">
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-slate-400">Mode:</span>
          <span className="capitalize text-amber-400">{mode}</span>
        </div>
        <div className="mt-1 text-[10px] text-slate-500">
          {modeDescriptions[mode]}
        </div>
        <div className="mt-2 rounded bg-amber-900/30 px-2 py-1 text-[10px] text-amber-300">
          ✓ GDPR Article 17 Compliant
        </div>
      </div>
    </BaseNode>
  )
})

PIIFilterNode.displayName = 'PIIFilterNode'
