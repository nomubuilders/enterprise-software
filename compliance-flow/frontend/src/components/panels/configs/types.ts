import type { Node } from '@xyflow/react'

export interface NodeConfigProps {
  node: Node
  onUpdate: (data: Record<string, unknown>) => void
}

export interface FieldDef {
  key: string
  label: string
  type: 'text' | 'number' | 'password' | 'select' | 'checkbox' | 'textarea'
  placeholder?: string
  options?: Array<{ value: string; label: string }>
}
