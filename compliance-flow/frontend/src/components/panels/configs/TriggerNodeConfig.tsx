import { useState } from 'react'
import type { Node } from '@xyflow/react'
import { Play, Clock, Webhook, CheckCircle2, Save } from 'lucide-react'
import { Button, Input } from '../../common'

interface TriggerNodeConfigProps {
  node: Node
  onUpdate: (data: Record<string, unknown>) => void
  onRun?: () => void
  isRunning: boolean
}

export function TriggerNodeConfig({ node, onUpdate, onRun, isRunning }: TriggerNodeConfigProps) {
  const config = (node.data as Record<string, unknown>).config as Record<string, unknown> || {}
  const triggerType = (config.triggerType as string) || 'manual'

  const [schedule, setSchedule] = useState((config.schedule as string) ?? '0 * * * *')
  const [webhookPath, setWebhookPath] = useState((config.webhookPath as string) ?? '/webhook/trigger')
  const [showSaved, setShowSaved] = useState(false)

  const handleSave = () => {
    onUpdate({
      config: {
        ...config,
        triggerType,
        schedule: triggerType === 'schedule' ? schedule : undefined,
        webhookPath: triggerType === 'webhook' ? webhookPath : undefined,
      },
    })
    setShowSaved(true)
    setTimeout(() => setShowSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Saved confirmation */}
      {showSaved && (
        <div className="flex items-center gap-2 text-green-400 text-sm bg-green-900/30 rounded-lg px-3 py-2">
          <CheckCircle2 size={16} />
          <span>Configuration saved!</span>
        </div>
      )}

      {/* Trigger Type Info */}
      <div className="rounded-lg bg-[var(--nomu-surface)] p-4">
        <div className="flex items-center gap-3 mb-3">
          {triggerType === 'manual' && <Play size={20} className="text-green-500" />}
          {triggerType === 'schedule' && <Clock size={20} className="text-green-500" />}
          {triggerType === 'webhook' && <Webhook size={20} className="text-green-500" />}
          <span className="font-medium text-[var(--nomu-text)] capitalize">{triggerType} Trigger</span>
        </div>

        {triggerType === 'manual' && (
          <p className="text-sm text-[var(--nomu-text-muted)]">
            Click the button below to manually start this workflow.
          </p>
        )}
        {triggerType === 'schedule' && (
          <p className="text-sm text-[var(--nomu-text-muted)]">
            This workflow runs automatically based on the cron schedule.
          </p>
        )}
        {triggerType === 'webhook' && (
          <p className="text-sm text-[var(--nomu-text-muted)]">
            This workflow is triggered by HTTP requests to the webhook endpoint.
          </p>
        )}
      </div>

      {/* Manual Trigger - Run Button */}
      {triggerType === 'manual' && (
        <div className="rounded-lg border-2 border-dashed border-green-600/50 bg-green-900/20 p-6 text-center">
          <Play size={32} className="mx-auto mb-3 text-green-500" />
          <p className="mb-4 text-sm text-[var(--nomu-text-muted)]">Ready to execute workflow</p>
          <Button
            variant="primary"
            onClick={onRun}
            disabled={isRunning}
            isLoading={isRunning}
            leftIcon={isRunning ? undefined : <Play size={16} />}
            className="w-full bg-green-600 hover:bg-green-500"
          >
            {isRunning ? 'Running...' : 'Run Workflow'}
          </Button>
        </div>
      )}

      {/* Schedule Config */}
      {triggerType === 'schedule' && (
        <div className="space-y-4">
          <Input
            label="Cron Schedule"
            value={schedule}
            onChange={(e) => setSchedule(e.target.value)}
            placeholder="0 * * * *"
            helperText="Standard cron format: minute hour day month weekday"
          />
          <div className="rounded-lg bg-[var(--nomu-surface)] p-3">
            <p className="text-xs text-[var(--nomu-text-muted)] mb-1">Common schedules:</p>
            <div className="flex flex-wrap gap-2">
              {['0 * * * *', '0 0 * * *', '0 0 * * 0', '*/5 * * * *'].map((cron) => (
                <button
                  key={cron}
                  onClick={() => setSchedule(cron)}
                  className="rounded bg-[var(--nomu-surface-hover)] px-2 py-1 text-xs text-[var(--nomu-text-muted)] hover:bg-[var(--nomu-border)]"
                >
                  {cron}
                </button>
              ))}
            </div>
          </div>
          <Button variant="secondary" onClick={handleSave} leftIcon={<Save size={14} />}>
            Save Schedule
          </Button>
        </div>
      )}

      {/* Webhook Config */}
      {triggerType === 'webhook' && (
        <div className="space-y-4">
          <Input
            label="Webhook Path"
            value={webhookPath}
            onChange={(e) => setWebhookPath(e.target.value)}
            placeholder="/webhook/my-trigger"
          />
          <div className="rounded-lg bg-[var(--nomu-surface)] p-3">
            <p className="text-xs text-[var(--nomu-text-muted)] mb-1">Full URL:</p>
            <code className="text-xs text-[var(--nomu-primary)] break-all">
              http://localhost:8000{webhookPath}
            </code>
          </div>
          <Button variant="secondary" onClick={handleSave} leftIcon={<Save size={14} />}>
            Save Webhook
          </Button>
        </div>
      )}
    </div>
  )
}
