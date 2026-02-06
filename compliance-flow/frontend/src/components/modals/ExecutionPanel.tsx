import { useEffect, useRef } from 'react'
import {
  Square,
  CheckCircle2,
  AlertCircle,
  Clock,
  Terminal,
  Container,
  X,
  Minimize2,
  Maximize2,
} from 'lucide-react'
import { Button } from '../common'
import { useWorkflowStore } from '../../store/workflowStore'
import { useState } from 'react'

interface ExecutionPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function ExecutionPanel({ isOpen, onClose }: ExecutionPanelProps) {
  const { currentExecution, isRunning, stopExecution } = useWorkflowStore()
  const [isMinimized, setIsMinimized] = useState(false)
  const logsEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [currentExecution?.logs])

  if (!isOpen) return null

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <AlertCircle size={14} className="text-red-500" />
      case 'warn':
        return <Clock size={14} className="text-yellow-500" />
      default:
        return <CheckCircle2 size={14} className="text-green-500" />
    }
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  return (
    <div
      className={`
        fixed bottom-0 right-4 z-40 w-[480px] rounded-t-xl bg-[var(--nomu-surface)] shadow-2xl border border-[var(--nomu-border)] border-b-0
        transition-all duration-300
        ${isMinimized ? 'h-12' : 'h-80'}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--nomu-border)] px-4 py-3">
        <div className="flex items-center gap-3">
          <Terminal size={18} className="text-[var(--nomu-primary)]" />
          <span className="font-medium text-[var(--nomu-text)]">Execution Log</span>
          {isRunning && (
            <span className="flex items-center gap-1.5 rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-400">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
              Running
            </span>
          )}
          {currentExecution?.status === 'completed' && (
            <span className="flex items-center gap-1.5 rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-400">
              <CheckCircle2 size={12} />
              Completed
            </span>
          )}
          {currentExecution?.status === 'error' && (
            <span className="flex items-center gap-1.5 rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-400">
              <AlertCircle size={12} />
              Error
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isRunning && (
            <Button
              variant="danger"
              size="sm"
              onClick={stopExecution}
              leftIcon={<Square size={14} />}
            >
              Stop
            </Button>
          )}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="rounded p-1.5 text-[var(--nomu-text-muted)] hover:bg-[var(--nomu-surface-hover)] hover:text-[var(--nomu-text)] transition"
          >
            {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>
          <button
            onClick={onClose}
            className="rounded p-1.5 text-[var(--nomu-text-muted)] hover:bg-[var(--nomu-surface-hover)] hover:text-[var(--nomu-text)] transition"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Logs */}
      {!isMinimized && (
        <div className="h-[calc(100%-48px)] overflow-y-auto p-4 font-mono text-sm">
          {!currentExecution ? (
            <div className="flex h-full items-center justify-center text-[var(--nomu-text-muted)]">
              <p>Run a workflow to see execution logs</p>
            </div>
          ) : currentExecution.logs.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex items-center gap-2 text-[var(--nomu-text-muted)]">
                <Clock size={16} className="animate-spin" />
                <span>Starting execution...</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {currentExecution.logs.map((log, index) => {
                const containerData = (log as { data?: { containerExecution?: { image?: string; exitCode?: number; duration?: string } } }).data?.containerExecution

                return (
                  <div
                    key={index}
                    className="flex items-start gap-3 rounded-lg bg-[var(--nomu-bg)]/50 p-2"
                  >
                    <div className="mt-0.5">
                      {containerData
                        ? <Container size={14} className="text-[var(--nomu-primary)]" />
                        : getLogIcon(log.level)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[var(--nomu-text)]">{log.nodeName}</span>
                        <span className="text-xs text-[var(--nomu-text-muted)]">{formatTime(log.timestamp)}</span>
                        {containerData && (
                          <span className="rounded bg-[var(--nomu-primary)]/20 px-1.5 py-0.5 text-xs text-[var(--nomu-primary)]">
                            {containerData.image}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[var(--nomu-text-muted)]">{log.message}</p>
                      {containerData && containerData.exitCode !== undefined && (
                        <div className="mt-1 flex items-center gap-3 text-xs text-[var(--nomu-text-muted)]">
                          <span className={containerData.exitCode === 0 ? 'text-green-400' : 'text-red-400'}>
                            Exit: {containerData.exitCode}
                          </span>
                          {containerData.duration && (
                            <span>Duration: {containerData.duration}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
