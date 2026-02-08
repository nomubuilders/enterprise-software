import { useState } from 'react'
import type { Node } from '@xyflow/react'
import { CheckCircle2, Save } from 'lucide-react'
import { Button, Input, Select } from '../../common'
import type { FieldDef } from './types'

export function GenericNodeConfig({
  node,
  onUpdate,
  fields,
}: {
  node: Node
  onUpdate: (data: Record<string, unknown>) => void
  fields: FieldDef[]
}) {
  const config = (node.data as Record<string, unknown>).config as Record<string, unknown> || {}
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {}
    for (const field of fields) {
      initial[field.key] = config[field.key] ?? (field.type === 'checkbox' ? false : field.type === 'number' ? 0 : '')
    }
    return initial
  })
  const [showSaved, setShowSaved] = useState(false)

  const updateField = (key: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    onUpdate({ config: { ...config, ...values } })
    setShowSaved(true)
    setTimeout(() => setShowSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      {showSaved && (
        <div className="flex items-center gap-2 text-green-400 text-sm bg-green-900/30 rounded-lg px-3 py-2">
          <CheckCircle2 size={16} />
          <span>Configuration saved!</span>
        </div>
      )}

      <div className="space-y-4">
        {fields.map((field) => {
          if (field.type === 'select' && field.options) {
            return (
              <Select
                key={field.key}
                label={field.label}
                options={field.options}
                value={(values[field.key] as string) || ''}
                onChange={(e) => updateField(field.key, e.target.value)}
              />
            )
          }
          if (field.type === 'checkbox') {
            return (
              <label key={field.key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!values[field.key]}
                  onChange={(e) => updateField(field.key, e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--nomu-border)] bg-[var(--nomu-bg)] text-[var(--nomu-primary)]"
                />
                <span className="text-sm text-[var(--nomu-text-muted)]">{field.label}</span>
              </label>
            )
          }
          if (field.type === 'textarea') {
            return (
              <div key={field.key}>
                <label className="mb-1 block text-sm font-medium text-[var(--nomu-text-muted)]">{field.label}</label>
                <textarea
                  value={(values[field.key] as string) || ''}
                  onChange={(e) => updateField(field.key, e.target.value)}
                  className="w-full rounded-lg border border-[var(--nomu-border)] bg-[var(--nomu-surface)] px-3 py-2 font-mono text-sm text-[var(--nomu-text)] placeholder-[var(--nomu-text-muted)]"
                  rows={3}
                  placeholder={field.placeholder}
                />
              </div>
            )
          }
          return (
            <Input
              key={field.key}
              label={field.label}
              type={field.type}
              value={values[field.key] as string | number}
              onChange={(e) => updateField(field.key, field.type === 'number' ? parseInt(e.target.value) || 0 : e.target.value)}
              placeholder={field.placeholder}
            />
          )
        })}
      </div>

      <Button variant="primary" onClick={handleSave} leftIcon={<Save size={14} />} className="w-full">
        Save Configuration
      </Button>
    </div>
  )
}
