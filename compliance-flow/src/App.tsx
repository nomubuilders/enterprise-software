import { useState, useCallback, useEffect } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import type { Node } from '@xyflow/react'
import {
  Play,
  Save,
  FolderOpen,
  Plus,
  Settings,
  Loader2,
  Square,
  Sparkles,
  Pencil,
  PencilOff,
} from 'lucide-react'
import { NomuLogo } from './components/common/NomuLogo'
import { ThemeToggle } from './components/common/ThemeToggle'
import { Sidebar } from './components/sidebar/Sidebar'
import { Canvas } from './components/canvas/Canvas'
import {
  WorkflowListModal,
  SaveWorkflowModal,
  ExecutionPanel,
} from './components/modals'
import { NodeConfigPanel } from './components/panels'
import { AIAssistantPanel } from './components/panels/AIAssistantPanel'
import { ChatInterfacePanel } from './components/panels/ChatInterfacePanel'
import { useFlowStore, useSelectedNode } from './store/flowStore'
import { useWorkflowStore } from './store/workflowStore'
import { useThemeStore } from './store/themeStore'
import { useDockerStore } from './store/dockerStore'

function App() {
  // Modal states
  const [showWorkflowList, setShowWorkflowList] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showExecutionPanel, setShowExecutionPanel] = useState(false)
  const [showAIAssistant, setShowAIAssistant] = useState(false)
  const [chatInterfaceNode, setChatInterfaceNode] = useState<Node | null>(null)

  // Store hooks
  const { nodes, edges, clearFlow, setSelectedNode, isEditMode, toggleEditMode } = useFlowStore()
  const selectedNode = useSelectedNode()
  const {
    currentWorkflowId,
    workflows,
    isRunning,
    runWorkflow,
    stopExecution,
    createWorkflow,
    saveWorkflow,
  } = useWorkflowStore()

  // Initialize theme store (ensures theme class is applied to root)
  useThemeStore()

  // Poll Docker health on mount and every 30s
  const checkDockerHealth = useDockerStore((s) => s.checkDockerHealth)
  useEffect(() => {
    checkDockerHealth()
    const interval = setInterval(checkDockerHealth, 30_000)
    return () => clearInterval(interval)
  }, [checkDockerHealth])

  const currentWorkflow = workflows.find(w => w.id === currentWorkflowId)

  // Handlers
  const handleNewFlow = useCallback(() => {
    if (nodes.length > 0) {
      if (confirm('Create a new flow? Unsaved changes will be lost.')) {
        clearFlow()
        useWorkflowStore.getState().setCurrentWorkflow(null)
      }
    } else {
      clearFlow()
      useWorkflowStore.getState().setCurrentWorkflow(null)
    }
  }, [nodes, clearFlow])

  const handleRun = useCallback(async () => {
    setShowExecutionPanel(true)

    // If no workflow exists, create one first
    let workflowId = currentWorkflowId
    if (!workflowId) {
      const workflow = createWorkflow('Untitled Workflow')
      saveWorkflow(workflow.id, nodes, edges)
      workflowId = workflow.id
    } else {
      // Save current state before running
      saveWorkflow(workflowId, nodes, edges)
    }

    await runWorkflow(workflowId)
  }, [currentWorkflowId, nodes, edges, createWorkflow, saveWorkflow, runWorkflow])

  const handleStop = useCallback(() => {
    stopExecution()
  }, [stopExecution])

  const handleCloseNodePanel = useCallback(() => {
    setSelectedNode(null)
  }, [setSelectedNode])

  // Open chat floating window (called from chat output config panel)
  const handleOpenChatWindow = useCallback(() => {
    if (selectedNode) {
      setChatInterfaceNode(selectedNode)
    }
  }, [selectedNode])

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--nomu-bg)]">
      <ReactFlowProvider>
        {/* AI Assistant Panel */}
        <AIAssistantPanel isOpen={showAIAssistant} onClose={() => setShowAIAssistant(false)} />

        <Sidebar />

        <main className="relative flex-1">
          <Canvas />

          {/* Top Bar */}
          <div className="absolute left-4 top-4 flex items-center gap-2">
            {/* Nomu Logo */}
            <NomuLogo className="h-6" />
            <div className="h-6 w-px bg-[var(--nomu-border)]" />

            {/* Workflow Name */}
            <button
              onClick={() => setShowWorkflowList(true)}
              className="flex items-center gap-2 rounded-lg bg-[var(--nomu-surface)] px-3 py-2 text-sm font-medium text-[var(--nomu-text)] transition hover:bg-[var(--nomu-surface-hover)]"
            >
              <FolderOpen size={16} />
              {currentWorkflow?.name || 'Untitled Workflow'}
            </button>

            <div className="h-6 w-px bg-[var(--nomu-border)]" />

            {/* New Flow */}
            <button
              onClick={handleNewFlow}
              className="flex items-center gap-2 rounded-lg bg-[var(--nomu-surface)] px-3 py-2 text-sm font-medium text-[var(--nomu-text)] transition hover:bg-[var(--nomu-surface-hover)]"
              title="New Flow"
            >
              <Plus size={16} />
              New
            </button>

            {/* Save */}
            <button
              onClick={() => setShowSaveModal(true)}
              className="flex items-center gap-2 rounded-lg bg-[var(--nomu-surface)] px-3 py-2 text-sm font-medium text-[var(--nomu-text)] transition hover:bg-[var(--nomu-surface-hover)]"
              title="Save Workflow"
            >
              <Save size={16} />
              Save
            </button>

            {/* Run / Stop */}
            {isRunning ? (
              <button
                onClick={handleStop}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500"
              >
                <Square size={16} />
                Stop
              </button>
            ) : (
              <button
                onClick={handleRun}
                disabled={nodes.length === 0}
                className="flex items-center gap-2 rounded-lg bg-[var(--nomu-primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--nomu-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play size={16} />
                Run
              </button>
            )}
          </div>

          {/* Right Top Bar - AI Assistant, Theme Toggle & Settings */}
          <div className="absolute right-4 top-4 flex items-center gap-2">
            <button
              onClick={() => setShowAIAssistant(!showAIAssistant)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                showAIAssistant
                  ? 'bg-[var(--nomu-primary)] text-white hover:bg-[var(--nomu-primary-hover)]'
                  : 'bg-[var(--nomu-surface)] text-[var(--nomu-text)] hover:bg-[var(--nomu-surface-hover)]'
              }`}
              title="AI Workflow Assistant"
            >
              <Sparkles size={16} />
              AI Assistant
            </button>
            <button
              onClick={toggleEditMode}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                isEditMode
                  ? 'bg-[var(--nomu-accent)] text-white hover:bg-[var(--nomu-accent)]'
                  : 'bg-[var(--nomu-surface)] text-[var(--nomu-text)] hover:bg-[var(--nomu-surface-hover)]'
              }`}
              title="Edit Mode"
            >
              {isEditMode ? <PencilOff size={16} /> : <Pencil size={16} />}
              Edit
            </button>
            <ThemeToggle />
            <button
              className="flex items-center gap-2 rounded-lg bg-[var(--nomu-surface)] p-2 text-[var(--nomu-text)] transition hover:bg-[var(--nomu-surface-hover)]"
              title="Settings"
            >
              <Settings size={18} />
            </button>
          </div>

          {/* Status Bar */}
          <div className="absolute bottom-4 right-4 flex items-center gap-4 rounded-lg bg-[var(--nomu-surface)]/80 px-4 py-2 backdrop-blur">
            {isRunning && (
              <>
                <div className="flex items-center gap-2 text-xs">
                  <Loader2 size={14} className="animate-spin text-[var(--nomu-primary)]" />
                  <span className="text-[var(--nomu-primary)]">Executing...</span>
                </div>
                <div className="h-4 w-px bg-[var(--nomu-border)]" />
              </>
            )}
            <div className="flex items-center gap-2 text-xs">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-[var(--nomu-text-muted)]">Ollama Connected</span>
            </div>
            <div className="h-4 w-px bg-[var(--nomu-border)]" />
            <div className="flex items-center gap-2 text-xs">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-[var(--nomu-text-muted)]">Local Mode</span>
            </div>
            <div className="h-4 w-px bg-[var(--nomu-border)]" />
            <div className="text-xs text-[var(--nomu-text-muted)]">
              {nodes.length} nodes · {edges.length} connections
            </div>
          </div>

          {/* Hint when no node selected */}
          {!selectedNode && nodes.length > 0 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-lg bg-[var(--nomu-surface)]/80 px-4 py-2 backdrop-blur">
              <p className="text-xs text-[var(--nomu-text-muted)]">
                Click on a node to configure it
              </p>
            </div>
          )}
        </main>

        {/* Node Configuration Panel */}
        {selectedNode && (
          <NodeConfigPanel
            node={selectedNode}
            onClose={handleCloseNodePanel}
            onRunWorkflow={handleRun}
            onOpenChat={handleOpenChatWindow}
          />
        )}

        {/* Floating Chat Interface */}
        {chatInterfaceNode && (
          <ChatInterfacePanel
            node={chatInterfaceNode}
            onClose={() => setChatInterfaceNode(null)}
          />
        )}

        {/* Modals */}
        <WorkflowListModal
          isOpen={showWorkflowList}
          onClose={() => setShowWorkflowList(false)}
        />
        <SaveWorkflowModal
          isOpen={showSaveModal}
          onClose={() => setShowSaveModal(false)}
        />
        <ExecutionPanel
          isOpen={showExecutionPanel}
          onClose={() => setShowExecutionPanel(false)}
        />
      </ReactFlowProvider>
    </div>
  )
}

export default App
