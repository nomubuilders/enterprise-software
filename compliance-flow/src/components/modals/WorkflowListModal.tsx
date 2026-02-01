import { useState, useCallback } from 'react'
import {
  FolderOpen,
  Plus,
  Trash2,
  Copy,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  FileEdit,
  MoreVertical,
} from 'lucide-react'
import { Modal, Button, Input } from '../common'
import { useWorkflowStore } from '../../store/workflowStore'
import { useFlowStore } from '../../store/flowStore'
import type { Workflow } from '../../types'

interface WorkflowListModalProps {
  isOpen: boolean
  onClose: () => void
}

export function WorkflowListModal({ isOpen, onClose }: WorkflowListModalProps) {
  const {
    workflows,
    currentWorkflowId,
    createWorkflow,
    deleteWorkflow,
    duplicateWorkflow,
    loadWorkflow,
    renameWorkflow,
  } = useWorkflowStore()

  const { clearFlow } = useFlowStore()

  const [showNewWorkflow, setShowNewWorkflow] = useState(false)
  const [newWorkflowName, setNewWorkflowName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)

  const handleCreateWorkflow = useCallback(() => {
    if (newWorkflowName.trim()) {
      createWorkflow(newWorkflowName.trim())
      clearFlow()
      setNewWorkflowName('')
      setShowNewWorkflow(false)
      onClose()
    }
  }, [newWorkflowName, createWorkflow, clearFlow, onClose])

  const handleLoadWorkflow = useCallback((workflow: Workflow) => {
    loadWorkflow(workflow.id)
    // Load nodes and edges into flow store would happen here
    onClose()
  }, [loadWorkflow, onClose])

  const handleDelete = useCallback((id: string) => {
    if (confirm('Are you sure you want to delete this workflow?')) {
      deleteWorkflow(id)
    }
    setMenuOpenId(null)
  }, [deleteWorkflow])

  const handleDuplicate = useCallback((id: string) => {
    duplicateWorkflow(id)
    setMenuOpenId(null)
  }, [duplicateWorkflow])

  const handleStartRename = useCallback((workflow: Workflow) => {
    setEditingId(workflow.id)
    setEditName(workflow.name)
    setMenuOpenId(null)
  }, [])

  const handleSaveRename = useCallback(() => {
    if (editingId && editName.trim()) {
      renameWorkflow(editingId, editName.trim())
    }
    setEditingId(null)
    setEditName('')
  }, [editingId, editName, renameWorkflow])

  const getStatusIcon = (status: Workflow['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 size={14} className="text-green-500" />
      case 'running':
        return <Play size={14} className="text-blue-500 animate-pulse" />
      case 'error':
        return <AlertCircle size={14} className="text-red-500" />
      default:
        return <Clock size={14} className="text-slate-500" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Workflows" size="lg">
      <div className="space-y-4">
        {/* New Workflow Form */}
        {showNewWorkflow ? (
          <div className="flex gap-2">
            <Input
              placeholder="Workflow name..."
              value={newWorkflowName}
              onChange={(e) => setNewWorkflowName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateWorkflow()}
              autoFocus
            />
            <Button variant="primary" onClick={handleCreateWorkflow}>
              Create
            </Button>
            <Button variant="ghost" onClick={() => setShowNewWorkflow(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="secondary"
            onClick={() => setShowNewWorkflow(true)}
            leftIcon={<Plus size={16} />}
            className="w-full"
          >
            New Workflow
          </Button>
        )}

        {/* Workflow List */}
        <div className="max-h-96 overflow-y-auto space-y-2">
          {workflows.length === 0 ? (
            <div className="py-8 text-center">
              <FolderOpen size={48} className="mx-auto mb-3 text-slate-600" />
              <p className="text-slate-400">No workflows yet</p>
              <p className="text-sm text-slate-500">Create your first workflow to get started</p>
            </div>
          ) : (
            workflows.map((workflow) => (
              <div
                key={workflow.id}
                className={`
                  group relative flex items-center justify-between rounded-lg border p-3 transition cursor-pointer
                  ${currentWorkflowId === workflow.id
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/50'}
                `}
                onClick={() => handleLoadWorkflow(workflow)}
              >
                <div className="flex-1 min-w-0">
                  {editingId === workflow.id ? (
                    <input
                      className="w-full bg-slate-900 border border-purple-500 rounded px-2 py-1 text-sm text-white focus:outline-none"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveRename()
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      onBlur={handleSaveRename}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(workflow.status)}
                        <span className="font-medium text-white truncate">{workflow.name}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                        <span>{workflow.nodes.length} nodes</span>
                        <span>•</span>
                        <span>Updated {formatDate(workflow.updatedAt)}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Actions Menu */}
                <div className="relative ml-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setMenuOpenId(menuOpenId === workflow.id ? null : workflow.id)
                    }}
                    className="rounded p-1.5 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-slate-700 hover:text-white transition"
                  >
                    <MoreVertical size={16} />
                  </button>

                  {menuOpenId === workflow.id && (
                    <div className="absolute right-0 top-full mt-1 w-36 rounded-lg bg-slate-700 py-1 shadow-xl z-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStartRename(workflow)
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-600"
                      >
                        <FileEdit size={14} />
                        Rename
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDuplicate(workflow.id)
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-600"
                      >
                        <Copy size={14} />
                        Duplicate
                      </button>
                      <hr className="my-1 border-slate-600" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(workflow.id)
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-slate-600"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  )
}
