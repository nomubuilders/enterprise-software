import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Node, Edge } from '@xyflow/react'
import type { Workflow, DatabaseConfig, WorkflowExecution } from '../types'
import type { DocumentSummary } from '../types/document'
import { toast } from 'sonner'
import { api } from '../services/api'
import { dockerApi } from '../services/dockerApi'
import { useFlowStore } from './flowStore'
import { useDocumentStore } from './documentStore'
import { summarizeDocument, summarizeBatch, searchDocuments } from '../services/summarizationService'

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
        toast.success('Workflow saved')
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

        const updateDockerNodeConfig = (nodeId: string, updates: Record<string, unknown>) => {
          const flowState = useFlowStore.getState()
          const currentNode = flowState.nodes.find(n => n.id === nodeId)
          if (currentNode) {
            const currentConfig = (currentNode.data as { config?: Record<string, unknown> }).config || {}
            flowState.updateNodeData(nodeId, { config: { ...currentConfig, ...updates } })
          }
        }

        // Store workflow context data
        let workflowData: Record<string, unknown> = {}

        try {
          // Reset all Docker nodes to idle before execution
          for (const node of workflow.nodes) {
            if (node.type === 'dockerContainerNode') {
              updateDockerNodeConfig(node.id, { status: 'idle', containerId: null })
            }
          }

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

                // Build prompt with context from all previous nodes
                let prompt = systemPrompt + '\n\n'
                const contextParts: string[] = []
                if (workflowData.dbResult) {
                  contextParts.push(`Database query results:\n${JSON.stringify(workflowData.dbResult, null, 2).slice(0, 2000)}`)
                }
                if (workflowData.containerOutput) {
                  contextParts.push(`Docker container output:\n${String(workflowData.containerOutput).slice(0, 2000)}`)
                }
                if (workflowData.containerExitCode !== undefined) {
                  contextParts.push(`Docker container exit code: ${workflowData.containerExitCode}`)
                }
                if (workflowData.filteredResponse) {
                  contextParts.push(`PII-filtered content:\n${String(workflowData.filteredResponse).slice(0, 2000)}`)
                }
                if (workflowData.llmResponse) {
                  contextParts.push(`Previous AI response:\n${String(workflowData.llmResponse).slice(0, 2000)}`)
                }
                if (workflowData.documentText) {
                  contextParts.push(`Document text:\n${String(workflowData.documentText).slice(0, 3000)}`)
                }
                if (workflowData.documentSummary) {
                  const summary = workflowData.documentSummary as DocumentSummary
                  const summaryText = summary.fields.map(f => `## ${f.name}\n${f.content}`).join('\n\n')
                  contextParts.push(`Document summary:\n${summaryText.slice(0, 3000)}`)
                }
                if (workflowData.batchSummaries) {
                  const batch = workflowData.batchSummaries as DocumentSummary[]
                  const batchText = batch.map((s, i) =>
                    `### Document ${i + 1}\n${s.fields.map(f => `${f.name}: ${f.content}`).join('\n')}`
                  ).join('\n\n')
                  contextParts.push(`Batch document summaries:\n${batchText.slice(0, 3000)}`)
                }
                if (workflowData.searchResults) {
                  const results = workflowData.searchResults as Array<{ documentName: string; summaryText: string; score: number }>
                  const searchText = results.map(r =>
                    `${r.documentName} (relevance: ${(r.score * 100).toFixed(1)}%):\n${r.summaryText}`
                  ).join('\n\n')
                  contextParts.push(`Document search results:\n${searchText.slice(0, 3000)}`)
                }
                if (contextParts.length > 0) {
                  prompt += 'Context from previous workflow steps:\n\n' + contextParts.join('\n\n') + '\n\n'
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
              else if (node.type === 'dockerContainerNode') {
                const image = config.image as string
                const tag = (config.tag as string) || 'latest'

                if (!image) {
                  addLog(node.id, nodeName, 'warn', 'Docker container not configured - skipping')
                } else {
                  addLog(node.id, nodeName, 'info', `Starting Docker container ${image}:${tag}...`)

                  try {
                    const result = await dockerApi.executeContainer({
                      image,
                      tag,
                      command: (config.command as string[]) || [],
                      envVars: (config.envVars as Record<string, string>) || {},
                      cpuLimit: (config.cpuLimit as number) || 0.5,
                      memoryLimit: (config.memoryLimit as number) || 512,
                      timeout: (config.timeout as number) || 300,
                      networkMode: (config.networkMode as 'none' | 'internal') || 'none',
                      inputData: workflowData,
                      nodeId: node.id,
                      workflowRunId: execution.id,
                    })

                    addLog(node.id, nodeName, 'info', `Container started (${result.executionId})`)
                    updateDockerNodeConfig(node.id, { status: 'running', containerId: result.executionId })

                    // Poll for completion
                    const timeoutMs = ((config.timeout as number) || 300) * 1000 + 10_000
                    const deadline = Date.now() + timeoutMs
                    let containerStatus = result.status

                    while (containerStatus !== 'completed' && containerStatus !== 'error' && Date.now() < deadline) {
                      await new Promise(r => setTimeout(r, 2000))
                      const status = await dockerApi.getContainerStatus(result.executionId)
                      containerStatus = status.status

                      if (status.status === 'completed') {
                        workflowData.containerOutput = status.output
                        workflowData.containerExitCode = status.exitCode
                        addLog(node.id, nodeName, status.exitCode === 0 ? 'info' : 'warn',
                          `Container exited with code ${status.exitCode}`, { output: status.output })
                        updateDockerNodeConfig(node.id, { status: status.exitCode === 0 ? 'completed' : 'error' })
                      } else if (status.status === 'error') {
                        addLog(node.id, nodeName, 'error', `Container error: ${status.error}`)
                        updateDockerNodeConfig(node.id, { status: 'error' })
                      }
                    }

                    if (Date.now() >= deadline && containerStatus !== 'completed' && containerStatus !== 'error') {
                      addLog(node.id, nodeName, 'warn', 'Container polling timed out - execution may still be running')
                    }
                  } catch (err) {
                    addLog(node.id, nodeName, 'error',
                      `Docker execution failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
                    updateDockerNodeConfig(node.id, { status: 'error' })
                  }
                }
              }
              else if (node.type === 'documentNode') {
                const docMode = (config.mode as string) || 'summarize'
                const templateId = config.templateId as string
                const docChunkSize = (config.chunkSize as number) || 20000
                const documentIds = (config.documents as string[]) || []
                const docStore = useDocumentStore.getState()

                addLog(node.id, nodeName, 'info', 'Processing document...')

                try {
                  if (docMode === 'summarize') {
                    // Get the most recent document or the one specified in config
                    const targetDocId = documentIds.length > 0
                      ? documentIds[documentIds.length - 1]
                      : docStore.documents.length > 0
                        ? docStore.documents[docStore.documents.length - 1].id
                        : null

                    if (!targetDocId) {
                      addLog(node.id, nodeName, 'warn', 'No documents available for summarization')
                    } else if (!templateId) {
                      addLog(node.id, nodeName, 'warn', 'No template selected - skipping summarization')
                    } else {
                      const template = docStore.templates.find(t => t.id === templateId)
                      const templateName = template?.name || templateId
                      addLog(node.id, nodeName, 'info', `Summarizing with template: ${templateName}...`)

                      const doc = docStore.documents.find(d => d.id === targetDocId)
                      if (doc) {
                        workflowData.documentText = doc.extractedText
                      }

                      const summary = await summarizeDocument(targetDocId, templateId, 'llama3.2', docChunkSize)
                      workflowData.documentSummary = summary
                      addLog(node.id, nodeName, 'info', 'Summary complete', {
                        fields: summary.fields.length,
                        documentId: targetDocId,
                      })
                    }
                  } else if (docMode === 'batch') {
                    const batchDocIds = documentIds.length > 0
                      ? documentIds
                      : docStore.documents.map(d => d.id)

                    if (batchDocIds.length === 0) {
                      addLog(node.id, nodeName, 'warn', 'No documents available for batch processing')
                    } else if (!templateId) {
                      addLog(node.id, nodeName, 'warn', 'No template selected - skipping batch processing')
                    } else {
                      addLog(node.id, nodeName, 'info', `Batch processing ${batchDocIds.length} documents...`)

                      const batchResult = await summarizeBatch(
                        batchDocIds,
                        templateId,
                        'llama3.2',
                        docChunkSize,
                        (completed, total, _docId, status) => {
                          addLog(node.id, nodeName, 'info', `Batch progress: ${completed}/${total} (${status})`)
                        }
                      )

                      workflowData.batchSummaries = batchResult.results
                      if (batchResult.errors.length > 0) {
                        addLog(node.id, nodeName, 'warn', `Batch completed with ${batchResult.errors.length} error(s)`, {
                          errors: batchResult.errors,
                        })
                      }
                      addLog(node.id, nodeName, 'info', `Batch complete: ${batchResult.results.length} summaries generated`)
                    }
                  } else if (docMode === 'search') {
                    const searchQuery = (config.searchQuery as string) || ''

                    if (!searchQuery) {
                      addLog(node.id, nodeName, 'warn', 'No search query provided')
                    } else {
                      addLog(node.id, nodeName, 'info', 'Searching documents...')

                      const results = await searchDocuments(searchQuery)
                      workflowData.searchResults = results
                      addLog(node.id, nodeName, 'info', `Search complete: ${results.length} results found`, {
                        topScore: results.length > 0 ? results[0].score : 0,
                      })
                    }
                  }
                } catch (err) {
                  addLog(node.id, nodeName, 'error',
                    `Document processing failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
                }
              }
              else if (node.type === 'outputNode') {
                const outputType = config.outputType as string || 'chat'

                // Build finalOutput with document summary awareness
                if (workflowData.documentSummary) {
                  const summary = workflowData.documentSummary as DocumentSummary
                  const formattedSummary = summary.fields
                    .map(f => `## ${f.name}\n${f.content}`)
                    .join('\n\n')
                  workflowData.finalOutput = workflowData.filteredResponse
                    || workflowData.llmResponse
                    || formattedSummary
                } else {
                  workflowData.finalOutput = workflowData.filteredResponse
                    || workflowData.llmResponse
                    || workflowData.dbResult
                }

                addLog(node.id, nodeName, 'info', `Output ready (${outputType})`, {
                  hasData: !!workflowData.finalOutput
                })

                // Execute output based on type
                if (outputType === 'email' && config.smtpHost && config.toEmail) {
                  try {
                    addLog(node.id, nodeName, 'info', 'Sending email...')
                    let body: string
                    if (workflowData.documentSummary && !workflowData.llmResponse && !workflowData.filteredResponse) {
                      const summary = workflowData.documentSummary as DocumentSummary
                      body = summary.fields
                        .map(f => `<h2>${f.name}</h2><p>${f.content.replace(/\n/g, '<br/>')}</p>`)
                        .join('\n')
                    } else {
                      body = typeof workflowData.finalOutput === 'string'
                        ? workflowData.finalOutput
                        : JSON.stringify(workflowData.finalOutput, null, 2)
                    }
                    const result = await api.sendEmail({
                      config: {
                        smtp_host: config.smtpHost as string,
                        smtp_port: (config.smtpPort as number) || 587,
                        smtp_username: (config.smtpUsername as string) || '',
                        smtp_password: (config.smtpPassword as string) || '',
                        use_tls: (config.useTls as boolean) ?? true,
                      },
                      to_email: config.toEmail as string,
                      subject: (config.subject as string) || 'Workflow Results',
                      body,
                      body_type: (config.bodyType as 'html' | 'plain') || 'html',
                      from_name: (config.fromName as string) || undefined,
                    })
                    addLog(node.id, nodeName, result.success ? 'info' : 'error', result.message)
                  } catch (err) {
                    addLog(node.id, nodeName, 'error', `Email send failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
                  }
                }

                if (outputType === 'spreadsheet' && (workflowData.finalOutput || workflowData.batchSummaries)) {
                  try {
                    const fileFormat = (config.fileFormat as string) || 'csv'
                    let dataArray: Record<string, unknown>[]

                    if (workflowData.batchSummaries) {
                      // Create one row per document with template field columns
                      const batch = workflowData.batchSummaries as DocumentSummary[]
                      dataArray = batch.map(summary => {
                        const row: Record<string, unknown> = { documentId: summary.documentId }
                        for (const field of summary.fields) {
                          row[field.name] = field.content
                        }
                        return row
                      })
                    } else if (Array.isArray(workflowData.finalOutput)) {
                      dataArray = workflowData.finalOutput
                    } else {
                      dataArray = [{ result: workflowData.finalOutput }]
                    }

                    const filenameTemplate = (config.filename as string) || 'output-{timestamp}'
                    const fname = filenameTemplate.replace('{timestamp}', new Date().toISOString().slice(0, 19).replace(/:/g, '-'))
                    addLog(node.id, nodeName, 'info', `Exporting as ${fileFormat.toUpperCase()}...`)

                    const result = fileFormat === 'xlsx'
                      ? await api.exportToExcel(dataArray, fname, (config.includeHeaders as boolean) ?? true)
                      : await api.exportToCSV(dataArray, fname, (config.includeHeaders as boolean) ?? true)

                    if (result.success && result.file_content) {
                      // Trigger browser download
                      const blob = new Blob([atob(result.file_content)], { type: result.mime_type })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = result.filename
                      a.click()
                      URL.revokeObjectURL(url)
                      addLog(node.id, nodeName, 'info', `Exported ${result.row_count} rows to ${result.filename}`)
                    }
                  } catch (err) {
                    addLog(node.id, nodeName, 'error', `Spreadsheet export failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
                  }
                }

                if (outputType === 'telegram' && config.botToken && config.chatId) {
                  try {
                    addLog(node.id, nodeName, 'info', 'Sending Telegram message...')
                    const template = (config.messageTemplate as string) || '{output}'
                    const outputText = typeof workflowData.finalOutput === 'string'
                      ? workflowData.finalOutput
                      : JSON.stringify(workflowData.finalOutput, null, 2)
                    const text = template.replace('{output}', outputText)
                    const result = await api.sendTelegramMessage({
                      config: { bot_token: config.botToken as string },
                      chat_id: config.chatId as string,
                      text,
                      parse_mode: (config.parseMode as 'Markdown' | 'HTML') || 'Markdown',
                      disable_notification: (config.disableNotification as boolean) || false,
                    })
                    addLog(node.id, nodeName, result.success ? 'info' : 'error', result.message)
                  } catch (err) {
                    addLog(node.id, nodeName, 'error', `Telegram send failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
                  }
                }
                // Chat output: finalOutput is already stored for ChatInterfacePanel to consume
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
          toast.success('Workflow completed')
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
          toast.error('Workflow failed')
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
