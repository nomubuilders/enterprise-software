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
          <label className="mb-1.5 block text-sm font-medium text-slate-300">
            Description (optional)
          </label>
          <textarea
            className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 transition hover:border-slate-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            rows={3}
            placeholder="Describe what this workflow does..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Stats */}
        <div className="rounded-lg bg-slate-900 p-4">
          <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
            Workflow Summary
          </h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-2xl font-bold text-white">{nodes.length}</p>
              <p className="text-xs text-slate-400">Nodes</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{edges.length}</p>
              <p className="text-xs text-slate-400">Connections</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {nodes.filter(n => n.type === 'llmNode').length}
              </p>
              <p className="text-xs text-slate-400">AI Nodes</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-700">
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
