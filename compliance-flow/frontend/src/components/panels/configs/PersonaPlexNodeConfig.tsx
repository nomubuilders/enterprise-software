import { useState, useEffect } from 'react'
import type { Node } from '@xyflow/react'
import { CheckCircle2, Save, ChevronDown, ChevronRight } from 'lucide-react'
import { Button, Input, Select } from '../../common'
import { api } from '../../../services/api'

interface PersonaPlexNodeConfigProps {
  node: Node
  onUpdate: (data: Record<string, unknown>) => void
}

export function PersonaPlexNodeConfig({ node, onUpdate }: PersonaPlexNodeConfigProps) {
  const config = ((node.data as Record<string, unknown>).config as Record<string, unknown>) ?? {}

  const [model, setModel] = useState<string>((config.model as string) ?? '')
  const [temperature, setTemperature] = useState<number>((config.temperature as number) ?? 0.7)
  const [transcriptionModel, setTranscriptionModel] = useState<string>((config.transcription_model as string) ?? 'small')
  const [language, setLanguage] = useState<string>((config.language as string) ?? 'en')
  const [personaplexUrl, setPersonaplexUrl] = useState<string>((config.personaplex_url as string) ?? '')
  const [personaPrompt, setPersonaPrompt] = useState<string>((config.persona_prompt as string) ?? '')
  const [voiceEmbedding, setVoiceEmbedding] = useState<string>((config.voice_embedding as string) ?? '')

  const [showTts, setShowTts] = useState(!!personaplexUrl)
  const [showSaved, setShowSaved] = useState(false)
  const [models, setModels] = useState<{ name: string }[]>([])

  useEffect(() => {
    api.listModels().then((r) => setModels(r.models)).catch(() => {})
  }, [])

  const handleSave = () => {
    onUpdate({
      config: {
        ...config,
        model,
        temperature,
        transcription_model: transcriptionModel,
        language,
        personaplex_url: personaplexUrl,
        persona_prompt: personaPrompt,
        voice_embedding: voiceEmbedding,
      },
    })
    setShowSaved(true)
    setTimeout(() => setShowSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      {showSaved && (
        <div className="flex items-center gap-2 rounded-lg bg-green-900/30 px-3 py-2 text-sm text-green-400">
          <CheckCircle2 size={16} />
          <span>Configuration saved!</span>
        </div>
      )}

      {/* AI Model */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--nomu-text-muted)]">AI Model</h3>
        <Select
          label="Model"
          options={[
            { value: '', label: 'Select model...' },
            ...models.map((m) => ({ value: m.name, label: m.name })),
          ]}
          value={model}
          onChange={(e) => setModel(e.target.value)}
        />
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--nomu-text-muted)]">
            Temperature: {temperature.toFixed(1)}
          </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            className="w-full accent-[var(--nomu-primary)]"
          />
        </div>
      </div>

      {/* Voice Settings */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--nomu-text-muted)]">Voice Settings</h3>
        <Select
          label="Transcription Model"
          options={[
            { value: 'tiny', label: 'Tiny (fastest)' },
            { value: 'small', label: 'Small (balanced)' },
            { value: 'medium', label: 'Medium (accurate)' },
            { value: 'large-v3-turbo', label: 'Large v3 Turbo (best)' },
          ]}
          value={transcriptionModel}
          onChange={(e) => setTranscriptionModel(e.target.value)}
        />
        <Select
          label="Language"
          options={[
            { value: 'en', label: 'English' },
            { value: 'es', label: 'Spanish' },
            { value: 'fr', label: 'French' },
            { value: 'de', label: 'German' },
            { value: 'nl', label: 'Dutch' },
            { value: 'ja', label: 'Japanese' },
            { value: 'zh', label: 'Chinese' },
            { value: 'auto', label: 'Auto-detect' },
          ]}
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        />
      </div>

      {/* PersonaPlex TTS */}
      <div className="space-y-3">
        <button
          onClick={() => setShowTts(!showTts)}
          className="flex w-full items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--nomu-text-muted)] transition hover:text-[var(--nomu-text)]"
        >
          {showTts ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          PersonaPlex TTS
        </button>
        {showTts && (
          <div className="space-y-4 rounded-lg border border-[var(--nomu-border)] bg-[var(--nomu-surface)] p-3">
            <Input
              label="PersonaPlex URL"
              type="text"
              value={personaplexUrl}
              onChange={(e) => setPersonaplexUrl(e.target.value)}
              placeholder="http://localhost:8765/tts"
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--nomu-text-muted)]">Persona Prompt</label>
              <textarea
                value={personaPrompt}
                onChange={(e) => setPersonaPrompt(e.target.value)}
                className="w-full rounded-lg border border-[var(--nomu-border)] bg-[var(--nomu-surface)] px-3 py-2 font-mono text-sm text-[var(--nomu-text)] placeholder-[var(--nomu-text-muted)]"
                rows={3}
                placeholder="You are a senior data analyst..."
              />
            </div>
            <Input
              label="Voice Embedding"
              type="text"
              value={voiceEmbedding}
              onChange={(e) => setVoiceEmbedding(e.target.value)}
              placeholder="Path or ID of voice embedding"
            />
          </div>
        )}
      </div>

      <Button variant="primary" onClick={handleSave} leftIcon={<Save size={14} />} className="w-full">
        Save Configuration
      </Button>
    </div>
  )
}
