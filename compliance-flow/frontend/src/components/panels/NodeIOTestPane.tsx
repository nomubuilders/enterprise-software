import { useState, useCallback } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'
import { Button } from '../common'
import { api } from '../../services/api'

interface NodeIOTestPaneProps {
  nodeType: string
  nodeConfig: Record<string, unknown>
}

interface TestResult {
  success: boolean
  output?: unknown
  error?: string
  duration_ms?: number
}

export function NodeIOTestPane({ nodeType, nodeConfig }: NodeIOTestPaneProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [inputText, setInputText] = useState('')
  const [isJsonMode, setIsJsonMode] = useState(true)
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<TestResult | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)

  const handleRun = useCallback(async () => {
    setParseError(null)
    setResult(null)

    let input: unknown
    if (isJsonMode) {
      try {
        input = inputText.trim() ? JSON.parse(inputText) : {}
      } catch {
        setParseError('Invalid JSON input')
        return
      }
    } else {
      input = inputText
    }

    setIsRunning(true)
    try {
      const res = await api.testNode(nodeType, { config: nodeConfig, input })
      setResult(res)
    } catch (err) {
      setResult({
        success: false,
        error: err instanceof Error ? err.message : 'Request failed',
      })
    } finally {
      setIsRunning(false)
    }
  }, [inputText, isJsonMode, nodeType, nodeConfig])

  return (
    <div className="mt-4 border-t border-[var(--nomu-border)] pt-4">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-[var(--nomu-text-muted)] transition hover:bg-[var(--nomu-surface-hover)] hover:text-[var(--nomu-text)]"
      >
        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <Play size={14} className="text-[var(--nomu-primary)]" />
        Test Node I/O
      </button>

      {isOpen && (
        <div className="mt-3 space-y-3 px-1">
          {/* Format Toggle */}
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-[var(--nomu-text-muted)]">
              Sample Input
            </label>
            <button
              onClick={() => setIsJsonMode(!isJsonMode)}
              className="flex items-center gap-1 text-xs text-[var(--nomu-text-muted)] transition hover:text-[var(--nomu-text)]"
            >
              {isJsonMode ? (
                <ToggleRight size={14} className="text-[var(--nomu-primary)]" />
              ) : (
                <ToggleLeft size={14} />
              )}
              {isJsonMode ? 'JSON' : 'Text'}
            </button>
          </div>

          {/* Input Area */}
          <textarea
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value)
              setParseError(null)
            }}
            placeholder={
              isJsonMode
                ? '{\n  "text": "Sample input data..."\n}'
                : 'Enter plain text input...'
            }
            className="w-full rounded-lg border border-[var(--nomu-border)] bg-[var(--nomu-surface)] px-3 py-2 font-mono text-xs text-[var(--nomu-text)] placeholder-[var(--nomu-text-muted)] focus:border-[var(--nomu-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--nomu-primary)]"
            rows={4}
          />

          {/* Parse Error */}
          {parseError && (
            <p className="text-xs text-red-400">{parseError}</p>
          )}

          {/* Run Button */}
          <Button
            variant="primary"
            size="sm"
            onClick={handleRun}
            disabled={isRunning}
            isLoading={isRunning}
            leftIcon={!isRunning ? <Play size={12} /> : undefined}
            className="w-full"
          >
            {isRunning ? 'Running...' : 'Run Test'}
          </Button>

          {/* Result Display */}
          {result && (
            <div
              className={`rounded-lg border p-3 ${
                result.success
                  ? 'border-green-700/50 bg-green-900/20'
                  : 'border-red-700/50 bg-red-900/20'
              }`}
            >
              {/* Status + Duration */}
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {result.success ? (
                    <CheckCircle2 size={14} className="text-green-400" />
                  ) : (
                    <XCircle size={14} className="text-red-400" />
                  )}
                  <span
                    className={`text-xs font-medium ${
                      result.success ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {result.success ? 'Success' : 'Failed'}
                  </span>
                </div>
                {result.duration_ms != null && (
                  <div className="flex items-center gap-1 text-xs text-[var(--nomu-text-muted)]">
                    <Clock size={12} />
                    {result.duration_ms}ms
                  </div>
                )}
              </div>

              {/* Output or Error */}
              {result.success && result.output != null ? (
                <pre className="max-h-48 overflow-auto rounded bg-[var(--nomu-bg)] p-2 font-mono text-[10px] text-[var(--nomu-text)]">
                  {typeof result.output === 'string'
                    ? result.output
                    : JSON.stringify(result.output, null, 2)}
                </pre>
              ) : result.error ? (
                <p className="text-xs text-red-300">{result.error}</p>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
