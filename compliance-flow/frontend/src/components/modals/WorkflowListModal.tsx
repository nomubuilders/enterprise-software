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
  Shield,
  FileText,
  Eye,
  GitBranch,
  Upload,
  Sparkles,
} from 'lucide-react'
import { Modal, Button, Input, ConfirmModal } from '../common'
import { useWorkflowStore } from '../../store/workflowStore'
import { useFlowStore } from '../../store/flowStore'
import { demoWorkflows } from '../../data/demoWorkflows'
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
    loadDemoWorkflow,
  } = useWorkflowStore()

  const { clearFlow } = useFlowStore()

  const [showNewWorkflow, setShowNewWorkflow] = useState(false)
  const [newWorkflowName, setNewWorkflowName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'workflows' | 'templates'>('workflows')

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'fraud': return Shield
      case 'writing': return FileText
      case 'governance': return Eye
      case 'tools': return GitBranch
      case 'analysis': return Upload
      default: return Sparkles
    }
  }

  const handleLoadDemo = useCallback((demoId: string) => {
    loadDemoWorkflow(demoId)
    onClose()
  }, [loadDemoWorkflow, onClose])

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
    setDeleteConfirmId(id)
    setMenuOpenId(null)
  }, [])

  const handleConfirmDelete = useCallback(() => {
    if (deleteConfirmId) {
      deleteWorkflow(deleteConfirmId)
      setDeleteConfirmId(null)
    }
  }, [deleteConfirmId, deleteWorkflow])

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
        return <Clock size={14} className="text-[var(--nomu-text-muted)]" />
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
        {/* Tab Bar */}
        <div className="flex gap-1 mb-4 bg-[var(--nomu-input-bg)] rounded-lg p-1">
          <button
            onClick={() => setActiveTab('workflows')}
            className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'workflows'
                ? 'bg-[var(--nomu-primary)] text-white'
                : 'text-[var(--nomu-text-muted)] hover:text-[var(--nomu-text)]'
            }`}
          >
            My Workflows
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'templates'
                ? 'bg-[var(--nomu-primary)] text-white'
                : 'text-[var(--nomu-text-muted)] hover:text-[var(--nomu-text)]'
            }`}
          >
            Templates
          </button>
        </div>

        {activeTab === 'workflows' ? (
          <>
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
                  <FolderOpen size={48} className="mx-auto mb-3 text-[var(--nomu-text-muted)]" />
                  <p className="text-[var(--nomu-text-muted)]">No workflows yet</p>
                  <p className="text-sm text-[var(--nomu-text-muted)]">Create your first workflow to get started</p>
                </div>
              ) : (
                workflows.map((workflow) => (
                  <div
                    key={workflow.id}
                    className={`
                      group relative flex items-center justify-between rounded-lg border p-3 transition cursor-pointer
                      ${currentWorkflowId === workflow.id
                        ? 'border-[var(--nomu-primary)] bg-[var(--nomu-primary)]/10'
                        : 'border-[var(--nomu-border)] hover:border-[var(--nomu-border)] hover:bg-[var(--nomu-surface)]/50'}
                    `}
                    onClick={() => handleLoadWorkflow(workflow)}
                  >
                    <div className="flex-1 min-w-0">
                      {editingId === workflow.id ? (
                        <input
                          className="w-full bg-[var(--nomu-bg)] border border-[var(--nomu-primary)] rounded px-2 py-1 text-sm text-[var(--nomu-text)] focus:outline-none"
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
                            <span className="font-medium text-[var(--nomu-text)] truncate">{workflow.name}</span>
                          </div>
                          <div className="mt-1 flex items-center gap-3 text-xs text-[var(--nomu-text-muted)]">
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
                        className="rounded p-1.5 text-[var(--nomu-text-muted)] opacity-0 group-hover:opacity-100 hover:bg-[var(--nomu-surface-hover)] hover:text-[var(--nomu-text)] transition"
                      >
                        <MoreVertical size={16} />
                      </button>

                      {menuOpenId === workflow.id && (
                        <div className="absolute right-0 top-full mt-1 w-36 rounded-lg bg-[var(--nomu-surface-hover)] py-1 shadow-xl z-10">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleStartRename(workflow)
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--nomu-text)] hover:bg-[var(--nomu-surface)]"
                          >
                            <FileEdit size={14} />
                            Rename
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDuplicate(workflow.id)
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--nomu-text)] hover:bg-[var(--nomu-surface)]"
                          >
                            <Copy size={14} />
                            Duplicate
                          </button>
                          <hr className="my-1 border-[var(--nomu-border)]" />
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(workflow.id)
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-[var(--nomu-surface)]"
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
          </>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {demoWorkflows.map((demo) => {
              const Icon = getCategoryIcon(demo.category)
              return (
                <button
                  key={demo.id}
                  onClick={() => handleLoadDemo(demo.id)}
                  className="flex items-start gap-3 p-3 rounded-lg bg-[var(--nomu-surface)]/50 hover:bg-[var(--nomu-surface-hover)] border border-[var(--nomu-border)] hover:border-[var(--nomu-primary)]/50 transition-all text-left group"
                >
                  <div className="p-2 rounded-lg bg-[var(--nomu-primary)]/10 text-[var(--nomu-primary)] group-hover:bg-[var(--nomu-primary)]/20">
                    <Icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-[var(--nomu-text)]">{demo.name}</h4>
                    <p className="text-xs text-[var(--nomu-text-muted)] mt-0.5 line-clamp-2">{demo.description}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--nomu-surface-hover)] text-[var(--nomu-text-muted)]">
                        {demo.nodes.length} nodes
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={deleteConfirmId !== null}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirmId(null)}
        title="Delete Workflow"
        message="Are you sure you want to delete this workflow? This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </Modal>
  )
}
