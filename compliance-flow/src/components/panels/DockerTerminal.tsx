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
    <div className="rounded-lg border border-slate-700 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 bg-slate-800 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <TerminalIcon size={14} className="text-purple-400" />
          <span className="text-sm font-medium text-white">Execution Console</span>
          {isRunning && (
            <span className="inline-flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          )}
        </div>
        <div className="flex items-center gap-2">
          {logs.length > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); clearLogs() }}
              className="text-slate-400 hover:text-white p-1"
              title="Clear logs"
            >
              <Trash2 size={12} />
            </button>
          )}
          <span className="text-xs text-slate-400">
            {isExpanded ? '\u25BC' : '\u25B6'}
          </span>
        </div>
      </div>

      {/* Terminal body */}
      {isExpanded && (
        <div
          ref={scrollRef}
          className="h-48 overflow-y-auto bg-black p-3 font-mono text-xs leading-5"
        >
          {logs.length === 0 ? (
            <div className="text-gray-500 italic">
              {isRunning ? 'Waiting for output...' : 'No logs yet. Run the container to see output.'}
            </div>
          ) : (
            logs.map((entry, i) => (
              <div key={i} className={entry.stream === 'stderr' ? 'text-red-400' : 'text-green-300'}>
                <span className="text-gray-600 select-none">[{new Date(entry.timestamp).toLocaleTimeString()}] </span>
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
