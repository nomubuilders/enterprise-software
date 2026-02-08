import { useState } from 'react'
import type { Node } from '@xyflow/react'
import { Shield, CheckCircle2, Save } from 'lucide-react'
import { Button } from '../../common'

export function PIIFilterNodeConfig({
  node,
  onUpdate,
}: {
  node: Node
  onUpdate: (data: Record<string, unknown>) => void
}) {
  const config = (node.data as Record<string, unknown>).config as Record<string, unknown> || {}

  const [mode, setMode] = useState((config.mode as string) ?? 'redact')
  const [entities, setEntities] = useState<string[]>(
    (config.entities as string[]) ?? ['EMAIL', 'PHONE', 'SSN', 'CREDIT_CARD', 'NAME']
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
