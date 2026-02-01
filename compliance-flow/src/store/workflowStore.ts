import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Node, Edge } from '@xyflow/react'
import type { Workflow, DatabaseConfig, WorkflowExecution } from '../types'
import { api } from '../services/api'

interface WorkflowState {
  // Workflows
  workflows: Workflow[]
  currentWorkflowId: string | null

  // Database Configs
  databaseConfigs: DatabaseConfig[]

  // Execution
  currentExecution: WorkflowExecution | null
  executionHistory: WorkflowExecution[]

  // UI State
  isRunning: boolean
  isSaving: boolean

  // Workflow Actions
  createWorkflow: (name: string, description?: string) => Workflow
  saveWorkflow: (id: string, nodes: Node[], edges: Edge[]) => void
  deleteWorkflow: (id: string) => void
  loadWorkflow: (id: string) => Workflow | null
  duplicateWorkflow: (id: string) => Workflow
  renameWorkflow: (id: string, name: string) => void
  setCurrentWorkflow: (id: string | null) => void

  // Database Config Actions
  addDatabaseConfig: (config: Omit<DatabaseConfig, 'id' | 'status'>) => DatabaseConfig
  updateDatabaseConfig: (id: string, config: Partial<DatabaseConfig>) => void
  deleteDatabaseConfig: (id: string) => void
  testDatabaseConnection: (id: string) => Promise<boolean>

  // Execution Actions
  runWorkflow: (workflowId: string) => Promise<void>
  stopExecution: () => void
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set, get) => ({
      workflows: [],
      currentWorkflowId: null,
      databaseConfigs: [],
      currentExecution: null,
      executionHistory: [],
      isRunning: false,
      isSaving: false,

      // Workflow Actions
      createWorkflow: (name, description) => {
        const workflow: Workflow = {
          id: generateId(),
          name,
          description,
          nodes: [],
          edges: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'draft',
        }
        set({
          workflows: [...get().workflows, workflow],
          currentWorkflowId: workflow.id,
        })
        return workflow
      },

      saveWorkflow: (id, nodes, edges) => {
        set({ isSaving: true })
        const workflows = get().workflows.map((w) =>
          w.id === id
            ? { ...w, nodes, edges, updatedAt: new Date().toISOString(), status: 'saved' as const }
            : w
        )

        // If workflow doesn't exist, create it
        const exists = get().workflows.find(w => w.id === id)
        if (!exists) {
          const newWorkflow: Workflow = {
            id,
            name: 'Untitled Workflow',
            nodes,
            edges,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'saved',
          }
          set({ workflows: [...get().workflows, newWorkflow], isSaving: false })
        } else {
          set({ workflows, isSaving: false })
        }
      },

      deleteWorkflow: (id) => {
        const workflows = get().workflows.filter((w) => w.id !== id)
        const currentWorkflowId = get().currentWorkflowId === id ? null : get().currentWorkflowId
        set({ workflows, currentWorkflowId })
      },

      loadWorkflow: (id) => {
        const workflow = get().workflows.find((w) => w.id === id)
        if (workflow) {
          set({ currentWorkflowId: id })
        }
        return workflow || null
      },

      duplicateWorkflow: (id) => {
        const original = get().workflows.find((w) => w.id === id)
        if (!original) throw new Error('Workflow not found')

        const duplicate: Workflow = {
          ...original,
          id: generateId(),
          name: `${original.name} (Copy)`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'draft',
        }
        set({ workflows: [...get().workflows, duplicate] })
        return duplicate
      },

      renameWorkflow: (id, name) => {
        const workflows = get().workflows.map((w) =>
          w.id === id ? { ...w, name, updatedAt: new Date().toISOString() } : w
        )
        set({ workflows })
      },

      setCurrentWorkflow: (id) => {
        set({ currentWorkflowId: id })
      },

      // Database Config Actions
      addDatabaseConfig: (config) => {
        const dbConfig: DatabaseConfig = {
          ...config,
          id: generateId(),
          status: 'disconnected',
        }
        set({ databaseConfigs: [...get().databaseConfigs, dbConfig] })
        return dbConfig
      },

      updateDatabaseConfig: (id, config) => {
        const databaseConfigs = get().databaseConfigs.map((c) =>
          c.id === id ? { ...c, ...config } : c
        )
        set({ databaseConfigs })
      },

      deleteDatabaseConfig: (id) => {
        const databaseConfigs = get().databaseConfigs.filter((c) => c.id !== id)
        set({ databaseConfigs })
      },

      testDatabaseConnection: async (id) => {
        const config = get().databaseConfigs.find((c) => c.id === id)
        if (!config) return false

        // Update status to connecting
        get().updateDatabaseConfig(id, { status: 'connecting' })

        // Simulate connection test (will be replaced with real backend call)
        await new Promise((resolve) => setTimeout(resolve, 1500))

        // For now, simulate success
        const success = Math.random() > 0.2 // 80% success rate for demo
        get().updateDatabaseConfig(id, { status: success ? 'connected' : 'error' })

        return success
      },

      // Execution Actions
      runWorkflow: async (workflowId) => {
        const workflow = get().workflows.find((w) => w.id === workflowId)
        if (!workflow) throw new Error('Workflow not found')

        const execution: WorkflowExecution = {
          id: generateId(),
          workflowId,
          status: 'running',
          startedAt: new Date().toISOString(),
          logs: [],
        }

        set({
          currentExecution: execution,
          isRunning: true,
          workflows: get().workflows.map(w =>
            w.id === workflowId ? { ...w, status: 'running' as const } : w
          ),
        })

        const addLog = (nodeId: string, nodeName: string, level: 'info' | 'error' | 'warn', message: string, data?: unknown) => {
          const log = {
            timestamp: new Date().toISOString(),
            nodeId,
            nodeName,
            level,
            message,
            data,
          }
          set({
            currentExecution: {
              ...get().currentExecution!,
              logs: [...get().currentExecution!.logs, log],
            },
          })
        }

        // Store workflow context data
        let workflowData: Record<string, unknown> = {}

        try {
          // Execute nodes in order based on edges (simplified - assumes linear flow)
          for (const node of workflow.nodes) {
            const nodeData = node.data as { label?: string; config?: Record<string, unknown>; type?: string }
            const nodeName = nodeData.label || node.id
            const config = nodeData.config || {}

            try {
              if (node.type === 'triggerNode') {
                addLog(node.id, nodeName, 'info', 'Workflow triggered')
                await new Promise(r => setTimeout(r, 300))
              }
              else if (node.type === 'databaseNode') {
                addLog(node.id, nodeName, 'info', 'Executing database query...')

                if (config.host && config.database && config.query) {
                  try {
                    const result = await api.executeQuery(
                      {
                        type: (config.dbType as 'postgresql' | 'mysql' | 'mongodb') || 'postgresql',
                        host: config.host as string,
                        port: config.port as number || 5432,
                        database: config.database as string,
                        username: config.username as string || '',
                        password: config.password as string || '',
                        ssl: config.ssl as boolean || false,
                      },
                      config.query as string,
                      100
                    )

                    if (result.success) {
                      workflowData.dbResult = result.rows
                      workflowData.dbColumns = result.columns
                      addLog(node.id, nodeName, 'info', `Query returned ${result.row_count} rows`, {
                        rowCount: result.row_count,
                        columns: result.columns
                      })
                    } else {
                      addLog(node.id, nodeName, 'error', `Query failed: ${result.error}`)
                    }
                  } catch (err) {
                    addLog(node.id, nodeName, 'warn', `Database not configured or connection failed`)
                  }
                } else {
                  addLog(node.id, nodeName, 'warn', 'Database not configured - skipping')
                }
              }
              else if (node.type === 'llmNode') {
                addLog(node.id, nodeName, 'info', 'Processing with LLM...')

                const model = config.model as string || 'llama3.2'
                const systemPrompt = config.systemPrompt as string || 'You are a helpful assistant.'

                // Build prompt with context from previous nodes
                let prompt = systemPrompt + '\n\n'
                if (workflowData.dbResult) {
                  prompt += `Data from database:\n${JSON.stringify(workflowData.dbResult, null, 2).slice(0, 2000)}\n\n`
                }
                prompt += 'Please analyze this data and provide insights.'

                try {
                  const result = await api.generate({
                    model,
                    prompt,
                    temperature: (config.temperature as number) || 0.7,
                    max_tokens: (config.maxTokens as number) || 2048,
                  })

                  workflowData.llmResponse = result.response
                  addLog(node.id, nodeName, 'info', 'LLM processing complete', {
                    responseLength: result.response?.length || 0
                  })
                } catch (err) {
                  addLog(node.id, nodeName, 'warn', `LLM processing skipped: ${err instanceof Error ? err.message : 'Unknown error'}`)
                }
              }
              else if (node.type === 'piiFilterNode') {
                addLog(node.id, nodeName, 'info', 'Applying PII filter...')

                // Simple PII filter simulation (real implementation would use backend)
                const mode = config.mode as string || 'redact'
                const entities = config.entities as string[] || ['EMAIL', 'PHONE']

                if (workflowData.llmResponse) {
                  let filtered = workflowData.llmResponse as string
                  // Simple regex-based filtering
                  if (entities.includes('EMAIL')) {
                    filtered = filtered.replace(/\b[\w.-]+@[\w.-]+\.\w+\b/gi, mode === 'redact' ? '[EMAIL]' : '****@****.***')
                  }
                  if (entities.includes('PHONE')) {
                    filtered = filtered.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, mode === 'redact' ? '[PHONE]' : '***-***-****')
                  }
                  workflowData.filteredResponse = filtered
                  addLog(node.id, nodeName, 'info', `PII filter applied (${mode} mode)`, { entities })
                } else {
                  addLog(node.id, nodeName, 'info', 'No content to filter')
                }
              }
              else if (node.type === 'outputNode') {
                const outputType = config.outputType as string || 'chat'
                addLog(node.id, nodeName, 'info', `Output ready (${outputType})`, {
                  hasData: !!workflowData.filteredResponse || !!workflowData.llmResponse || !!workflowData.dbResult
                })

                // Store final output
                workflowData.finalOutput = workflowData.filteredResponse || workflowData.llmResponse || workflowData.dbResult
              }
              else {
                addLog(node.id, nodeName, 'info', `Executed node: ${nodeName}`)
                await new Promise(r => setTimeout(r, 200))
              }
            } catch (nodeError) {
              addLog(node.id, nodeName, 'error', `Node execution failed: ${nodeError instanceof Error ? nodeError.message : 'Unknown error'}`)
            }
          }

          // Complete execution
          const completedExecution: WorkflowExecution = {
            ...get().currentExecution!,
            status: 'completed',
            completedAt: new Date().toISOString(),
            results: workflowData,
          }

          set({
            currentExecution: completedExecution,
            executionHistory: [...get().executionHistory, completedExecution],
            isRunning: false,
            workflows: get().workflows.map(w =>
              w.id === workflowId ? { ...w, status: 'completed' as const } : w
            ),
          })
        } catch (error) {
          const errorExecution: WorkflowExecution = {
            ...get().currentExecution!,
            status: 'error',
            completedAt: new Date().toISOString(),
            logs: [
              ...get().currentExecution!.logs,
              {
                timestamp: new Date().toISOString(),
                nodeId: 'system',
                nodeName: 'System',
                level: 'error',
                message: `Workflow failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ],
          }
          set({
            currentExecution: errorExecution,
            executionHistory: [...get().executionHistory, errorExecution],
            isRunning: false,
          })
        }
      },

      stopExecution: () => {
        if (get().currentExecution) {
          const stoppedExecution: WorkflowExecution = {
            ...get().currentExecution!,
            status: 'error',
            completedAt: new Date().toISOString(),
            logs: [
              ...get().currentExecution!.logs,
              {
                timestamp: new Date().toISOString(),
                nodeId: 'system',
                nodeName: 'System',
                level: 'warn',
                message: 'Execution stopped by user',
              },
            ],
          }
          set({
            currentExecution: stoppedExecution,
            executionHistory: [...get().executionHistory, stoppedExecution],
            isRunning: false,
          })
        }
      },
    }),
    {
      name: 'compliance-workflow-storage',
      partialize: (state) => ({
        workflows: state.workflows,
        databaseConfigs: state.databaseConfigs,
        executionHistory: state.executionHistory,
      }),
    }
  )
)
