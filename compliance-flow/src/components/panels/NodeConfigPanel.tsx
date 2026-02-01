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
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Button, Input, Select } from '../common'
import { useFlowStore } from '../../store/flowStore'
import { useWorkflowStore } from '../../store/workflowStore'
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
      className="fixed right-0 top-0 z-40 flex h-full flex-col border-l border-slate-700 bg-slate-900 shadow-2xl"
    >
      {/* Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        className="absolute left-0 top-0 h-full w-1 cursor-ew-resize bg-transparent hover:bg-purple-500/50 transition-colors group"
      >
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical size={16} className="text-purple-400" />
        </div>
      </div>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
        <div className="flex items-center gap-3">
          <NodeIcon type={nodeType} />
          <div>
            <h2 className="font-semibold text-white">{nodeData.label as string}</h2>
            <p className="text-xs text-slate-400">Configure node settings</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
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
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-slate-700 px-4 py-3">
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
      return <div className={`${iconClass} bg-purple-600`}><Bot size={20} className="text-white" /></div>
    case 'piiFilterNode':
      return <div className={`${iconClass} bg-amber-600`}><Shield size={20} className="text-white" /></div>
    case 'outputNode':
      return <div className={`${iconClass} bg-cyan-600`}><MessageSquare size={20} className="text-white" /></div>
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
      <div className="rounded-lg bg-slate-800 p-4">
        <div className="flex items-center gap-3 mb-3">
          {triggerType === 'manual' && <Play size={20} className="text-green-500" />}
          {triggerType === 'schedule' && <Clock size={20} className="text-green-500" />}
          {triggerType === 'webhook' && <Webhook size={20} className="text-green-500" />}
          <span className="font-medium text-white capitalize">{triggerType} Trigger</span>
        </div>

        {triggerType === 'manual' && (
          <p className="text-sm text-slate-400">
            Click the button below to manually start this workflow.
          </p>
        )}
        {triggerType === 'schedule' && (
          <p className="text-sm text-slate-400">
            This workflow runs automatically based on the cron schedule.
          </p>
        )}
        {triggerType === 'webhook' && (
          <p className="text-sm text-slate-400">
            This workflow is triggered by HTTP requests to the webhook endpoint.
          </p>
        )}
      </div>

      {/* Manual Trigger - Run Button */}
      {triggerType === 'manual' && (
        <div className="rounded-lg border-2 border-dashed border-green-600/50 bg-green-900/20 p-6 text-center">
          <Play size={32} className="mx-auto mb-3 text-green-500" />
          <p className="mb-4 text-sm text-slate-300">Ready to execute workflow</p>
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
          <div className="rounded-lg bg-slate-800 p-3">
            <p className="text-xs text-slate-500 mb-1">Common schedules:</p>
            <div className="flex flex-wrap gap-2">
              {['0 * * * *', '0 0 * * *', '0 0 * * 0', '*/5 * * * *'].map((cron) => (
                <button
                  key={cron}
                  onClick={() => setSchedule(cron)}
                  className="rounded bg-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-600"
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
          <div className="rounded-lg bg-slate-800 p-3">
            <p className="text-xs text-slate-500 mb-1">Full URL:</p>
            <code className="text-xs text-purple-400 break-all">
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
        <h3 className="mb-3 text-sm font-medium text-white">Connection</h3>
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
              className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-purple-600"
            />
            <span className="text-sm text-slate-300">Use SSL/TLS</span>
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
            {testResult.version && <span className="text-xs text-slate-500">({testResult.version})</span>}
          </div>
        )}
      </div>

      {/* Query */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-white">Query</h3>
        {tables.length > 0 && (
          <div className="mb-2">
            <p className="text-xs text-slate-500 mb-1">Available tables:</p>
            <div className="flex flex-wrap gap-1">
              {tables.slice(0, 8).map((table) => (
                <span key={table} className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                  {table}
                </span>
              ))}
              {tables.length > 8 && (
                <span className="text-xs text-slate-500">+{tables.length - 8} more</span>
              )}
            </div>
          </div>
        )}
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 font-mono text-sm text-white placeholder-slate-500"
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
  const [systemPrompt, setSystemPrompt] = useState(
    (config.systemPrompt as string) || 'You are a helpful assistant.'
  )
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
        systemPrompt,
        temperature,
        maxTokens,
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

      {/* Model Selection */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-slate-300">Model</label>
          <button
            onClick={loadModels}
            disabled={isLoading}
            className="text-xs text-purple-400 hover:text-purple-300"
          >
            {isLoading ? <Loader2 size={12} className="animate-spin" /> : 'Refresh'}
          </button>
        </div>
        <Select
          options={availableModels.map((m) => ({ value: m, label: m }))}
          value={model}
          onChange={(e) => setModel(e.target.value)}
        />
        {availableModels.length === 0 && !isLoading && (
          <p className="mt-1 text-xs text-amber-400">No models found. Make sure Ollama is running.</p>
        )}
      </div>

      {/* System Prompt */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">System Prompt</label>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500"
          rows={4}
          placeholder="You are a helpful assistant..."
        />
      </div>

      {/* Temperature */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-slate-300">Temperature</label>
          <span className="text-sm text-purple-400">{temperature}</span>
        </div>
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={temperature}
          onChange={(e) => setTemperature(parseFloat(e.target.value))}
          className="w-full accent-purple-500"
        />
        <div className="flex justify-between text-xs text-slate-500">
          <span>Precise</span>
          <span>Creative</span>
        </div>
      </div>

      {/* Max Tokens */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">Max Tokens</label>
        <Input
          type="number"
          value={maxTokens}
          onChange={(e) => setMaxTokens(parseInt(e.target.value) || 2048)}
          placeholder="2048"
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
        <label className="mb-2 block text-sm font-medium text-slate-300">Filter Mode</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setMode('redact')}
            className={`rounded-lg p-3 text-left transition ${
              mode === 'redact'
                ? 'bg-amber-600/20 border-2 border-amber-500'
                : 'bg-slate-800 border-2 border-transparent hover:border-slate-600'
            }`}
          >
            <p className="font-medium text-white">Redact</p>
            <p className="text-xs text-slate-400">Remove PII completely</p>
          </button>
          <button
            onClick={() => setMode('mask')}
            className={`rounded-lg p-3 text-left transition ${
              mode === 'mask'
                ? 'bg-amber-600/20 border-2 border-amber-500'
                : 'bg-slate-800 border-2 border-transparent hover:border-slate-600'
            }`}
          >
            <p className="font-medium text-white">Mask</p>
            <p className="text-xs text-slate-400">Replace with asterisks</p>
          </button>
        </div>
      </div>

      {/* Entity Types */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">Detect Entities</label>
        <div className="flex flex-wrap gap-2">
          {allEntities.map((entity) => (
            <button
              key={entity}
              onClick={() => toggleEntity(entity)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                entities.includes(entity)
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {entity.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-lg bg-slate-800 p-3">
        <p className="text-xs text-slate-500 mb-2">Example:</p>
        <p className="text-sm text-slate-300">
          Input: <span className="text-red-400">john@email.com</span> called{' '}
          <span className="text-red-400">555-1234</span>
        </p>
        <p className="text-sm text-slate-300 mt-1">
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
        <p className="mt-1 text-xs text-slate-400">
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

  // Get workflow context
  const { nodes, edges } = useFlowStore()
  const { currentExecution } = useWorkflowStore()

  const [format, setFormat] = useState((config.format as string) || 'text')
  const [destination, setDestination] = useState((config.destination as string) || '')

  // Chat interface state
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedModel, setSelectedModel] = useState((config.chatModel as string) || 'llama3.2')
  const [availableModels, setAvailableModels] = useState<string[]>([])

  // Database context state
  const [dbSchema, setDbSchema] = useState<Array<{ name: string; columns: Array<{ name: string; type: string }> }>>([])
  const [dbConfig, setDbConfig] = useState<Record<string, unknown> | null>(null)
  const [sampleData, setSampleData] = useState<Record<string, unknown>[] | null>(null)
  const [dataRowCount, setDataRowCount] = useState<number>(0)
  const [isLoadingContext, setIsLoadingContext] = useState(false)
  const [dataLoadError, setDataLoadError] = useState<string | null>(null)

  // Find connected database nodes and load their schema
  useEffect(() => {
    if (outputType === 'chat') {
      loadModels()
      loadDatabaseContext()
    }
  }, [outputType, nodes, edges])

  const loadModels = async () => {
    try {
      const result = await api.listModels()
      setAvailableModels(result.models.map((m) => m.name))
      if (result.models.length > 0 && !selectedModel) {
        setSelectedModel(result.models[0].name)
      }
    } catch {
      setAvailableModels(['llama3.2', 'mistral', 'codellama'])
    }
  }

  // Load database schema from connected database nodes
  const loadDatabaseContext = async () => {
    setIsLoadingContext(true)
    setDataLoadError(null)
    setSampleData(null)
    setDataRowCount(0)

    // Find database nodes in the workflow
    const dbNodes = nodes.filter((n) => n.type === 'databaseNode')
    console.log('[Chat] Found database nodes:', dbNodes.length)

    for (const dbNode of dbNodes) {
      const nodeConfig = (dbNode.data as Record<string, unknown>).config as Record<string, unknown>
      console.log('[Chat] DB Node config:', nodeConfig)

      if (nodeConfig?.host && nodeConfig?.database) {
        try {
          const dbConfigData = {
            type: (nodeConfig.dbType as 'postgresql' | 'mysql' | 'mongodb') || 'postgresql',
            host: nodeConfig.host as string,
            port: (nodeConfig.port as number) || 5432,
            database: nodeConfig.database as string,
            username: (nodeConfig.username as string) || '',
            password: (nodeConfig.password as string) || '',
            ssl: (nodeConfig.ssl as boolean) || false,
          }

          setDbConfig(dbConfigData)

          // Fetch table schema
          const tablesResult = await api.listTables(dbConfigData)
          console.log('[Chat] Tables result:', tablesResult)

          if (tablesResult.success && tablesResult.tables) {
            setDbSchema(tablesResult.tables.map((t) => ({
              name: t.name,
              columns: t.columns || [],
            })))

            // Fetch actual sample data - use simple query without semicolon
            const tableName = tablesResult.tables[0]?.name || 'data'
            const configuredQuery = (nodeConfig.query as string) || ''
            // Clean up the query - remove trailing semicolon and add LIMIT if not present
            let query = configuredQuery.trim().replace(/;$/, '')
            if (!query) {
              query = `SELECT * FROM ${tableName}`
            }
            if (!query.toLowerCase().includes('limit')) {
              query += ' LIMIT 100'
            }

            console.log('[Chat] Executing query:', query)

            try {
              const queryResult = await api.executeQuery(dbConfigData, query, 100)
              console.log('[Chat] Query result:', queryResult)

              if (queryResult.success && queryResult.rows && queryResult.rows.length > 0) {
                setSampleData(queryResult.rows)
                setDataRowCount(queryResult.row_count || queryResult.rows.length)
                console.log('[Chat] Loaded', queryResult.rows.length, 'rows')
              } else if (queryResult.error) {
                setDataLoadError(queryResult.error)
                console.error('[Chat] Query error:', queryResult.error)
              } else {
                setDataLoadError('No data returned from query')
              }
            } catch (queryErr) {
              const errMsg = queryErr instanceof Error ? queryErr.message : 'Query failed'
              setDataLoadError(errMsg)
              console.error('[Chat] Failed to fetch sample data:', queryErr)
            }
          } else if (tablesResult.error) {
            setDataLoadError(tablesResult.error)
          }
          break // Use first connected database
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : 'Failed to load database'
          setDataLoadError(errMsg)
          console.error('[Chat] Failed to load database schema:', err)
        }
      }
    }

    setIsLoadingContext(false)
  }

  // Build system prompt with database context
  const buildSystemPrompt = () => {
    let systemPrompt = `You are a helpful data analyst assistant. You have DIRECT ACCESS to the database data shown below. Answer questions using ONLY this data - do NOT suggest SQL queries for the user to run. You can see and analyze the actual data.`

    // Add database schema context
    if (dbSchema.length > 0 && dbConfig) {
      systemPrompt += `\n\n## Database: ${(dbConfig as Record<string, unknown>).database} (${(dbConfig as Record<string, unknown>).type || 'PostgreSQL'})\n\n`
      systemPrompt += `### Schema:\n`
      for (const table of dbSchema) {
        systemPrompt += `- **${table.name}**: ${table.columns.map((c) => `${c.name} (${c.type})`).join(', ')}\n`
      }
    }

    // Add actual sample data - this is the key part!
    if (sampleData && sampleData.length > 0) {
      systemPrompt += `\n\n### Actual Data (${dataRowCount} total rows, showing ${Math.min(sampleData.length, 30)}):\n\n`
      systemPrompt += '```json\n'
      systemPrompt += JSON.stringify(sampleData.slice(0, 30), null, 2)
      systemPrompt += '\n```\n'
      if (dataRowCount > 30) {
        systemPrompt += `\n(${dataRowCount - 30} more rows not shown)\n`
      }
    }

    // Add workflow execution results if available (fresher data)
    if (currentExecution?.results) {
      const results = currentExecution.results as Record<string, unknown>
      if (results.dbResult) {
        const dbResult = results.dbResult as Record<string, unknown>[]
        systemPrompt += `\n\n### Latest Workflow Query Results (${dbResult.length} rows):\n\n`
        systemPrompt += '```json\n'
        systemPrompt += JSON.stringify(dbResult.slice(0, 20), null, 2)
        systemPrompt += '\n```\n'
      }
    }

    systemPrompt += `\n\n## Instructions:
- Answer questions by analyzing the ACTUAL DATA shown above
- Provide specific values, counts, averages, etc. from the data
- Do NOT tell the user to run SQL queries - you already have the data
- If asked about data not shown, explain what data you can see
- Be precise and use the actual values from the data`

    return systemPrompt
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isGenerating) return

    const userMessage = inputMessage.trim()
    setInputMessage('')
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }])
    setIsGenerating(true)

    try {
      // Build context-aware messages
      const systemPrompt = buildSystemPrompt()

      const result = await api.chat({
        model: selectedModel,
        messages: [
          { role: 'system' as const, content: systemPrompt },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
          { role: 'user' as const, content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 2048,
      })

      const assistantContent = result.message?.content || 'No response received'
      setMessages((prev) => [...prev, { role: 'assistant', content: assistantContent }])
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${error instanceof Error ? error.message : 'Failed to get response'}` },
      ])
    }

    setIsGenerating(false)
  }

  const handleSave = () => {
    onUpdate({
      config: {
        ...config,
        format,
        destination,
        chatModel: selectedModel,
      },
    })
  }

  // Chat Interface for chat output type
  if (outputType === 'chat') {
    return (
      <div className="flex flex-col h-full">
        {/* Chat Header */}
        <div className="flex items-center justify-between border-b border-slate-700 px-4 py-2 bg-slate-800">
          <span className="text-sm font-medium text-white">Chat Interface</span>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="rounded bg-slate-700 px-2 py-1 text-xs text-white border-none outline-none"
          >
            {availableModels.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>

        {/* Database Context Status */}
        {dbSchema.length > 0 && (
          <div className="px-4 py-2 bg-green-900/30 border-b border-green-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-400 text-xs">
                <Database size={12} />
                <span>Connected to {(dbConfig as Record<string, unknown>)?.database as string}</span>
                <span className="text-green-600">({dbSchema.length} tables)</span>
                {sampleData && sampleData.length > 0 && (
                  <span className="text-green-500">• {dataRowCount} rows loaded</span>
                )}
              </div>
              <button
                onClick={loadDatabaseContext}
                disabled={isLoadingContext}
                className="text-green-400 hover:text-green-300 disabled:opacity-50"
                title="Refresh data"
              >
                <RefreshCw size={12} className={isLoadingContext ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        )}

        {/* Error status */}
        {dataLoadError && (
          <div className="px-4 py-2 bg-red-900/30 border-b border-red-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-400 text-xs">
                <XCircle size={12} />
                <span>Data load failed: {dataLoadError}</span>
              </div>
              <button
                onClick={loadDatabaseContext}
                className="text-red-400 hover:text-red-300"
                title="Retry"
              >
                <RefreshCw size={12} />
              </button>
            </div>
          </div>
        )}

        {isLoadingContext && (
          <div className="px-4 py-2 bg-slate-800 border-b border-slate-700">
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <Loader2 size={12} className="animate-spin" />
              <span>Loading database context...</span>
            </div>
          </div>
        )}

        {/* No data warning */}
        {!isLoadingContext && dbSchema.length > 0 && !sampleData && !dataLoadError && (
          <div className="px-4 py-2 bg-yellow-900/30 border-b border-yellow-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-yellow-400 text-xs">
                <Shield size={12} />
                <span>Schema loaded but no data. Click refresh or save your PostgreSQL config first.</span>
              </div>
              <button
                onClick={loadDatabaseContext}
                className="text-yellow-400 hover:text-yellow-300"
                title="Refresh data"
              >
                <RefreshCw size={12} />
              </button>
            </div>
          </div>
        )}

        {/* No database configured */}
        {!isLoadingContext && dbSchema.length === 0 && !dataLoadError && (
          <div className="px-4 py-2 bg-slate-800 border-b border-slate-700">
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <Database size={12} />
              <span>No database configured. Add a PostgreSQL node and save its configuration.</span>
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <MessageSquare size={32} className="mb-2 opacity-50" />
              <p className="text-sm">Start a conversation</p>
              {sampleData && sampleData.length > 0 ? (
                <p className="text-xs text-green-400">✓ {dataRowCount} rows loaded - ask about your data!</p>
              ) : dbSchema.length > 0 ? (
                <p className="text-xs text-yellow-400">Schema loaded, fetching data...</p>
              ) : (
                <p className="text-xs">Configure a database node to enable data queries</p>
              )}
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 ${
                    msg.role === 'user'
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-700 text-slate-200'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div className="text-sm prose prose-sm prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-code:bg-slate-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-slate-800 prose-pre:p-2 prose-pre:rounded-lg prose-pre:overflow-x-auto">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          {isGenerating && (
            <div className="flex justify-start">
              <div className="bg-slate-700 rounded-lg px-3 py-2">
                <Loader2 size={16} className="animate-spin text-purple-400" />
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-slate-700 p-3 bg-slate-800">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type a message..."
              className="flex-1 rounded-lg bg-slate-700 px-3 py-2 text-sm text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-purple-500"
              disabled={isGenerating}
            />
            <Button
              variant="primary"
              size="sm"
              onClick={handleSendMessage}
              disabled={isGenerating || !inputMessage.trim()}
              className="px-3"
            >
              {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            </Button>
          </div>
          <div className="flex justify-between mt-2">
            <button
              onClick={() => setMessages([])}
              className="text-xs text-slate-500 hover:text-slate-400"
            >
              Clear chat
            </button>
            <Button variant="secondary" size="sm" onClick={handleSave}>
              <Save size={12} className="mr-1" /> Save
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Non-chat output types
  return (
    <div className="space-y-6 p-4">
      {/* Output Type Info */}
      <div className="rounded-lg bg-slate-800 p-4">
        <p className="text-sm font-medium text-white capitalize">{outputType} Output</p>
        <p className="text-xs text-slate-400 mt-1">
          {outputType === 'spreadsheet' && 'Export results to a spreadsheet format'}
          {outputType === 'email' && 'Send results via email notification'}
          {outputType === 'telegram' && 'Send results to a Telegram bot'}
        </p>
      </div>

      {/* Format */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">Output Format</label>
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
