import { useState, useRef, useEffect } from 'react'
import { X, Send, Loader2, MessageSquare, Database, Bot, Minimize2, Maximize2, GripHorizontal } from 'lucide-react'
import { Button } from '../common'
import { api } from '../../services/api'
import { useFlowStore } from '../../store/flowStore'
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

export function ChatInterfacePanel({ node, onClose }: ChatInterfacePanelProps) {
  const nodeData = node.data as Record<string, unknown>
  const { nodes, edges } = useFlowStore()

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
  const [sampleData, setSampleData] = useState<any[] | null>(null)

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
      setSampleData(null)
    }
  }, [node.id, nodes, edges])

  const loadDatabaseContext = async (dbNode: Node) => {
    const dbConfig = (dbNode.data as Record<string, unknown>).config as Record<string, unknown>
    console.log('[ChatInterface] loadDatabaseContext called with config:', dbConfig)

    if (!dbConfig?.host || !dbConfig?.database) {
      console.error('[ChatInterface] Missing required DB config:', { host: dbConfig?.host, database: dbConfig?.database })
      return
    }

    try {
      const config = {
        type: (dbConfig.dbType as 'postgresql' | 'mysql' | 'mongodb') || 'postgresql',
        host: dbConfig.host as string,
        port: (dbConfig.port as number) || 5432,
        database: dbConfig.database as string,
        username: (dbConfig.username as string) || '',
        password: (dbConfig.password as string) || '',
        ssl: (dbConfig.ssl as boolean) || false,
      }

      console.log('[ChatInterface] Fetching tables with config:', config)
      const tablesResult = await api.listTables(config)
      console.log('[ChatInterface] Tables result:', tablesResult)

      if (tablesResult.success && tablesResult.tables) {
        setDbSchema(tablesResult.tables)
        console.log('[ChatInterface] Set schema:', tablesResult.tables)

        // Load sample data
        const tableName = tablesResult.tables[0]?.name
        console.log('[ChatInterface] First table name:', tableName)

        if (tableName) {
          // Use the configured query or default to first table
          let query = (dbConfig.query as string) || `SELECT * FROM ${tableName}`
          query = query.trim().replace(/;$/, '')

          // Make sure we have a LIMIT clause
          if (!query.toLowerCase().includes('limit')) {
            query += ' LIMIT 50'
          }

          console.log('[ChatInterface] Executing query:', query)
          console.log('[ChatInterface] With config:', config)

          try {
            const queryResult = await api.executeQuery(config, query, 50)
            console.log('[ChatInterface] Query result:', queryResult)

            if (queryResult.success) {
              if (queryResult.rows && queryResult.rows.length > 0) {
                console.log('[ChatInterface] ✅ Setting sample data, row count:', queryResult.rows.length)
                setSampleData(queryResult.rows)
              } else {
                console.warn('[ChatInterface] ⚠️ Query succeeded but returned 0 rows')
                setSampleData([])
              }
            } else {
              console.error('[ChatInterface] ❌ Query failed:', queryResult.error || 'Unknown error')
            }
          } catch (queryError) {
            console.error('[ChatInterface] ❌ Exception executing query:', queryError)
          }
        } else {
          console.warn('[ChatInterface] ⚠️ No table name found in schema')
        }
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

  const buildSystemPrompt = () => {
    let systemPrompt = 'You are a helpful data analyst assistant. Answer questions about the data provided.'

    if (dbSchema.length > 0 && dataSource) {
      const dbConfig = (dataSource.data as Record<string, unknown>).config as Record<string, unknown>
      systemPrompt += `\n\n## Database: ${dbConfig.database} (${dbConfig.dbType || 'PostgreSQL'})`
      systemPrompt += `\n\n### Schema:`
      for (const table of dbSchema) {
        systemPrompt += `\n- **${table.name}**: ${table.columns?.map((c: any) => `${c.name} (${c.type})`).join(', ')}`
      }
    }

    if (sampleData && sampleData.length > 0) {
      systemPrompt += `\n\n### Sample Data (${sampleData.length} rows):\n\`\`\`json\n${JSON.stringify(sampleData.slice(0, 20), null, 2)}\n\`\`\``
    }

    return systemPrompt
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isGenerating || !aiAgent) return

    const userMessage = inputValue.trim()
    setInputValue('')
    setMessages((prev) => [...prev, { role: 'user', content: userMessage, timestamp: new Date() }])
    setIsGenerating(true)

    try {
      const agentConfig = (aiAgent.data as Record<string, unknown>).config as Record<string, unknown>
      const model = (agentConfig.model as string) || 'llama3.2'
      const temperature = (agentConfig.temperature as number) || 0.7
      const maxTokens = (agentConfig.maxTokens as number) || 2048

      const result = await api.chat({
        model,
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
          { role: 'user', content: userMessage },
        ],
        temperature,
        max_tokens: maxTokens,
      })

      const assistantContent = result.message?.content || 'No response received'
      setMessages((prev) => [...prev, { role: 'assistant', content: assistantContent, timestamp: new Date() }])
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
              AI Agent: <strong>{((aiAgent.data as Record<string, unknown>).config as Record<string, unknown>)?.model || 'llama3.2'}</strong>
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
              Data: <strong>{((dataSource.data as Record<string, unknown>).config as Record<string, unknown>)?.database as string}</strong> ({dbSchema.length} tables
              {sampleData ? `, ${sampleData.length} rows loaded` : ''})
            </span>
          </div>
        ) : dataSource ? (
          <div className="flex items-center gap-2 text-xs text-yellow-400">
            <Database size={12} />
            <span>Database connected, loading...</span>
          </div>
        ) : (
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
            {aiAgent && sampleData ? (
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
                className={`max-w-[85%] rounded-lg px-3 py-2 ${
                  msg.role === 'user' ? 'bg-[var(--nomu-accent)] text-[var(--nomu-text)]' : 'bg-[var(--nomu-primary)]/10 text-[var(--nomu-text)]'
                }`}
              >
                {msg.role === 'user' ? (
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <div className="text-sm prose prose-sm prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-code:bg-[var(--nomu-bg)] prose-code:px-1 prose-code:rounded">
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
