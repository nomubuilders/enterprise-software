import { useState, useEffect } from 'react'
import type { Node } from '@xyflow/react'
import { Bot, CheckCircle2, Loader2, Save } from 'lucide-react'
import { Button, Input, Select } from '../../common'
import { api } from '../../../services/api'

export function LLMNodeConfig({
  node,
  onUpdate,
}: {
  node: Node
  onUpdate: (data: Record<string, unknown>) => void
}) {
  const config = (node.data as Record<string, unknown>).config as Record<string, unknown> || {}

  const [model, setModel] = useState((config.model as string) ?? 'llama3.2')
  const [temperature, setTemperature] = useState((config.temperature as number) ?? 0.7)
  const [maxTokens, setMaxTokens] = useState((config.maxTokens as number) ?? 2048)
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
