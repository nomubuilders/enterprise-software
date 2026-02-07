import { useState, useEffect, useCallback } from 'react'
import { ChevronUp, ChevronDown, RotateCcw, Square, Play } from 'lucide-react'
import { getElectronBridge } from '../../services/electronBridge'
import { useElectronStore } from '../../store/electronStore'

export function ServiceDashboard() {
  const bridge = getElectronBridge()
  const { servicesHealth, allServicesHealthy, updateHealth } = useElectronStore()
  const [expanded, setExpanded] = useState(false)
  const [logs, setLogs] = useState('')
  const [logService, setLogService] = useState<string | null>(null)

  // Subscribe to health updates
  useEffect(() => {
    if (!bridge) return
    const unsub = bridge.docker.onHealthUpdate((health) => updateHealth(health))
    // Initial fetch
    bridge.docker.getHealth().then(updateHealth)
    return unsub
  }, [bridge, updateHealth])

  // Subscribe to log output
  useEffect(() => {
    if (!bridge) return
    const unsub = bridge.docker.onLogOutput((data) => {
      if (data.service === logService) {
        setLogs((prev) => (prev + data.log).slice(-10000))
      }
    })
    return unsub
  }, [bridge, logService])

  const handleViewLogs = useCallback(
    async (service: string) => {
      if (!bridge) return
      if (logService === service) {
        setLogService(null)
        setLogs('')
        return
      }
      setLogService(service)
      const logText = await bridge.docker.getServiceLogs(service)
      setLogs(logText)
    },
    [bridge, logService]
  )

  const handleRestart = useCallback(async () => {
    if (!bridge) return
    await bridge.docker.stopServices()
    await bridge.docker.startServices()
  }, [bridge])

  const handleStop = useCallback(async () => {
    if (!bridge) return
    await bridge.docker.stopServices()
    const health = await bridge.docker.getHealth()
    updateHealth(health)
  }, [bridge, updateHealth])

  const handleStart = useCallback(async () => {
    if (!bridge) return
    await bridge.docker.startServices()
  }, [bridge])

  const statusDot = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-500'
      case 'starting': return 'bg-yellow-500 animate-pulse'
      default: return 'bg-red-500'
    }
  }

  const runningCount = servicesHealth.filter((s) => s.status === 'running').length
  const totalCount = servicesHealth.length

  return (
    <div className="absolute bottom-4 right-4 z-20">
      {/* Collapsed bar */}
      <div
        className="flex cursor-pointer items-center gap-3 rounded-lg bg-[var(--nomu-surface)]/80 px-4 py-2 backdrop-blur transition hover:bg-[var(--nomu-surface)]"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={`h-2 w-2 rounded-full ${allServicesHealthy ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
        <span className="text-xs text-[var(--nomu-text-muted)]">
          {runningCount}/{totalCount} services
        </span>
        <div className="h-4 w-px bg-[var(--nomu-border)]" />
        {servicesHealth.slice(0, 5).map((s) => (
          <div key={s.name} className={`h-1.5 w-1.5 rounded-full ${statusDot(s.status)}`} title={`${s.name}: ${s.status}`} />
        ))}
        {expanded ? <ChevronDown size={14} className="text-[var(--nomu-text-muted)]" /> : <ChevronUp size={14} className="text-[var(--nomu-text-muted)]" />}
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div className="mt-2 w-80 rounded-lg bg-[var(--nomu-surface)] shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--nomu-border)] px-4 py-3">
            <span className="text-sm font-medium text-[var(--nomu-text)]">Docker Services</span>
            <div className="flex gap-1">
              <button onClick={handleStart} className="rounded p-1 text-[var(--nomu-text-muted)] hover:bg-[var(--nomu-surface-hover)]" title="Start">
                <Play size={14} />
              </button>
              <button onClick={handleStop} className="rounded p-1 text-[var(--nomu-text-muted)] hover:bg-[var(--nomu-surface-hover)]" title="Stop">
                <Square size={14} />
              </button>
              <button onClick={handleRestart} className="rounded p-1 text-[var(--nomu-text-muted)] hover:bg-[var(--nomu-surface-hover)]" title="Restart">
                <RotateCcw size={14} />
              </button>
            </div>
          </div>

          {/* Service list */}
          <div className="p-2">
            {servicesHealth.map((s) => (
              <button
                key={s.name}
                onClick={() => handleViewLogs(s.name)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition hover:bg-[var(--nomu-surface-hover)] ${
                  logService === s.name ? 'bg-[var(--nomu-surface-hover)]' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${statusDot(s.status)}`} />
                  <span className="text-sm capitalize text-[var(--nomu-text)]">{s.name}</span>
                </div>
                <span className="text-xs text-[var(--nomu-text-muted)]">:{s.port}</span>
              </button>
            ))}
          </div>

          {/* Log viewer */}
          {logService && (
            <div className="border-t border-[var(--nomu-border)] p-3">
              <div className="mb-2 text-xs font-medium text-[var(--nomu-text-muted)]">
                Logs: {logService}
              </div>
              <pre className="max-h-40 overflow-auto rounded bg-[var(--nomu-bg)] p-2 font-mono text-[10px] leading-tight text-[var(--nomu-text-muted)]">
                {logs || 'No logs available'}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
