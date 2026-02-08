import { useState } from 'react'
import type { Node } from '@xyflow/react'
import { CheckCircle2, Save, ChevronDown, ChevronRight } from 'lucide-react'
import { Button, Input, Select } from '../../common'

interface VoiceAssistantNodeConfigProps {
  node: Node
  onUpdate: (data: Record<string, unknown>) => void
}

export function VoiceAssistantNodeConfig({ node, onUpdate }: VoiceAssistantNodeConfigProps) {
  const config = ((node.data as Record<string, unknown>).config as Record<string, unknown>) ?? {}

  const [model, setModel] = useState<string>((config.transcription_model as string) ?? 'small')
  const [language, setLanguage] = useState<string>((config.language as string) ?? 'en')
  const [realtimePreview, setRealtimePreview] = useState<boolean>((config.realtime_preview as boolean) ?? false)
  const [useBackend, setUseBackend] = useState<boolean>((config.use_backend as boolean) ?? false)
  const [personaplexEnabled, setPersonaplexEnabled] = useState<boolean>((config.personaplex_enabled as boolean) ?? false)
  const [personaplexUrl, setPersonaplexUrl] = useState<string>((config.personaplex_url as string) ?? '')
  const [personaPrompt, setPersonaPrompt] = useState<string>((config.persona_prompt as string) ?? '')
  const [voiceEmbedding, setVoiceEmbedding] = useState<string>((config.voice_embedding as string) ?? '')

  const [showPersonaPlex, setShowPersonaPlex] = useState(personaplexEnabled)
  const [showSaved, setShowSaved] = useState(false)

  const handleSave = () => {
    onUpdate({
      config: {
        ...config,
        transcription_model: model,
        language,
        realtime_preview: realtimePreview,
        use_backend: useBackend,
        personaplex_enabled: personaplexEnabled,
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

      {/* Transcription Settings */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--nomu-text-muted)]">
          Transcription
        </h3>
        <Select
          label="Model"
          options={[
            { value: 'tiny', label: 'Tiny (fastest)' },
            { value: 'small', label: 'Small (balanced)' },
            { value: 'medium', label: 'Medium (accurate)' },
            { value: 'large-v3-turbo', label: 'Large v3 Turbo (best)' },
          ]}
          value={model}
          onChange={(e) => setModel(e.target.value)}
        />
        <Select
          label="Language"
          options={[
            { value: 'en', label: 'English' },
            { value: 'es', label: 'Spanish' },
            { value: 'fr', label: 'French' },
            { value: 'de', label: 'German' },
            { value: 'it', label: 'Italian' },
            { value: 'pt', label: 'Portuguese' },
            { value: 'nl', label: 'Dutch' },
            { value: 'ja', label: 'Japanese' },
            { value: 'zh', label: 'Chinese' },
            { value: 'ko', label: 'Korean' },
            { value: 'ar', label: 'Arabic' },
            { value: 'auto', label: 'Auto-detect' },
          ]}
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        />
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={realtimePreview}
            onChange={(e) => setRealtimePreview(e.target.checked)}
            className="h-4 w-4 rounded border-[var(--nomu-border)] bg-[var(--nomu-bg)] text-[var(--nomu-primary)]"
          />
          <span className="text-sm text-[var(--nomu-text-muted)]">Realtime preview</span>
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={useBackend}
            onChange={(e) => setUseBackend(e.target.checked)}
            className="h-4 w-4 rounded border-[var(--nomu-border)] bg-[var(--nomu-bg)] text-[var(--nomu-primary)]"
          />
          <span className="text-sm text-[var(--nomu-text-muted)]">Use backend for transcription</span>
        </label>
      </div>

      {/* PersonaPlex Section */}
      <div className="space-y-3">
        <button
          onClick={() => setShowPersonaPlex(!showPersonaPlex)}
          className="flex w-full items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--nomu-text-muted)] transition hover:text-[var(--nomu-text)]"
        >
          {showPersonaPlex ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          PersonaPlex Voice
        </button>
        {showPersonaPlex && (
          <div className="space-y-4 rounded-lg border border-[var(--nomu-border)] bg-[var(--nomu-surface)] p-3">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={personaplexEnabled}
                onChange={(e) => setPersonaplexEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-[var(--nomu-border)] bg-[var(--nomu-bg)] text-[var(--nomu-primary)]"
              />
              <span className="text-sm text-[var(--nomu-text-muted)]">Enable PersonaPlex</span>
            </label>
            {personaplexEnabled && (
              <>
                <Input
                  label="PersonaPlex URL"
                  type="text"
                  value={personaplexUrl}
                  onChange={(e) => setPersonaplexUrl(e.target.value)}
                  placeholder="http://localhost:8765"
                />
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--nomu-text-muted)]">
                    Persona Prompt
                  </label>
                  <textarea
                    value={personaPrompt}
                    onChange={(e) => setPersonaPrompt(e.target.value)}
                    className="w-full rounded-lg border border-[var(--nomu-border)] bg-[var(--nomu-surface)] px-3 py-2 font-mono text-sm text-[var(--nomu-text)] placeholder-[var(--nomu-text-muted)]"
                    rows={3}
                    placeholder="Describe the voice persona..."
                  />
                </div>
                <Input
                  label="Voice Embedding"
                  type="text"
                  value={voiceEmbedding}
                  onChange={(e) => setVoiceEmbedding(e.target.value)}
                  placeholder="Path or ID of voice embedding"
                />
              </>
            )}
          </div>
        )}
      </div>

      <Button variant="primary" onClick={handleSave} leftIcon={<Save size={14} />} className="w-full">
        Save Configuration
      </Button>
    </div>
  )
}
