import { useState, useCallback, useEffect } from 'react'
import { Save } from 'lucide-react'
import { Modal, Button, Input } from '../common'
import { useWorkflowStore } from '../../store/workflowStore'
import { useFlowStore } from '../../store/flowStore'

interface SaveWorkflowModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SaveWorkflowModal({ isOpen, onClose }: SaveWorkflowModalProps) {
  const { workflows, currentWorkflowId, createWorkflow, saveWorkflow } = useWorkflowStore()
  const { nodes, edges } = useFlowStore()

  const currentWorkflow = workflows.find(w => w.id === currentWorkflowId)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (currentWorkflow) {
      setName(currentWorkflow.name)
      setDescription(currentWorkflow.description || '')
    } else {
      setName('')
      setDescription('')
    }
  }, [currentWorkflow, isOpen])

  const handleSave = useCallback(async () => {
    setIsSaving(true)

    // Simulate save delay
    await new Promise(resolve => setTimeout(resolve, 500))

    if (currentWorkflowId) {
      // Update existing workflow
      saveWorkflow(currentWorkflowId, nodes, edges)
    } else {
      // Create new workflow
      const workflow = createWorkflow(name || 'Untitled Workflow', description)
      saveWorkflow(workflow.id, nodes, edges)
    }

    setIsSaving(false)
    onClose()
  }, [currentWorkflowId, name, description, nodes, edges, createWorkflow, saveWorkflow, onClose])

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Save Workflow" size="md">
      <div className="space-y-4">
        {/* Workflow Name */}
        <Input
          label="Workflow Name"
          placeholder="My Awesome Workflow"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />

        {/* Description */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--nomu-text-muted)]">
            Description (optional)
          </label>
          <textarea
            className="w-full rounded-lg border border-[var(--nomu-border)] bg-[var(--nomu-surface)] px-3 py-2 text-sm text-[var(--nomu-text)] placeholder-[var(--nomu-text-muted)] transition hover:border-[var(--nomu-border)] focus:border-[var(--nomu-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--nomu-primary)]"
            rows={3}
            placeholder="Describe what this workflow does..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Stats */}
        <div className="rounded-lg bg-[var(--nomu-bg)] p-4">
          <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--nomu-text-muted)]">
            Workflow Summary
          </h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-2xl font-bold text-[var(--nomu-text)]">{nodes.length}</p>
              <p className="text-xs text-[var(--nomu-text-muted)]">Nodes</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--nomu-text)]">{edges.length}</p>
              <p className="text-xs text-[var(--nomu-text-muted)]">Connections</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--nomu-text)]">
                {nodes.filter(n => n.type === 'llmNode').length}
              </p>
              <p className="text-xs text-[var(--nomu-text-muted)]">AI Nodes</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t border-[var(--nomu-border)]">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            isLoading={isSaving}
            leftIcon={<Save size={16} />}
            disabled={!name.trim() && !currentWorkflowId}
          >
            {currentWorkflowId ? 'Update' : 'Save'} Workflow
          </Button>
        </div>
      </div>
    </Modal>
  )
}
