import { useState, useEffect, useRef, memo } from 'react'
import { Trash2, Terminal as TerminalIcon } from 'lucide-react'
import { dockerApi } from '../../services/dockerApi'
import type { ContainerLogEntry } from '../../services/dockerApi'

interface DockerTerminalProps {
  containerId: string | null
  isRunning: boolean
}

export const DockerTerminal = memo(({ containerId, isRunning }: DockerTerminalProps) => {
  const [logs, setLogs] = useState<ContainerLogEntry[]>([])
  const [isExpanded, setIsExpanded] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs])

  // Subscribe to log stream
  useEffect(() => {
    if (!containerId || !isRunning) return

    const cleanup = dockerApi.streamLogs(
      containerId,
      (entry) => setLogs((prev) => [...prev, entry]),
      () => {} // onDone - noop, status handled elsewhere
    )

    return cleanup
  }, [containerId, isRunning])

  const clearLogs = () => setLogs([])

  return (
    <div className="rounded-lg border border-[var(--nomu-border)] overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 bg-[var(--nomu-surface)] cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <TerminalIcon size={14} className="text-[var(--nomu-primary)]" />
          <span className="text-sm font-medium text-[var(--nomu-text)]">Execution Console</span>
          {isRunning && (
            <span className="inline-flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          )}
        </div>
        <div className="flex items-center gap-2">
          {logs.length > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); clearLogs() }}
              className="text-[var(--nomu-text-muted)] hover:text-[var(--nomu-text)] p-1"
              title="Clear logs"
            >
              <Trash2 size={12} />
            </button>
          )}
          <span className="text-xs text-[var(--nomu-text-muted)]">
            {isExpanded ? '\u25BC' : '\u25B6'}
          </span>
        </div>
      </div>

      {/* Terminal body */}
      {isExpanded && (
        <div
          ref={scrollRef}
          className="h-48 overflow-y-auto bg-[var(--nomu-bg)] p-3 font-mono text-xs leading-5"
        >
          {logs.length === 0 ? (
            <div className="text-[var(--nomu-text-muted)] italic">
              {isRunning ? 'Waiting for output...' : 'No logs yet. Run the container to see output.'}
            </div>
          ) : (
            logs.map((entry, i) => (
              <div key={i} className={entry.stream === 'stderr' ? 'text-red-400' : 'text-green-300'}>
                <span className="text-[var(--nomu-text-muted)] select-none">[{new Date(entry.timestamp).toLocaleTimeString()}] </span>
                {entry.message}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
})

DockerTerminal.displayName = 'DockerTerminal'
