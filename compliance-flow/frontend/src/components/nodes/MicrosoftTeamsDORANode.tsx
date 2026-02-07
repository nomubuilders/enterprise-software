import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { ShieldAlert } from 'lucide-react'
import { BaseNode } from './BaseNode'

const MONITORING_MODE_LABELS: Record<string, string> = {
  ict_incidents: 'ICT Incidents',
  resilience_testing: 'Resilience Testing',
  third_party_risk: 'Third-Party Risk',
  full_dora: 'Full DORA',
}

export const MicrosoftTeamsDORANode = memo((props: NodeProps) => {
  const config = (props.data as { config?: Record<string, unknown> }).config
  const monitoringMode = (config?.monitoringMode as string) || 'ict_incidents'
  const alertWindow = (config?.alertWindow as number) || 240

  return (
    <BaseNode {...props} icon={<ShieldAlert size={16} />} color="bg-blue-700">
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Monitor:</span>
          <span className="text-blue-400">{MONITORING_MODE_LABELS[monitoringMode] || monitoringMode}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Alert Window:</span>
          <span className="text-[var(--nomu-text)]">{alertWindow} min</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--nomu-text-secondary)]">Framework:</span>
          <span className="text-amber-400">EU DORA</span>
        </div>
      </div>
    </BaseNode>
  )
})

MicrosoftTeamsDORANode.displayName = 'MicrosoftTeamsDORANode'
