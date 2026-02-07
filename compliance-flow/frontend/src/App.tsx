import { useState, useCallback, useEffect } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import type { Node } from '@xyflow/react'
import { AnimatePresence } from 'framer-motion'
import { Toaster } from 'sonner'
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
  Eraser,
  GraduationCap,
  Info,
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
import { ConfirmModal, Modal } from './components/common'
import { NodeConfigPanel } from './components/panels'
import { AIAssistantPanel } from './components/panels/AIAssistantPanel'
import { ChatInterfacePanel } from './components/panels/ChatInterfacePanel'
import { SetupWizard } from './components/electron/SetupWizard'
import { ServiceDashboard } from './components/electron/ServiceDashboard'
import { TutorialOverlay } from './components/electron/TutorialOverlay'
import { UpdateNotification } from './components/electron/UpdateNotification'
import { useFlowStore, useSelectedNode } from './store/flowStore'
import { useWorkflowStore } from './store/workflowStore'
import { useThemeStore } from './store/themeStore'
import { useDockerStore } from './store/dockerStore'
import { useElectronStore } from './store/electronStore'
import { useTutorialStore } from './store/tutorialStore'
import { isElectron, getElectronBridge } from './services/electronBridge'

function App() {
  // Modal states
  const [showWorkflowList, setShowWorkflowList] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showExecutionPanel, setShowExecutionPanel] = useState(false)
  const [showAIAssistant, setShowAIAssistant] = useState(false)
  const [chatInterfaceNode, setChatInterfaceNode] = useState<Node | null>(null)
  const [showNewFlowConfirm, setShowNewFlowConfirm] = useState(false)
  const [showClearCanvasConfirm, setShowClearCanvasConfirm] = useState(false)
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)
  const [showAboutModal, setShowAboutModal] = useState(false)

  // Setup wizard state
  const { setIsFirstRun } = useElectronStore()
  const [setupComplete, setSetupComplete] = useState(!isElectron())

  // Tutorial state
  const { isActive: tutorialActive, start: startTutorial, completed: tutorialCompleted } = useTutorialStore()

  // Check first run on mount (Electron only)
  useEffect(() => {
    const bridge = getElectronBridge()
    if (!bridge) {
      setSetupComplete(true)
      return
    }
    bridge.app.isFirstRun().then((first) => {
      setIsFirstRun(first)
      setSetupComplete(!first)
    })
  }, [setIsFirstRun])

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

  // Close settings dropdown on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showSettingsMenu) {
        setShowSettingsMenu(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showSettingsMenu])

  // Poll Docker health on mount, then with backoff when unreachable
  const checkDockerHealth = useDockerStore((s) => s.checkDockerHealth)
  const dockerAvailable = useDockerStore((s) => s.dockerAvailable)
  useEffect(() => {
    checkDockerHealth()
    // Poll every 30s when healthy, every 2min when backend is down
    const interval = setInterval(checkDockerHealth, dockerAvailable ? 30_000 : 120_000)
    return () => clearInterval(interval)
  }, [checkDockerHealth, dockerAvailable])

  const currentWorkflow = workflows.find(w => w.id === currentWorkflowId)

  // Handlers
  const handleNewFlow = useCallback(() => {
    if (nodes.length > 0) {
      setShowNewFlowConfirm(true)
    } else {
      clearFlow()
      useWorkflowStore.getState().setCurrentWorkflow(null)
    }
  }, [nodes, clearFlow])

  const handleConfirmNewFlow = useCallback(() => {
    clearFlow()
    useWorkflowStore.getState().setCurrentWorkflow(null)
    setShowNewFlowConfirm(false)
  }, [clearFlow])

  const handleClearCanvas = useCallback(() => {
    if (nodes.length > 0) {
      setShowClearCanvasConfirm(true)
    }
  }, [nodes])

  const handleConfirmClearCanvas = useCallback(() => {
    clearFlow()
    setShowClearCanvasConfirm(false)
  }, [clearFlow])

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

  // Show setup wizard for first-run Electron
  if (isElectron() && !setupComplete) {
    return <SetupWizard onComplete={() => setSetupComplete(true)} />
  }

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
              <span className="hidden lg:inline">New</span>
            </button>

            {/* Save */}
            <button
              onClick={() => setShowSaveModal(true)}
              className="flex items-center gap-2 rounded-lg bg-[var(--nomu-surface)] px-3 py-2 text-sm font-medium text-[var(--nomu-text)] transition hover:bg-[var(--nomu-surface-hover)]"
              title="Save Workflow"
            >
              <Save size={16} />
              <span className="hidden lg:inline">Save</span>
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
                data-tutorial="btn-run"
                onClick={handleRun}
                disabled={nodes.length === 0}
                className="flex items-center gap-2 rounded-lg bg-[var(--nomu-primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--nomu-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play size={16} />
                Run
              </button>
            )}
          </div>

          {/* Right Top Bar - AI Assistant, Tutorial, Theme Toggle & Settings */}
          <div className="absolute right-4 top-4 flex items-center gap-2">
            <button
              data-tutorial="btn-ai-assistant"
              onClick={() => setShowAIAssistant(!showAIAssistant)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                showAIAssistant
                  ? 'bg-[var(--nomu-primary)] text-white hover:bg-[var(--nomu-primary-hover)]'
                  : 'bg-[var(--nomu-surface)] text-[var(--nomu-text)] hover:bg-[var(--nomu-surface-hover)]'
              }`}
              title="AI Workflow Assistant"
            >
              <Sparkles size={16} />
              <span className="hidden lg:inline">AI Assistant</span>
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
              <span className="hidden lg:inline">Edit</span>
            </button>
            <button
              onClick={handleClearCanvas}
              disabled={nodes.length === 0}
              className="flex items-center gap-2 rounded-lg bg-[var(--nomu-surface)] px-3 py-2 text-sm font-medium text-[var(--nomu-text)] transition hover:bg-[var(--nomu-surface-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
              title="Clear Canvas"
            >
              <Eraser size={16} />
            </button>
            <ThemeToggle />
            <div className="relative">
              <button
                onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                className="flex items-center gap-2 rounded-lg bg-[var(--nomu-surface)] p-2 text-[var(--nomu-text)] transition hover:bg-[var(--nomu-surface-hover)]"
                title="Settings"
              >
                <Settings size={18} />
              </button>
              {showSettingsMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowSettingsMenu(false)} />
                  <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg bg-[var(--nomu-surface)] py-1 shadow-2xl ring-1 ring-[var(--nomu-border)]">
                    <button
                      onClick={() => {
                        startTutorial()
                        setShowSettingsMenu(false)
                      }}
                      disabled={tutorialActive}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--nomu-text)] transition hover:bg-[var(--nomu-surface-hover)] disabled:opacity-50"
                    >
                      <GraduationCap size={16} />
                      Start Tutorial
                    </button>
                    <button
                      onClick={() => {
                        setShowAboutModal(true)
                        setShowSettingsMenu(false)
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--nomu-text)] transition hover:bg-[var(--nomu-surface-hover)]"
                    >
                      <Info size={16} />
                      About Nomu
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Status Bar - use ServiceDashboard in Electron, default otherwise */}
          {isElectron() ? (
            <ServiceDashboard />
          ) : (
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
                {nodes.length} {nodes.length === 1 ? 'node' : 'nodes'} · {edges.length} {edges.length === 1 ? 'connection' : 'connections'}
              </div>
            </div>
          )}

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
        <AnimatePresence>
          {selectedNode && (
            <NodeConfigPanel
              node={selectedNode}
              onClose={handleCloseNodePanel}
              onRunWorkflow={handleRun}
              onOpenChat={handleOpenChatWindow}
            />
          )}
        </AnimatePresence>

        {/* Floating Chat Interface */}
        {chatInterfaceNode && (
          <ChatInterfacePanel
            node={chatInterfaceNode}
            onClose={() => setChatInterfaceNode(null)}
          />
        )}

        {/* Tutorial Overlay */}
        <TutorialOverlay />

        {/* Update Notification (Electron only) */}
        <UpdateNotification />

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

        {/* Confirm Modals */}
        <ConfirmModal
          isOpen={showNewFlowConfirm}
          onConfirm={handleConfirmNewFlow}
          onCancel={() => setShowNewFlowConfirm(false)}
          title="Create New Flow"
          message="Unsaved changes will be lost. Are you sure you want to create a new flow?"
          confirmLabel="Create New"
          variant="warning"
        />
        <ConfirmModal
          isOpen={showClearCanvasConfirm}
          onConfirm={handleConfirmClearCanvas}
          onCancel={() => setShowClearCanvasConfirm(false)}
          title="Clear Canvas"
          message={`Clear ${nodes.length} node${nodes.length !== 1 ? 's' : ''} from canvas? This cannot be undone.`}
          confirmLabel="Clear"
          variant="danger"
        />
        {/* About Modal */}
        <Modal isOpen={showAboutModal} onClose={() => setShowAboutModal(false)} title="About Nomu">
          <div className="flex flex-col items-center gap-4 py-4">
            <NomuLogo />
            <div className="text-center">
              <h3 className="font-['Barlow'] text-lg font-bold text-[var(--nomu-text)]">Compliance Ready AI</h3>
              <p className="text-sm text-[var(--nomu-text-muted)]">Version 1.0.0</p>
            </div>
            <p className="text-center text-sm text-[var(--nomu-text-muted)]">
              Local AI workflow builder for regulated industries. 100% on-premises processing with GDPR and EU AI Act compliance.
            </p>
            <div className="text-xs text-[var(--nomu-text-muted)]">
              &copy; {new Date().getFullYear()} Nomu. All rights reserved.
            </div>
          </div>
        </Modal>
      </ReactFlowProvider>
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--nomu-surface)',
            border: '1px solid var(--nomu-border)',
            color: 'var(--nomu-text)',
          },
        }}
      />
    </div>
  )
}

export default App
