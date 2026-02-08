import { useState } from 'react'
import type { Node } from '@xyflow/react'
import { Shield, AlertTriangle, CheckCircle2, Plus, Minus, Save } from 'lucide-react'
import { Button, Input } from '../../common'
import { DockerTerminal } from '../DockerTerminal'
import { useDockerStore } from '../../../store/dockerStore'

export function DockerContainerNodeConfig({
  node,
  onUpdate,
}: {
  node: Node
  onUpdate: (data: Record<string, unknown>) => void
}) {
  const { dockerAvailable, dockerHealth } = useDockerStore()
  const config = (node.data as Record<string, unknown>).config as Record<string, unknown> || {}

  const [image, setImage] = useState((config.image as string) ?? '')
  const [tag, setTag] = useState((config.tag as string) ?? 'latest')
  const [command, setCommand] = useState(
    Array.isArray(config.command) ? (config.command as string[]).join(' ') : (config.command as string) ?? ''
  )
  const [envVars, setEnvVars] = useState<Array<{key: string, value: string}>>(
    Object.entries((config.envVars as Record<string, string>) ?? {}).map(([key, value]) => ({ key, value }))
  )
  const [cpuLimit, setCpuLimit] = useState((config.cpuLimit as number) ?? 0.5)
  const [memoryLimit, setMemoryLimit] = useState((config.memoryLimit as number) ?? 512)
  const [timeoutSecs, setTimeoutSecs] = useState((config.timeout as number) ?? 300)
  const [networkMode, setNetworkMode] = useState<'none' | 'internal'>((config.networkMode as 'none' | 'internal') ?? 'none')
  const [showSaved, setShowSaved] = useState(false)

  const addEnvVar = () => setEnvVars([...envVars, { key: '', value: '' }])
  const removeEnvVar = (index: number) => setEnvVars(envVars.filter((_, i) => i !== index))
  const updateEnvVar = (index: number, field: 'key' | 'value', val: string) => {
    const updated = [...envVars]
    updated[index] = { ...updated[index], [field]: val }
    setEnvVars(updated)
  }

  const handleSave = () => {
    const envVarsObj: Record<string, string> = {}
    envVars.forEach(({ key, value }) => { if (key) envVarsObj[key] = value })

    onUpdate({
      config: {
        ...config,
        image,
        tag,
        command: command.split(' ').filter(Boolean),
        envVars: envVarsObj,
        cpuLimit,
        memoryLimit,
        timeout: timeoutSecs,
        networkMode,
      },
    })
    setShowSaved(true)
    setTimeout(() => setShowSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      {!dockerAvailable && (
        <div className="rounded-lg bg-amber-900/20 border border-amber-600/30 p-3">
          <div className="flex items-center gap-2 text-amber-400">
            <AlertTriangle size={16} />
            <span className="text-sm font-medium">Docker Unavailable</span>
          </div>
          <p className="mt-1 text-xs text-[var(--nomu-text-muted)]">
            {dockerHealth?.error || 'Docker daemon is not running. Please start Docker Desktop to execute containers.'}
          </p>
        </div>
      )}

      {showSaved && (
        <div className="flex items-center gap-2 text-green-400 text-sm bg-green-900/30 rounded-lg px-3 py-2">
          <CheckCircle2 size={16} />
          <span>Configuration saved!</span>
        </div>
      )}

      {/* Image Selection */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-[var(--nomu-text)]">Container Image</h3>
        <div className="space-y-3">
          <Input
            label="Image"
            value={image}
            onChange={(e) => setImage(e.target.value)}
            placeholder="alpine"
          />
          <Input
            label="Tag"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder="latest"
          />
        </div>
      </div>

      {/* Command */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-[var(--nomu-text)]">Command</h3>
        <Input
          label="Command"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="python /app/scan.py"
          helperText="Shell command to execute in the container"
        />
      </div>

      {/* Environment Variables */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-[var(--nomu-text)]">Environment Variables</h3>
          <button onClick={addEnvVar} className="text-xs text-[var(--nomu-primary)] hover:text-[var(--nomu-primary-hover)] flex items-center gap-1">
            <Plus size={12} /> Add
          </button>
        </div>
        <div className="space-y-2">
          {envVars.map((env, i) => (
            <div key={i} className="flex gap-2 items-center">
              <div className="flex-1">
                <Input
                  value={env.key}
                  onChange={(e) => updateEnvVar(i, 'key', e.target.value)}
                  placeholder="KEY"
                />
              </div>
              <div className="flex-1">
                <Input
                  value={env.value}
                  onChange={(e) => updateEnvVar(i, 'value', e.target.value)}
                  placeholder="value"
                />
              </div>
              <button onClick={() => removeEnvVar(i)} className="text-red-400 hover:text-red-300 p-1">
                <Minus size={14} />
              </button>
            </div>
          ))}
          {envVars.length === 0 && (
            <p className="text-xs text-[var(--nomu-text-muted)]">No environment variables configured</p>
          )}
        </div>
      </div>

      {/* Resource Controls */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-[var(--nomu-text)]">Resource Limits</h3>
        <div className="space-y-4">
          {/* CPU */}
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-sm text-[var(--nomu-text-muted)]">CPU Cores</label>
              <span className="text-sm font-medium text-[var(--nomu-text)]">{cpuLimit}</span>
            </div>
            <input
              type="range" min="0.25" max="4" step="0.25"
              value={cpuLimit}
              onChange={(e) => setCpuLimit(parseFloat(e.target.value))}
              className="w-full accent-[var(--nomu-primary)]"
            />
            <div className="flex justify-between text-xs text-[var(--nomu-text-muted)]">
              <span>0.25</span><span>2.0</span><span>4.0</span>
            </div>
          </div>
          {/* Memory */}
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-sm text-[var(--nomu-text-muted)]">Memory (MB)</label>
              <span className="text-sm font-medium text-[var(--nomu-text)]">{memoryLimit}MB</span>
            </div>
            <input
              type="range" min="128" max="4096" step="128"
              value={memoryLimit}
              onChange={(e) => setMemoryLimit(parseInt(e.target.value))}
              className="w-full accent-[var(--nomu-primary)]"
            />
            <div className="flex justify-between text-xs text-[var(--nomu-text-muted)]">
              <span>128MB</span><span>2GB</span><span>4GB</span>
            </div>
          </div>
          {/* Timeout */}
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-sm text-[var(--nomu-text-muted)]">Timeout (seconds)</label>
              <span className="text-sm font-medium text-[var(--nomu-text)]">{timeoutSecs}s</span>
            </div>
            <Input
              type="number" value={timeoutSecs}
              onChange={(e) => setTimeoutSecs(parseInt(e.target.value) || 300)}
              min="30" max="3600" step="30"
            />
          </div>
        </div>
      </div>

      {/* Network Mode */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-[var(--nomu-text)]">Network Mode</h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setNetworkMode('none')}
            className={`rounded-lg p-3 text-left transition ${
              networkMode === 'none'
                ? 'bg-[var(--nomu-primary)]/20 border-2 border-[var(--nomu-primary)]'
                : 'bg-[var(--nomu-surface)] border-2 border-transparent hover:border-[var(--nomu-border)]'
            }`}
          >
            <p className="font-medium text-[var(--nomu-text)]">Air-Gapped</p>
            <p className="text-xs text-[var(--nomu-text-muted)]">No network access</p>
          </button>
          <button
            onClick={() => setNetworkMode('internal')}
            className={`rounded-lg p-3 text-left transition ${
              networkMode === 'internal'
                ? 'bg-[var(--nomu-accent)]/20 border-2 border-[var(--nomu-accent)]'
                : 'bg-[var(--nomu-surface)] border-2 border-transparent hover:border-[var(--nomu-border)]'
            }`}
          >
            <p className="font-medium text-[var(--nomu-text)]">Internal Only</p>
            <p className="text-xs text-[var(--nomu-text-muted)]">Docker network only</p>
          </button>
        </div>
      </div>

      {/* Compliance Badge */}
      <div className="rounded-lg bg-green-900/20 border border-green-600/30 p-3">
        <div className="flex items-center gap-2 text-green-400">
          <Shield size={16} />
          <span className="text-sm font-medium">DORA/GDPR Compliant</span>
        </div>
        <p className="mt-1 text-xs text-[var(--nomu-text-muted)]">
          Container runs with resource limits, audit logging, and {networkMode === 'none' ? 'air-gapped isolation' : 'internal network only'}.
        </p>
      </div>

      {/* Execution Console */}
      <DockerTerminal
        containerId={(config.containerId as string) || null}
        isRunning={(config.status as string) === 'running'}
      />

      {/* Save */}
      <Button variant="primary" onClick={handleSave} leftIcon={<Save size={14} />} className="w-full">
        Save Configuration
      </Button>
    </div>
  )
}
