import { useState, useEffect, useRef } from 'react'
import type { Node } from '@xyflow/react'
import {
  X,
  Play,
  Database,
  Bot,
  Shield,
  MessageSquare,
  Save,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Webhook,
  RefreshCw,
  GripVertical,
  Container,
  Plus,
  Minus,
  AlertTriangle,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Button, Input, Select } from '../common'
import { DockerTerminal } from './DockerTerminal'
import { useFlowStore } from '../../store/flowStore'
import { useWorkflowStore } from '../../store/workflowStore'
import { useDockerStore } from '../../store/dockerStore'
import { api } from '../../services/api'

interface NodeConfigPanelProps {
  node: Node | null
  onClose: () => void
  onRunWorkflow?: () => void
}

export function NodeConfigPanel({ node, onClose, onRunWorkflow }: NodeConfigPanelProps) {
  const { updateNodeData, deleteNode } = useFlowStore()
  const { isRunning } = useWorkflowStore()

  // Resizable panel state
  const [panelWidth, setPanelWidth] = useState(400)
  const isResizing = useRef(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // Handle resize drag
  const handleMouseDown = (e: React.MouseEvent) => {
    isResizing.current = true
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    e.preventDefault()
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing.current) return
    const newWidth = window.innerWidth - e.clientX
    setPanelWidth(Math.min(Math.max(320, newWidth), 800)) // Min 320, Max 800
  }

  const handleMouseUp = () => {
    isResizing.current = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  if (!node) return null

  const nodeType = node.type || ''
  const nodeData = node.data as Record<string, unknown>

  const handleDelete = () => {
    if (confirm('Delete this node?')) {
      deleteNode(node.id)
      onClose()
    }
  }

  return (
    <div
      ref={panelRef}
      style={{ width: panelWidth }}
      className="fixed right-0 top-0 z-40 flex h-full flex-col border-l border-[var(--nomu-border)] bg-[var(--nomu-bg)] shadow-2xl"
    >
      {/* Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        className="absolute left-0 top-0 h-full w-1 cursor-ew-resize bg-transparent hover:bg-[var(--nomu-primary)]/50 transition-colors group"
      >
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical size={16} className="text-[var(--nomu-primary)]" />
        </div>
      </div>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--nomu-border)] px-4 py-3">
        <div className="flex items-center gap-3">
          <NodeIcon type={nodeType} />
          <div>
            <h2 className="font-semibold text-[var(--nomu-text)]">{nodeData.label as string}</h2>
            <p className="text-xs text-[var(--nomu-text-muted)]">Configure node settings</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-[var(--nomu-text-muted)] transition hover:bg-[var(--nomu-surface-hover)] hover:text-[var(--nomu-text)]"
        >
          <X size={20} />
        </button>
      </div>

      {/* Content - Based on node type */}
      <div className={`flex-1 overflow-y-auto ${nodeType === 'outputNode' ? '' : 'p-4'}`}>
        {nodeType === 'triggerNode' && (
          <TriggerNodeConfig
            node={node}
            onUpdate={(data) => updateNodeData(node.id, data)}
            onRun={onRunWorkflow}
            isRunning={isRunning}
          />
        )}
        {nodeType === 'databaseNode' && (
          <DatabaseNodeConfig
            node={node}
            onUpdate={(data) => updateNodeData(node.id, data)}
          />
        )}
        {nodeType === 'llmNode' && (
          <LLMNodeConfig
            node={node}
            onUpdate={(data) => updateNodeData(node.id, data)}
          />
        )}
        {nodeType === 'piiFilterNode' && (
          <PIIFilterNodeConfig
            node={node}
            onUpdate={(data) => updateNodeData(node.id, data)}
          />
        )}
        {nodeType === 'outputNode' && (
          <OutputNodeConfig
            node={node}
            onUpdate={(data) => updateNodeData(node.id, data)}
          />
        )}
        {nodeType === 'dockerContainerNode' && (
          <DockerContainerNodeConfig
            node={node}
            onUpdate={(data) => updateNodeData(node.id, data)}
          />
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-[var(--nomu-border)] px-4 py-3">
        <Button
          variant="danger"
          size="sm"
          onClick={handleDelete}
          leftIcon={<Trash2 size={14} />}
        >
          Delete
        </Button>
        <Button variant="secondary" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  )
}

// Node type icon component
function NodeIcon({ type }: { type: string }) {
  const iconClass = "h-8 w-8 rounded-lg p-1.5"

  switch (type) {
    case 'triggerNode':
      return <div className={`${iconClass} bg-green-600`}><Play size={20} className="text-white" /></div>
    case 'databaseNode':
      return <div className={`${iconClass} bg-blue-600`}><Database size={20} className="text-white" /></div>
    case 'llmNode':
      return <div className={`${iconClass} bg-[var(--nomu-primary)]`}><Bot size={20} className="text-white" /></div>
    case 'piiFilterNode':
      return <div className={`${iconClass} bg-amber-600`}><Shield size={20} className="text-white" /></div>
    case 'outputNode':
      return <div className={`${iconClass} bg-[var(--nomu-accent)]`}><MessageSquare size={20} className="text-white" /></div>
    case 'dockerContainerNode':
      return <div className={`${iconClass} bg-[#36312E]`}><Container size={20} className="text-white" /></div>
    default:
      return null
  }
}

// ============================================
// TRIGGER NODE CONFIG
// ============================================
function TriggerNodeConfig({
  node,
  onUpdate,
  onRun,
  isRunning,
}: {
  node: Node
  onUpdate: (data: Record<string, unknown>) => void
  onRun?: () => void
  isRunning: boolean
}) {
  const config = (node.data as Record<string, unknown>).config as Record<string, unknown> || {}
  const triggerType = (config.triggerType as string) || 'manual'

  const [schedule, setSchedule] = useState((config.schedule as string) || '0 * * * *')
  const [webhookPath, setWebhookPath] = useState((config.webhookPath as string) || '/webhook/trigger')
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

// ============================================
// DATABASE NODE CONFIG (Integrated Connection)
// ============================================
function DatabaseNodeConfig({
  node,
  onUpdate,
}: {
  node: Node
  onUpdate: (data: Record<string, unknown>) => void
}) {
  const config = (node.data as Record<string, unknown>).config as Record<string, unknown> || {}
  const dbType = (config.dbType as string) || 'postgresql'

  const [connection, setConnection] = useState({
    host: (config.host as string) || 'localhost',
    port: (config.port as number) || (dbType === 'postgresql' ? 5432 : dbType === 'mysql' ? 3306 : 27017),
    database: (config.database as string) || '',
    username: (config.username as string) || '',
    password: (config.password as string) || '',
    ssl: (config.ssl as boolean) || false,
  })

  const [query, setQuery] = useState((config.query as string) || 'SELECT * FROM users LIMIT 10')
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; version?: string } | null>(null)
  const [tables, setTables] = useState<string[]>([])
  const [showSaved, setShowSaved] = useState(false)

  const handleTestConnection = async () => {
    setIsTesting(true)
    setTestResult(null)

    try {
      const result = await api.testDatabaseConnection({
        type: dbType as 'postgresql' | 'mysql' | 'mongodb',
        ...connection,
      })

      setTestResult({
        success: result.success,
        message: result.message,
        version: result.version,
      })

      // If connected, fetch tables
      if (result.success) {
        try {
          const tablesResult = await api.listTables({
            type: dbType as 'postgresql' | 'mysql' | 'mongodb',
            ...connection,
          })
          if (tablesResult.success) {
            setTables(tablesResult.tables.map((t) => t.name))
          }
        } catch {
          // Ignore table fetch errors
        }
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      })
    }

    setIsTesting(false)
  }

  const handleSave = () => {
    onUpdate({
      config: {
        ...config,
        dbType,
        ...connection,
        query,
        isConnected: testResult?.success || false,
      },
    })
    // Show saved confirmation
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

      {/* Connection Settings */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-[var(--nomu-text)]">Connection</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <Input
                label="Host"
                value={connection.host}
                onChange={(e) => setConnection({ ...connection, host: e.target.value })}
                placeholder="localhost"
              />
            </div>
            <Input
              label="Port"
              type="number"
              value={connection.port}
              onChange={(e) => setConnection({ ...connection, port: parseInt(e.target.value) || 0 })}
            />
          </div>
          <Input
            label="Database"
            value={connection.database}
            onChange={(e) => setConnection({ ...connection, database: e.target.value })}
            placeholder="my_database"
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Username"
              value={connection.username}
              onChange={(e) => setConnection({ ...connection, username: e.target.value })}
              placeholder="user"
            />
            <Input
              label="Password"
              type="password"
              value={connection.password}
              onChange={(e) => setConnection({ ...connection, password: e.target.value })}
              placeholder="••••••••"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={connection.ssl}
              onChange={(e) => setConnection({ ...connection, ssl: e.target.checked })}
              className="h-4 w-4 rounded border-[var(--nomu-border)] bg-[var(--nomu-bg)] text-[var(--nomu-primary)]"
            />
            <span className="text-sm text-[var(--nomu-text-muted)]">Use SSL/TLS</span>
          </label>
        </div>
      </div>

      {/* Test Connection */}
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleTestConnection}
          disabled={isTesting || !connection.host || !connection.database}
          isLoading={isTesting}
          leftIcon={<RefreshCw size={14} />}
        >
          Test Connection
        </Button>
        {testResult && (
          <div className={`flex items-center gap-1 text-sm ${testResult.success ? 'text-green-400' : 'text-red-400'}`}>
            {testResult.success ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
            <span>{testResult.success ? 'Connected' : 'Failed'}</span>
            {testResult.version && <span className="text-xs text-[var(--nomu-text-muted)]">({testResult.version})</span>}
          </div>
        )}
      </div>

      {/* Query */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-[var(--nomu-text)]">Query</h3>
        {tables.length > 0 && (
          <div className="mb-2">
            <p className="text-xs text-[var(--nomu-text-muted)] mb-1">Available tables:</p>
            <div className="flex flex-wrap gap-1">
              {tables.slice(0, 8).map((table) => (
                <span key={table} className="rounded bg-[var(--nomu-surface)] px-2 py-0.5 text-xs text-[var(--nomu-text-muted)]">
                  {table}
                </span>
              ))}
              {tables.length > 8 && (
                <span className="text-xs text-[var(--nomu-text-muted)]">+{tables.length - 8} more</span>
              )}
            </div>
          </div>
        )}
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-lg border border-[var(--nomu-border)] bg-[var(--nomu-surface)] px-3 py-2 font-mono text-sm text-[var(--nomu-text)] placeholder-[var(--nomu-text-muted)]"
          rows={4}
          placeholder="SELECT * FROM users LIMIT 10"
        />
      </div>

      {/* Save */}
      <Button variant="primary" onClick={handleSave} leftIcon={<Save size={14} />} className="w-full">
        Save Configuration
      </Button>
    </div>
  )
}

// ============================================
// LLM NODE CONFIG
// ============================================
function LLMNodeConfig({
  node,
  onUpdate,
}: {
  node: Node
  onUpdate: (data: Record<string, unknown>) => void
}) {
  const config = (node.data as Record<string, unknown>).config as Record<string, unknown> || {}

  const [model, setModel] = useState((config.model as string) || 'llama3.2')
  const [temperature, setTemperature] = useState((config.temperature as number) || 0.7)
  const [maxTokens, setMaxTokens] = useState((config.maxTokens as number) || 2048)
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showSaved, setShowSaved] = useState(false)

  useEffect(() => {
    loadModels()
  }, [])

  const loadModels = async () => {
    setIsLoading(true)
    try {
      const result = await api.listModels()
      setAvailableModels(result.models.map((m) => m.name))
    } catch {
      // Use defaults if API fails
      setAvailableModels(['llama3.2', 'mistral', 'codellama'])
    }
    setIsLoading(false)
  }

  const handleSave = () => {
    onUpdate({
      config: {
        ...config,
        model,
        temperature,
        maxTokens,
      },
    })
    // Update label to show model name
    onUpdate({
      label: `AI Agent (${model})`,
    })
    setShowSaved(true)
    setTimeout(() => setShowSaved(false), 2000)
  }

  // Get temperature description
  const getTempDescription = () => {
    if (temperature < 0.3) return 'Factual & deterministic responses'
    if (temperature < 0.7) return 'Balanced creativity & accuracy'
    if (temperature < 1.2) return 'Creative & varied responses'
    return 'Highly creative & unpredictable'
  }

  const getTempColor = () => {
    if (temperature < 0.3) return 'text-blue-400'
    if (temperature < 0.7) return 'text-green-400'
    if (temperature < 1.2) return 'text-orange-400'
    return 'text-red-400'
  }

  return (
    <div className="space-y-6">
      {/* Saved confirmation */}
      {showSaved && (
        <div className="flex items-center gap-2 text-green-400 text-sm bg-green-900/30 rounded-lg px-3 py-2">
          <CheckCircle2 size={16} />
          <span>AI Agent configured!</span>
        </div>
      )}

      {/* Info Box */}
      <div className="rounded-lg bg-[var(--nomu-primary)]/10 border border-[var(--nomu-primary)]/30 p-3">
        <p className="text-xs text-[var(--nomu-primary)]">
          <Bot size={12} className="inline mr-1" />
          Configure your AI agent's behavior. The agent will process data from upstream nodes.
        </p>
      </div>

      {/* Model Selection */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-[var(--nomu-text-muted)]">AI Model</label>
          <button
            onClick={loadModels}
            disabled={isLoading}
            className="text-xs text-[var(--nomu-primary)] hover:text-[var(--nomu-primary-hover)] disabled:opacity-50"
          >
            {isLoading ? <Loader2 size={12} className="animate-spin" /> : '🔄 Refresh'}
          </button>
        </div>
        <Select
          options={availableModels.map((m) => ({ value: m, label: m }))}
          value={model}
          onChange={(e) => setModel(e.target.value)}
        />
        {availableModels.length === 0 && !isLoading && (
          <p className="mt-1 text-xs text-amber-400">⚠️ No models found. Make sure Ollama is running.</p>
        )}
        {availableModels.length > 0 && (
          <p className="mt-1 text-xs text-[var(--nomu-text-muted)]">
            Running locally via Ollama • 100% private
          </p>
        )}
      </div>

      {/* Temperature */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-[var(--nomu-text-muted)]">Temperature</label>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${getTempColor()}`}>{temperature}</span>
          </div>
        </div>
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={temperature}
          onChange={(e) => setTemperature(parseFloat(e.target.value))}
          className="w-full accent-[var(--nomu-primary)]"
        />
        <div className="flex justify-between text-xs text-[var(--nomu-text-muted)] mt-1">
          <span>0.0 Precise</span>
          <span>1.0 Balanced</span>
          <span>2.0 Creative</span>
        </div>
        <p className={`mt-2 text-xs ${getTempColor()}`}>
          {getTempDescription()}
        </p>
      </div>

      {/* Max Tokens */}
      <div>
        <label className="mb-2 block text-sm font-medium text-[var(--nomu-text-muted)]">Max Response Length</label>
        <Input
          type="number"
          value={maxTokens}
          onChange={(e) => setMaxTokens(parseInt(e.target.value) || 2048)}
          placeholder="2048"
          min="128"
          max="8192"
          step="128"
        />
        <p className="mt-1 text-xs text-[var(--nomu-text-muted)]">
          Tokens: ~{Math.floor(maxTokens / 4)} words • Higher = longer responses
        </p>
      </div>

      {/* Performance Tips */}
      <div className="rounded-lg bg-[var(--nomu-surface)] p-3 space-y-2">
        <p className="text-xs font-medium text-[var(--nomu-text-muted)]">💡 Performance Tips</p>
        <ul className="text-xs text-[var(--nomu-text-muted)] space-y-1 list-disc list-inside">
          <li><strong>Lower temperature</strong> (0.1-0.3) for factual tasks</li>
          <li><strong>Higher temperature</strong> (0.8-1.2) for creative writing</li>
          <li><strong>Fewer tokens</strong> = faster responses</li>
        </ul>
      </div>

      {/* Save */}
      <Button variant="primary" onClick={handleSave} leftIcon={<Save size={14} />} className="w-full">
        Save Configuration
      </Button>
    </div>
  )
}

// ============================================
// PII FILTER NODE CONFIG
// ============================================
function PIIFilterNodeConfig({
  node,
  onUpdate,
}: {
  node: Node
  onUpdate: (data: Record<string, unknown>) => void
}) {
  const config = (node.data as Record<string, unknown>).config as Record<string, unknown> || {}

  const [mode, setMode] = useState((config.mode as string) || 'redact')
  const [entities, setEntities] = useState<string[]>(
    (config.entities as string[]) || ['EMAIL', 'PHONE', 'SSN', 'CREDIT_CARD', 'NAME']
  )
  const [showSaved, setShowSaved] = useState(false)

  const allEntities = ['EMAIL', 'PHONE', 'SSN', 'CREDIT_CARD', 'NAME', 'ADDRESS', 'IP_ADDRESS', 'DATE_OF_BIRTH']

  const toggleEntity = (entity: string) => {
    setEntities((prev) =>
      prev.includes(entity) ? prev.filter((e) => e !== entity) : [...prev, entity]
    )
  }

  const handleSave = () => {
    onUpdate({
      config: {
        ...config,
        mode,
        entities,
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

      {/* Mode Selection */}
      <div>
        <label className="mb-2 block text-sm font-medium text-[var(--nomu-text-muted)]">Filter Mode</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setMode('redact')}
            className={`rounded-lg p-3 text-left transition ${
              mode === 'redact'
                ? 'bg-amber-600/20 border-2 border-amber-500'
                : 'bg-[var(--nomu-surface)] border-2 border-transparent hover:border-[var(--nomu-border)]'
            }`}
          >
            <p className="font-medium text-[var(--nomu-text)]">Redact</p>
            <p className="text-xs text-[var(--nomu-text-muted)]">Remove PII completely</p>
          </button>
          <button
            onClick={() => setMode('mask')}
            className={`rounded-lg p-3 text-left transition ${
              mode === 'mask'
                ? 'bg-amber-600/20 border-2 border-amber-500'
                : 'bg-[var(--nomu-surface)] border-2 border-transparent hover:border-[var(--nomu-border)]'
            }`}
          >
            <p className="font-medium text-[var(--nomu-text)]">Mask</p>
            <p className="text-xs text-[var(--nomu-text-muted)]">Replace with asterisks</p>
          </button>
        </div>
      </div>

      {/* Entity Types */}
      <div>
        <label className="mb-2 block text-sm font-medium text-[var(--nomu-text-muted)]">Detect Entities</label>
        <div className="flex flex-wrap gap-2">
          {allEntities.map((entity) => (
            <button
              key={entity}
              onClick={() => toggleEntity(entity)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                entities.includes(entity)
                  ? 'bg-amber-600 text-white'
                  : 'bg-[var(--nomu-surface)] text-[var(--nomu-text-muted)] hover:bg-[var(--nomu-surface-hover)]'
              }`}
            >
              {entity.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-lg bg-[var(--nomu-surface)] p-3">
        <p className="text-xs text-[var(--nomu-text-muted)] mb-2">Example:</p>
        <p className="text-sm text-[var(--nomu-text-muted)]">
          Input: <span className="text-red-400">john@email.com</span> called{' '}
          <span className="text-red-400">555-1234</span>
        </p>
        <p className="text-sm text-[var(--nomu-text-muted)] mt-1">
          Output:{' '}
          {mode === 'redact' ? (
            <>
              <span className="text-green-400">[EMAIL]</span> called{' '}
              <span className="text-green-400">[PHONE]</span>
            </>
          ) : (
            <>
              <span className="text-green-400">****@*****.com</span> called{' '}
              <span className="text-green-400">***-****</span>
            </>
          )}
        </p>
      </div>

      {/* GDPR Badge */}
      <div className="rounded-lg bg-green-900/20 border border-green-600/30 p-3">
        <div className="flex items-center gap-2 text-green-400">
          <Shield size={16} />
          <span className="text-sm font-medium">GDPR Article 17 Compliant</span>
        </div>
        <p className="mt-1 text-xs text-[var(--nomu-text-muted)]">
          Right to erasure - PII is processed locally and never stored.
        </p>
      </div>

      {/* Save */}
      <Button variant="primary" onClick={handleSave} leftIcon={<Save size={14} />} className="w-full">
        Save Configuration
      </Button>
    </div>
  )
}

// ============================================
// OUTPUT NODE CONFIG (with Chat Interface)
// ============================================
function OutputNodeConfig({
  node,
  onUpdate,
}: {
  node: Node
  onUpdate: (data: Record<string, unknown>) => void
}) {
  const config = (node.data as Record<string, unknown>).config as Record<string, unknown> || {}
  const outputType = (config.outputType as string) || 'chat'

  const [format, setFormat] = useState((config.format as string) || 'text')
  const [destination, setDestination] = useState((config.destination as string) || '')

  const handleSave = () => {
    onUpdate({
      config: {
        ...config,
        outputType,
        format,
        destination,
      },
    })
  }

  // Chat Interface - Uses floating window, no config panel needed
  if (outputType === 'chat') {
    return null
  }

  // Non-chat output types
  return (
    <div className="space-y-6 p-4">
      {/* Output Type Info */}
      <div className="rounded-lg bg-[var(--nomu-surface)] p-4">
        <p className="text-sm font-medium text-[var(--nomu-text)] capitalize">{outputType} Output</p>
        <p className="text-xs text-[var(--nomu-text-muted)] mt-1">
          {outputType === 'spreadsheet' && 'Export results to a spreadsheet format'}
          {outputType === 'email' && 'Send results via email notification'}
          {outputType === 'telegram' && 'Send results to a Telegram bot'}
        </p>
      </div>

      {/* Format */}
      <div>
        <label className="mb-2 block text-sm font-medium text-[var(--nomu-text-muted)]">Output Format</label>
        <Select
          options={[
            { value: 'json', label: 'JSON' },
            { value: 'text', label: 'Plain Text' },
            { value: 'markdown', label: 'Markdown' },
            { value: 'csv', label: 'CSV' },
          ]}
          value={format}
          onChange={(e) => setFormat(e.target.value)}
        />
      </div>

      {/* Destination (for email/telegram) */}
      {(outputType === 'email' || outputType === 'telegram') && (
        <Input
          label={outputType === 'email' ? 'Email Address' : 'Telegram Chat ID'}
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder={outputType === 'email' ? 'user@example.com' : '@chatid'}
        />
      )}

      {/* Save */}
      <Button variant="primary" onClick={handleSave} leftIcon={<Save size={14} />} className="w-full">
        Save Configuration
      </Button>
    </div>
  )
}

// ============================================
// DOCKER CONTAINER NODE CONFIG
// ============================================
function DockerContainerNodeConfig({
  node,
  onUpdate,
}: {
  node: Node
  onUpdate: (data: Record<string, unknown>) => void
}) {
  const { dockerAvailable, dockerHealth } = useDockerStore()
  const config = (node.data as Record<string, unknown>).config as Record<string, unknown> || {}

  const [image, setImage] = useState((config.image as string) || '')
  const [tag, setTag] = useState((config.tag as string) || 'latest')
  const [command, setCommand] = useState((config.command as string) || '')
  const [envVars, setEnvVars] = useState<Array<{key: string, value: string}>>(
    Object.entries((config.envVars as Record<string, string>) || {}).map(([key, value]) => ({ key, value }))
  )
  const [cpuLimit, setCpuLimit] = useState((config.cpuLimit as number) || 0.5)
  const [memoryLimit, setMemoryLimit] = useState((config.memoryLimit as number) || 512)
  const [timeoutSecs, setTimeoutSecs] = useState((config.timeout as number) || 300)
  const [networkMode, setNetworkMode] = useState<'none' | 'internal'>((config.networkMode as 'none' | 'internal') || 'none')
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
