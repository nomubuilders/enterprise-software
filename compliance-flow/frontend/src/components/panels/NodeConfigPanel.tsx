import { useState, useEffect, useRef, type ComponentType } from 'react'
import type { Node } from '@xyflow/react'
import { motion } from 'framer-motion'
import { X, GripVertical, Trash2 } from 'lucide-react'
import { Button, ConfirmModal } from '../common'
import { useFlowStore } from '../../store/flowStore'
import { useWorkflowStore } from '../../store/workflowStore'
import { NodeIOTestPane } from './NodeIOTestPane'
import { SAPERPConfig } from './SAPERPConfig'
import {
  NodeIcon,
  GenericNodeConfig,
  genericNodeFields,
  TriggerNodeConfig,
  DatabaseNodeConfig,
  LLMNodeConfig,
  PIIFilterNodeConfig,
  OutputNodeConfig,
  DockerContainerNodeConfig,
  DocumentNodeConfig,
  type NodeConfigProps,
} from './configs'

interface NodeConfigPanelProps {
  node: Node | null
  onClose: () => void
  onRunWorkflow?: () => void
  onOpenChat?: () => void
}

export function NodeConfigPanel({ node, onClose, onRunWorkflow, onOpenChat }: NodeConfigPanelProps) {
  const { updateNodeData, deleteNode } = useFlowStore()
  const { isRunning } = useWorkflowStore()

  // Resizable panel state
  const [panelWidth, setPanelWidth] = useState(400)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const isResizing = useRef(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // Handle resize drag
  const handleMouseMove = useRef((e: MouseEvent) => {
    if (!isResizing.current) return
    const newWidth = window.innerWidth - e.clientX
    setPanelWidth(Math.min(Math.max(320, newWidth), 800)) // Min 320, Max 800
  }).current

  const handleMouseUp = useRef(() => {
    isResizing.current = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }).current

  const handleMouseDown = (e: React.MouseEvent) => {
    isResizing.current = true
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    e.preventDefault()
  }

  // Cleanup: remove orphaned listeners if panel unmounts mid-drag
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  if (!node) return null

  const nodeType = node.type || ''
  const nodeData = node.data as Record<string, unknown>
  const handleUpdate = (data: Record<string, unknown>) => updateNodeData(node.id, data)

  const handleDelete = () => {
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = () => {
    deleteNode(node.id)
    setShowDeleteConfirm(false)
    onClose()
  }

  // Custom configs with standard NodeConfigProps
  const customConfigs: Record<string, ComponentType<NodeConfigProps>> = {
    databaseNode: DatabaseNodeConfig,
    llmNode: LLMNodeConfig,
    piiFilterNode: PIIFilterNodeConfig,
    dockerContainerNode: DockerContainerNodeConfig,
    documentNode: DocumentNodeConfig,
    sapERPNode: SAPERPConfig,
  }

  const renderConfig = () => {
    // Special cases with extra props
    if (nodeType === 'triggerNode') {
      return <TriggerNodeConfig node={node} onUpdate={handleUpdate} onRun={onRunWorkflow} isRunning={isRunning} />
    }
    if (nodeType === 'outputNode') {
      return <OutputNodeConfig node={node} onUpdate={handleUpdate} onOpenChat={onOpenChat} />
    }

    // Custom configs (standard NodeConfigProps)
    const CustomConfig = customConfigs[nodeType]
    if (CustomConfig) return <CustomConfig node={node} onUpdate={handleUpdate} />

    // Generic configs (field-driven)
    const fields = genericNodeFields[nodeType]
    if (fields) return <GenericNodeConfig node={node} onUpdate={handleUpdate} fields={fields} />

    return null
  }

  return (
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.15 }}
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
        {renderConfig()}

        {/* Node I/O Test Pane */}
        <NodeIOTestPane
          nodeType={nodeType}
          nodeConfig={(nodeData.config as Record<string, unknown>) ?? {}}
        />
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

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Delete Node"
        message={`Delete "${nodeData.label}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </motion.div>
  )
}
