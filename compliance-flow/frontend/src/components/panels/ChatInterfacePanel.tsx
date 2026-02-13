import { useState, useRef, useEffect, useMemo } from 'react'
import { X, Send, Loader2, MessageSquare, Database, Bot, Minimize2, Maximize2, GripHorizontal, FileText } from 'lucide-react'
import { Button } from '../common'
import { api } from '../../services/api'
import { useFlowStore } from '../../store/flowStore'
import { useWorkflowStore } from '../../store/workflowStore'
import { useDocumentStore } from '../../store/documentStore'
import ReactMarkdown from 'react-markdown'
import type { Node } from '@xyflow/react'

interface ChatInterfacePanelProps {
  node: Node
  onClose: () => void
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | null

/** Extract the config object from a node's data, returning null if absent. */
function getNodeConfig(n: Node): Record<string, unknown> | null {
  const data = n.data as Record<string, unknown> | undefined
  return (data?.config as Record<string, unknown>) ?? null
}

export function ChatInterfacePanel({ node, onClose }: ChatInterfacePanelProps) {
  const { nodes, edges } = useFlowStore()
  const workflowResults = useWorkflowStore((s) => s.currentExecution?.results as Record<string, unknown> | undefined)

  // Chat state
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Panel state
  const [isMinimized, setIsMinimized] = useState(false)
  const [position, setPosition] = useState({ x: window.innerWidth - 450, y: 100 })
  const [size, setSize] = useState({ width: 420, height: 600 })
  const isDragging = useRef(false)
  const isResizing = useRef(false)
  const resizeHandle = useRef<ResizeHandle>(null)
  const dragStart = useRef({ x: 0, y: 0, width: 420, height: 600 })
  const panelRef = useRef<HTMLDivElement>(null)

  // Find connected nodes
  const [aiAgent, setAiAgent] = useState<Node | null>(null)
  const [dataSource, setDataSource] = useState<Node | null>(null)
  const [dbSchema, setDbSchema] = useState<any[]>([])
  const [allTableData, setAllTableData] = useState<Record<string, any[]>>({})
  const [dbConnectionConfig, setDbConnectionConfig] = useState<{
    type: 'postgresql' | 'mysql' | 'mongodb'; host: string; port: number; database: string;
    username: string; password: string; ssl: boolean;
  } | null>(null)
  const [documentSources, setDocumentSources] = useState<Node[]>([])

  useEffect(() => {
    console.log('[ChatInterface] Finding connections for node:', node.id)
    console.log('[ChatInterface] Available edges:', edges)
    console.log('[ChatInterface] Available nodes:', nodes.map(n => ({ id: n.id, type: n.type })))

    // Recursively find all upstream nodes
    const findUpstreamNodes = (nodeId: string, visited = new Set<string>()): Node[] => {
      if (visited.has(nodeId)) return []
      visited.add(nodeId)

      const upstreamEdges = edges.filter((e) => e.target === nodeId)
      const upstreamNodes: Node[] = []

      for (const edge of upstreamEdges) {
        const sourceNode = nodes.find((n) => n.id === edge.source)
        if (sourceNode) {
          upstreamNodes.push(sourceNode)
          // Recursively find nodes upstream of this one
          upstreamNodes.push(...findUpstreamNodes(sourceNode.id, visited))
        }
      }

      return upstreamNodes
    }

    const upstreamNodes = findUpstreamNodes(node.id)
    console.log('[ChatInterface] All upstream nodes:', upstreamNodes.map(n => ({ id: n.id, type: n.type })))

    // Find AI Agent in upstream nodes
    const aiAgentNode = upstreamNodes.find(n => n.type === 'llmNode')
    if (aiAgentNode) {
      console.log('[ChatInterface] Found AI Agent:', aiAgentNode.id)
      setAiAgent(aiAgentNode)
    } else {
      console.log('[ChatInterface] No AI Agent found in upstream nodes')
      setAiAgent(null)
    }

    // Find Database in upstream nodes
    const dbNode = upstreamNodes.find(n => n.type === 'databaseNode')
    if (dbNode) {
      console.log('[ChatInterface] Found Database node:', dbNode.id)
      setDataSource(dbNode)
      loadDatabaseContext(dbNode)
    } else {
      console.log('[ChatInterface] No Database found in upstream nodes')
      setDataSource(null)
      setDbSchema([])
      setAllTableData({})
      setDbConnectionConfig(null)
    }

    // Find Document nodes in upstream nodes
    const docNodes = upstreamNodes.filter(n => n.type === 'documentNode')
    console.log('[ChatInterface] Found document nodes:', docNodes.length)
    setDocumentSources(docNodes)
  }, [node.id, nodes, edges])

  // Memoize document count to keep JSX readable
  const totalDocumentCount = useMemo(() => {
    return documentSources.reduce((count, n) => {
      const cfg = getNodeConfig(n)
      return count + ((cfg?.documents as string[] | undefined)?.length ?? 0)
    }, 0)
  }, [documentSources])

  const loadDatabaseContext = async (dbNode: Node) => {
    const dbConfig = getNodeConfig(dbNode)
    console.log('[ChatInterface] loadDatabaseContext called with config:', dbConfig)

    if (!dbConfig?.host || !dbConfig?.database) {
      console.error('[ChatInterface] Missing required DB config:', { host: dbConfig?.host, database: dbConfig?.database })
      return
    }

    try {
      const config = {
        type: (dbConfig.dbType as 'postgresql' | 'mysql' | 'mongodb') ?? 'postgresql',
        host: dbConfig.host as string,
        port: (dbConfig.port as number) ?? 5432,
        database: dbConfig.database as string,
        username: (dbConfig.username as string) ?? '',
        password: (dbConfig.password as string) ?? '',
        ssl: (dbConfig.ssl as boolean) ?? false,
      }

      // Save config for dynamic query execution later
      setDbConnectionConfig(config)

      console.log('[ChatInterface] Fetching tables with config:', config)
      const tablesResult = await api.listTables(config)
      console.log('[ChatInterface] Tables result:', tablesResult)

      if (tablesResult.success && tablesResult.tables) {
        setDbSchema(tablesResult.tables)
        console.log('[ChatInterface] Schema loaded:', tablesResult.tables.length, 'tables')

        // Load a small preview (3 rows per table) just for the AI to understand data types/formats
        const tableData: Record<string, any[]> = {}
        const tables = tablesResult.tables.filter((t: any) => !t.name.startsWith('v_'))
        for (const table of tables) {
          try {
            const queryResult = await api.executeQuery(config, `SELECT * FROM ${table.name} LIMIT 3`, 3)
            if (queryResult.success && queryResult.rows && queryResult.rows.length > 0) {
              tableData[table.name] = queryResult.rows
            }
          } catch (err) {
            console.warn(`[ChatInterface] ⚠️ Failed to preview ${table.name}:`, err)
          }
        }
        setAllTableData(tableData)
        console.log('[ChatInterface] Previewed', Object.keys(tableData).length, 'tables')
      } else {
        console.error('[ChatInterface] Failed to list tables:', tablesResult)
      }
    } catch (error) {
      console.error('[ChatInterface] Exception loading database context:', error)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Drag and resize handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Check if clicking a resize handle
    const target = e.target as HTMLElement
    const handle = target.getAttribute('data-resize-handle') as ResizeHandle

    if (handle) {
      isResizing.current = true
      resizeHandle.current = handle
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        width: size.width,
        height: size.height,
      }
      e.preventDefault()
      e.stopPropagation()
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return
    }

    // Otherwise handle dragging
    if (target.closest('.drag-handle')) {
      isDragging.current = true
      dragStart.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
        width: size.width,
        height: size.height,
      }
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (isResizing.current && resizeHandle.current) {
      const deltaX = e.clientX - dragStart.current.x
      const deltaY = e.clientY - dragStart.current.y

      let newWidth = size.width
      let newHeight = size.height
      let newX = position.x
      let newY = position.y

      const minWidth = 320
      const minHeight = 400

      // Handle different resize directions
      if (resizeHandle.current.includes('e')) {
        newWidth = Math.max(minWidth, dragStart.current.width + deltaX)
      }
      if (resizeHandle.current.includes('w')) {
        const tentativeWidth = dragStart.current.width - deltaX
        if (tentativeWidth >= minWidth) {
          newWidth = tentativeWidth
          newX = position.x + deltaX
        }
      }
      if (resizeHandle.current.includes('s')) {
        newHeight = Math.max(minHeight, dragStart.current.height + deltaY)
      }
      if (resizeHandle.current.includes('n')) {
        const tentativeHeight = dragStart.current.height - deltaY
        if (tentativeHeight >= minHeight) {
          newHeight = tentativeHeight
          newY = position.y + deltaY
        }
      }

      // Constrain to window bounds
      if (newX + newWidth > window.innerWidth) {
        newWidth = window.innerWidth - newX
      }
      if (newY + newHeight > window.innerHeight) {
        newHeight = window.innerHeight - newY
      }

      setSize({ width: newWidth, height: newHeight })
      if (newX !== position.x || newY !== position.y) {
        setPosition({ x: newX, y: newY })
      }
    } else if (isDragging.current) {
      const newX = Math.max(0, Math.min(e.clientX - dragStart.current.x, window.innerWidth - size.width))
      const newY = Math.max(0, Math.min(e.clientY - dragStart.current.y, window.innerHeight - size.height))
      setPosition({ x: newX, y: newY })
    }
  }

  const handleMouseUp = () => {
    isDragging.current = false
    isResizing.current = false
    resizeHandle.current = null
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  /** Convert an array of row objects to a compact markdown table */
  const rowsToMarkdownTable = (rows: any[]): string => {
    if (!rows || rows.length === 0) return '(empty)'
    const cols = Object.keys(rows[0])
    const header = `| ${cols.join(' | ')} |`
    const separator = `| ${cols.map(() => '---').join(' | ')} |`
    const dataRows = rows.map(row =>
      `| ${cols.map(c => {
        const val = row[c]
        if (val === null || val === undefined) return '-'
        const s = String(val)
        return s.length > 60 ? s.slice(0, 57) + '...' : s
      }).join(' | ')} |`
    )
    return [header, separator, ...dataRows].join('\n')
  }

  const buildSystemPrompt = () => {
    let systemPrompt = `You are a compliance data analyst with direct access to a PostgreSQL database and uploaded documents.

IMPORTANT: When you need data from the database to answer a question, write a SQL query inside a \`\`\`sql code block. The system will execute it automatically and show you the results. Then you will answer the user's question based on the actual data.

Rules:
- ALWAYS query the database when the user asks about data counts, listings, or specifics — do NOT guess
- Only write SELECT queries (no INSERT, UPDATE, DELETE)
- Write exactly ONE query per response
- After seeing query results, answer concisely using the real data
- Cross-reference database tables with document content when relevant`

    // ── 1. Database schema (AI uses this to write correct SQL) ──
    if (dbSchema.length > 0 && dataSource) {
      const dbConfig = getNodeConfig(dataSource)
      systemPrompt += `\n\n# DATABASE: ${dbConfig?.database ?? 'unknown'}`
      systemPrompt += `\n\nYou have access to ${dbSchema.length} tables. Use these to write SQL queries:\n`

      for (const table of dbSchema) {
        const cols = table.columns?.map((c: any) => `${c.name} (${c.type})`).join(', ') || 'unknown'
        systemPrompt += `\n## Table: ${table.name}\nColumns: ${cols}`

        // Show a few sample rows so the AI understands data format
        const rows = allTableData[table.name]
        if (rows && rows.length > 0) {
          systemPrompt += `\nSample (${rows.length} rows shown):\n${rowsToMarkdownTable(rows)}\n`
        }
      }
    }

    // ── 2. Workflow execution results (from last workflow run) ──
    if (workflowResults) {
      // Database query results from workflow execution (always include, even if we have table data)
      if (workflowResults.dbResult) {
        const dbRows = workflowResults.dbResult as any[]
        const dbCols = workflowResults.dbColumns as string[] | undefined
        systemPrompt += `\n\n## Workflow Query Results`
        if (dbCols) {
          systemPrompt += `\nColumns: ${dbCols.join(', ')}`
        }
        systemPrompt += `\n\`\`\`json\n${JSON.stringify(dbRows.slice(0, 30), null, 2)}\n\`\`\``
      }

      // Document text from workflow execution
      if (workflowResults.documentText) {
        systemPrompt += `\n\n## Document Text (from workflow)\n${String(workflowResults.documentText).slice(0, 4000)}`
      }

      // Document summary from workflow execution
      if (workflowResults.documentSummary) {
        const summary = workflowResults.documentSummary as { fields: Array<{ name: string; content: string }> }
        systemPrompt += `\n\n## Document Summary (from workflow)`
        for (const field of summary.fields) {
          const content = field.content.length > 3000 ? field.content.slice(0, 3000) + '...' : field.content
          systemPrompt += `\n**${field.name}**: ${content}`
        }
      }

      // Batch document summaries from workflow
      if (workflowResults.batchSummaries) {
        const batch = workflowResults.batchSummaries as Array<{ fields: Array<{ name: string; content: string }> }>
        systemPrompt += `\n\n## Batch Document Summaries (${batch.length} documents)`
        for (const [i, s] of batch.entries()) {
          systemPrompt += `\n### Document ${i + 1}`
          for (const f of s.fields) {
            systemPrompt += `\n${f.name}: ${f.content.slice(0, 1000)}`
          }
        }
      }

      // Spreadsheet data from workflow
      if (workflowResults.spreadsheetData) {
        const sd = workflowResults.spreadsheetData as { columns: string[]; rows: Record<string, unknown>[]; totalRows: number }
        systemPrompt += `\n\n## Spreadsheet Data (${sd.totalRows} rows, columns: ${sd.columns.join(', ')})\n\`\`\`json\n${JSON.stringify(sd.rows.slice(0, 20), null, 2)}\n\`\`\``
      }

      // Email messages from workflow
      if (workflowResults.emailMessages) {
        const emails = workflowResults.emailMessages as Array<{ subject?: string; sender?: string; body_text?: string; date?: string }>
        systemPrompt += `\n\n## Email Messages (${emails.length} emails)`
        for (const e of emails.slice(0, 10)) {
          systemPrompt += `\n- **${e.subject || '(no subject)'}** from ${e.sender || 'unknown'} (${e.date || ''})\n  ${(e.body_text || '').slice(0, 500)}`
        }
      }

      // PII-filtered content from workflow
      if (workflowResults.filteredResponse) {
        systemPrompt += `\n\n## Processed Content (PII-filtered)\n${String(workflowResults.filteredResponse).slice(0, 3000)}`
      }

      // Previous LLM response from workflow
      if (workflowResults.llmResponse) {
        systemPrompt += `\n\n## Previous AI Analysis\n${String(workflowResults.llmResponse).slice(0, 3000)}`
      }

      // Web search results from workflow
      if (workflowResults.webSearchResults) {
        const results = workflowResults.webSearchResults as Array<{ title: string; url: string; snippet: string }>
        systemPrompt += `\n\n## Web Search Results`
        for (const r of results) {
          systemPrompt += `\n- [${r.title}](${r.url}): ${r.snippet}`
        }
      }
    }

    // ── 3. Document context from upstream document nodes (real-time) ──
    // IMPORTANT: Skip raw documents if PII-filtered content exists from workflow.
    // Loading raw docs would leak personal data that the PII Redact node removed.
    const hasPIIFiltered = workflowResults?.filteredResponse
    if (documentSources.length > 0 && !hasPIIFiltered) {
      const { getSummaryForDocument } = useDocumentStore.getState()
      systemPrompt += `\n\n## Document Sources`

      for (const docNode of documentSources) {
        const docConfig = getNodeConfig(docNode)
        const docIds = (docConfig?.documents as string[] | undefined) ?? []
        for (const docId of docIds) {
          const summary = getSummaryForDocument(docId)
          if (!summary) continue
          systemPrompt += `\n\n### Document Summary`
          for (const field of summary.fields) {
            const content = field.content.length > 3000 ? field.content.slice(0, 3000) + '...' : field.content
            systemPrompt += `\n**${field.name}**: ${content}`
          }
        }
      }
    } else if (hasPIIFiltered) {
      console.log('[ChatInterface] Skipping raw documents — using PII-filtered content instead')
    }

    console.log('[ChatInterface] System prompt length:', systemPrompt.length, 'chars')
    return systemPrompt
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isGenerating || !aiAgent) return

    const userMessage = inputValue.trim()
    setInputValue('')
    setMessages((prev) => [...prev, { role: 'user', content: userMessage, timestamp: new Date() }])
    setIsGenerating(true)

    try {
      const agentConfig = getNodeConfig(aiAgent)
      const model = (agentConfig?.model as string) || 'llama3.2:3b'
      console.log('[ChatInterface] Using model:', model)
      const temperature = (agentConfig?.temperature as number) || 0.7
      const maxTokens = (agentConfig?.maxTokens as number) || 4096

      const systemPrompt = buildSystemPrompt()
      const chatHistory = messages.map((m) => ({ role: m.role, content: m.content }))

      // ── Step 1: Ask the AI to answer, or generate SQL if it needs data ──
      const step1Result = await api.chat({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...chatHistory,
          { role: 'user', content: userMessage },
        ],
        temperature,
        max_tokens: maxTokens,
      })

      let aiResponse = step1Result.message?.content || 'No response received'

      // ── Step 2: Check if the AI generated a SQL query to execute ──
      if (dbConnectionConfig && aiResponse.includes('```sql')) {
        const sqlMatch = aiResponse.match(/```sql\n([\s\S]*?)\n```/)
        if (sqlMatch) {
          let sql = sqlMatch[1].trim()
          console.log('[ChatInterface] AI generated SQL:', sql)

          // Safety: only allow SELECT queries
          if (sql.toUpperCase().startsWith('SELECT')) {
            try {
              const queryResult = await api.executeQuery(dbConnectionConfig, sql, 200)
              if (queryResult.success && queryResult.rows && queryResult.rows.length > 0) {
                console.log('[ChatInterface] SQL returned', queryResult.rows.length, 'rows')

                // ── Step 3: Send the results back to the AI for a proper answer ──
                const resultsTable = rowsToMarkdownTable(queryResult.rows)
                const step2Result = await api.chat({
                  model,
                  messages: [
                    { role: 'system', content: systemPrompt },
                    ...chatHistory,
                    { role: 'user', content: userMessage },
                    { role: 'assistant', content: aiResponse },
                    { role: 'user', content: `Here are the query results (${queryResult.rows.length} rows):\n\n${resultsTable}\n\nNow answer my original question using this data. Be specific and cite the actual values. Do NOT include the SQL query again.` },
                  ],
                  temperature: 0.3, // Lower temp for factual answers
                  max_tokens: maxTokens,
                })
                aiResponse = step2Result.message?.content || aiResponse
              } else if (queryResult.error) {
                console.warn('[ChatInterface] SQL query failed:', queryResult.error)
                // Let the AI know and try again
                const retryResult = await api.chat({
                  model,
                  messages: [
                    { role: 'system', content: systemPrompt },
                    ...chatHistory,
                    { role: 'user', content: userMessage },
                    { role: 'assistant', content: aiResponse },
                    { role: 'user', content: `The SQL query returned an error: ${queryResult.error}. Please fix the query and try again, or answer based on the schema preview data available to you.` },
                  ],
                  temperature: 0.3,
                  max_tokens: maxTokens,
                })
                aiResponse = retryResult.message?.content || aiResponse
              } else {
                // Query succeeded but 0 rows — tell the AI to try a different approach
                console.log('[ChatInterface] SQL returned 0 rows, asking AI to retry')
                const retryResult = await api.chat({
                  model,
                  messages: [
                    { role: 'system', content: systemPrompt },
                    ...chatHistory,
                    { role: 'user', content: userMessage },
                    { role: 'assistant', content: aiResponse },
                    { role: 'user', content: `The query returned 0 rows. This likely means the values you used don't match the actual data. Try a simpler query first (e.g. SELECT * FROM the relevant table LIMIT 10) to see the actual data format, then answer the question. Remember to check the sample data shown in the schema above for the actual column values.` },
                  ],
                  temperature: 0.3,
                  max_tokens: maxTokens,
                })
                const retryResponse = retryResult.message?.content || ''
                // Check if the retry also has SQL
                const retrySqlMatch = retryResponse.match(/```sql\n([\s\S]*?)\n```/)
                if (retrySqlMatch && retrySqlMatch[1].trim().toUpperCase().startsWith('SELECT')) {
                  try {
                    const retryQueryResult = await api.executeQuery(dbConnectionConfig, retrySqlMatch[1].trim(), 200)
                    if (retryQueryResult.success && retryQueryResult.rows && retryQueryResult.rows.length > 0) {
                      const retryTable = rowsToMarkdownTable(retryQueryResult.rows)
                      const finalResult = await api.chat({
                        model,
                        messages: [
                          { role: 'system', content: systemPrompt },
                          ...chatHistory,
                          { role: 'user', content: userMessage },
                          { role: 'user', content: `Here are the query results (${retryQueryResult.rows.length} rows):\n\n${retryTable}\n\nNow answer my original question using this data. Be specific. Do NOT include SQL.` },
                        ],
                        temperature: 0.3,
                        max_tokens: maxTokens,
                      })
                      aiResponse = finalResult.message?.content || retryResponse
                    } else {
                      aiResponse = retryResponse
                    }
                  } catch { aiResponse = retryResponse }
                } else {
                  aiResponse = retryResponse
                }
              }
            } catch (sqlError) {
              console.error('[ChatInterface] SQL execution error:', sqlError)
              aiResponse += `\n\n*Could not execute query: ${sqlError instanceof Error ? sqlError.message : 'unknown error'}*`
            }
          }
        }
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: aiResponse, timestamp: new Date() }])
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `❌ Error: ${error instanceof Error ? error.message : 'Failed to get response'}`,
          timestamp: new Date(),
        },
      ])
    }

    setIsGenerating(false)
  }

  if (isMinimized) {
    return (
      <div
        style={{ left: position.x, top: position.y }}
        className="fixed z-50 rounded-lg bg-[var(--nomu-surface)] border border-[var(--nomu-border)] shadow-2xl cursor-move"
        onMouseDown={handleMouseDown}
      >
        <div className="drag-handle flex items-center justify-between px-4 py-2 cursor-move">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-[var(--nomu-accent)]" />
            <span className="text-sm font-medium text-[var(--nomu-text)]">Chat</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(false)}
              className="p-1 text-[var(--nomu-text-muted)] hover:text-[var(--nomu-text)] transition"
            >
              <Maximize2 size={16} />
            </button>
            <button onClick={onClose} className="p-1 text-[var(--nomu-text-muted)] hover:text-[var(--nomu-text)] transition">
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={panelRef}
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
      }}
      className="fixed z-50 flex flex-col rounded-lg bg-[var(--nomu-bg)] border-2 border-[var(--nomu-border)] shadow-2xl"
      onMouseDown={handleMouseDown}
    >
      {/* Resize Handles */}
      <div
        data-resize-handle="n"
        className="absolute top-0 left-0 right-0 h-1 cursor-n-resize hover:bg-[var(--nomu-accent)]/50 transition-colors"
      />
      <div
        data-resize-handle="s"
        className="absolute bottom-0 left-0 right-0 h-1 cursor-s-resize hover:bg-[var(--nomu-accent)]/50 transition-colors"
      />
      <div
        data-resize-handle="e"
        className="absolute top-0 right-0 bottom-0 w-1 cursor-e-resize hover:bg-[var(--nomu-accent)]/50 transition-colors"
      />
      <div
        data-resize-handle="w"
        className="absolute top-0 left-0 bottom-0 w-1 cursor-w-resize hover:bg-[var(--nomu-accent)]/50 transition-colors"
      />
      <div
        data-resize-handle="ne"
        className="absolute top-0 right-0 w-3 h-3 cursor-ne-resize hover:bg-[var(--nomu-accent)]/70 transition-colors"
      />
      <div
        data-resize-handle="nw"
        className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize hover:bg-[var(--nomu-accent)]/70 transition-colors"
      />
      <div
        data-resize-handle="se"
        className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize hover:bg-[var(--nomu-accent)]/70 transition-colors"
      />
      <div
        data-resize-handle="sw"
        className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize hover:bg-[var(--nomu-accent)]/70 transition-colors"
      />
      {/* Header - Draggable */}
      <div className="drag-handle flex items-center justify-between border-b border-[var(--nomu-border)] bg-[var(--nomu-accent)]/10 px-4 py-3 cursor-move">
        <div className="flex items-center gap-2">
          <GripHorizontal size={16} className="text-[var(--nomu-text-muted)]" />
          <MessageSquare size={18} className="text-[var(--nomu-accent)]" />
          <div>
            <h3 className="text-sm font-semibold text-[var(--nomu-text)]">Chat Interface</h3>
            <p className="text-xs text-[var(--nomu-text-muted)]">Ask questions about your data</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1.5 text-[var(--nomu-text-muted)] hover:bg-[var(--nomu-surface-hover)] hover:text-[var(--nomu-text)] rounded transition"
          >
            <Minimize2 size={16} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-[var(--nomu-text-muted)] hover:bg-[var(--nomu-surface-hover)] hover:text-[var(--nomu-text)] rounded transition"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Connection Status */}
      <div className="border-b border-[var(--nomu-border)] bg-[var(--nomu-surface)]/50 px-4 py-2 space-y-1">
        {aiAgent ? (
          <div className="flex items-center gap-2 text-xs text-[var(--nomu-primary)]">
            <Bot size={12} />
            <span>
              AI Agent: <strong>{String(((aiAgent.data as Record<string, unknown>).config as Record<string, unknown>)?.model || 'llama3.2:3b')}</strong>
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-red-400">
            <Bot size={12} />
            <span>⚠️ No AI Agent connected</span>
          </div>
        )}

        {dataSource && dbSchema.length > 0 ? (
          <div className="flex items-center gap-2 text-xs text-green-400">
            <Database size={12} />
            <span>
              Data: <strong>{getNodeConfig(dataSource)?.database as string ?? 'unknown'}</strong> ({dbSchema.length} tables
              {Object.keys(allTableData).length > 0 ? `, ${Object.keys(allTableData).length} tables loaded` : ''})
            </span>
          </div>
        ) : dataSource && workflowResults?.dbResult ? (
          <div className="flex items-center gap-2 text-xs text-green-400">
            <Database size={12} />
            <span>
              Data: <strong>{getNodeConfig(dataSource)?.database as string ?? 'database'}</strong> ({(workflowResults.dbResult as any[]).length} rows from workflow)
            </span>
          </div>
        ) : dataSource ? (
          <div className="flex items-center gap-2 text-xs text-yellow-400">
            <Database size={12} />
            <span>Database connected — run workflow to load data</span>
          </div>
        ) : null}

        {documentSources.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-green-400">
            <FileText size={12} />
            <span>
              Documents: <strong>{documentSources.length} node(s)</strong>
              {' '}({totalDocumentCount} documents)
            </span>
          </div>
        )}

        {workflowResults && (
          <div className="flex items-center gap-2 text-xs text-blue-400">
            <Bot size={12} />
            <span>
              Workflow data: {[
                workflowResults.dbResult && 'DB',
                workflowResults.documentText && 'Document',
                workflowResults.documentSummary && 'Summary',
                workflowResults.spreadsheetData && 'Spreadsheet',
                workflowResults.emailMessages && 'Email',
                workflowResults.llmResponse && 'AI Analysis',
              ].filter(Boolean).join(', ') || 'loaded'}
            </span>
          </div>
        )}

        {!dataSource && documentSources.length === 0 && !workflowResults && (
          <div className="flex items-center gap-2 text-xs text-[var(--nomu-text-muted)]">
            <Database size={12} />
            <span>No data source connected</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare size={40} className="mb-3 text-[var(--nomu-border)]" />
            <p className="text-sm text-[var(--nomu-text-muted)] mb-1">Start a conversation</p>
            {aiAgent && (Object.keys(allTableData).length > 0 || documentSources.length > 0 || workflowResults) ? (
              <p className="text-xs text-green-400">✓ Ready to answer questions about your data</p>
            ) : !aiAgent ? (
              <p className="text-xs text-red-400">⚠️ Connect an AI Agent node first</p>
            ) : (
              <p className="text-xs text-yellow-400">Loading data...</p>
            )}
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 ${msg.role === 'user' ? 'bg-[var(--nomu-accent)] text-[var(--nomu-text)]' : 'bg-[var(--nomu-primary)]/10 text-[var(--nomu-text)]'
                  }`}
              >
                {msg.role === 'user' ? (
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <div className="text-sm prose prose-sm prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-code:bg-[var(--nomu-bg)] prose-code:text-orange-300 prose-code:px-1 prose-code:rounded prose-p:text-[var(--nomu-text)] prose-li:text-[var(--nomu-text)] prose-pre:bg-[var(--nomu-bg)] prose-pre:text-[var(--nomu-text)] prose-strong:text-[var(--nomu-text)]">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {isGenerating && (
          <div className="flex justify-start">
            <div className="bg-[var(--nomu-surface)] rounded-lg px-3 py-2 flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-[var(--nomu-accent)]" />
              <span className="text-sm text-[var(--nomu-text-muted)]">Thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[var(--nomu-border)] bg-[var(--nomu-surface)] p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            placeholder={aiAgent ? 'Ask a question...' : 'Connect an AI Agent first...'}
            disabled={!aiAgent || isGenerating}
            className="flex-1 rounded-lg border border-[var(--nomu-border)] bg-[var(--nomu-bg)] px-3 py-2 text-sm text-[var(--nomu-text)] placeholder-[var(--nomu-text-muted)] outline-none focus:border-[var(--nomu-accent)] focus:ring-1 focus:ring-[var(--nomu-accent)] disabled:opacity-50"
          />
          <Button
            variant="primary"
            size="sm"
            onClick={handleSendMessage}
            disabled={!aiAgent || isGenerating || !inputValue.trim()}
            className="bg-[var(--nomu-accent)] hover:bg-[var(--nomu-accent)] px-3"
          >
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </Button>
        </div>
        <div className="flex justify-between mt-2">
          <button
            onClick={() => setMessages([])}
            disabled={messages.length === 0}
            className="text-xs text-[var(--nomu-text-muted)] hover:text-[var(--nomu-text)] disabled:opacity-30"
          >
            Clear chat
          </button>
          <span className="text-xs text-[var(--nomu-border)]">{messages.length} messages</span>
        </div>
      </div>
    </div>
  )
}
