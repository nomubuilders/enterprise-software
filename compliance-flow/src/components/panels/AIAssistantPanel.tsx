import { useState, useRef, useEffect } from 'react'
import { X, Send, Sparkles, Loader2, Lightbulb, Trash2, Wand2, Eraser, GripHorizontal, Minimize2, Maximize2 } from 'lucide-react'
import { Button } from '../common'
import { aiWorkflowBuilder } from '../../services/aiWorkflowBuilder'
import { aiIntentDetector } from '../../services/aiAssistantIntentDetector'
import { useFlowStore } from '../../store/flowStore'
import ReactMarkdown from 'react-markdown'

interface AIAssistantPanelProps {
  isOpen: boolean
  onClose: () => void
}

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  intent?: string
}

type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | null

export function AIAssistantPanel({ isOpen, onClose }: AIAssistantPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'system',
      content: `👋 Hi! I'm your AI Workflow Assistant. I can help you in two ways:

**Build Workflows:**
- "Analyze customer feedback from database"
- "Send daily email reports"
- "Filter PII before AI analysis"

**Get Help & Info:**
- "What does this workflow do?"
- "How can I improve this?"
- "Tips for building workflows"
- "Explain the PII filter node"

I'll automatically detect what you need! 🧠`,
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [, setCurrentAction] = useState<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Floating window state
  const [isMinimized, setIsMinimized] = useState(false)
  const [position, setPosition] = useState({ x: 20, y: 100 })
  const [size, setSize] = useState({ width: 420, height: 600 })
  const isDragging = useRef(false)
  const isResizing = useRef(false)
  const resizeHandle = useRef<ResizeHandle>(null)
  const dragStart = useRef({ x: 0, y: 0, width: 420, height: 600 })
  const panelRef = useRef<HTMLDivElement>(null)

  const { addNode, nodes, edges, clearFlow } = useFlowStore()

  const suggestions = [
    'Analyze customer feedback from database',
    'Send daily email with new user signups',
    'Filter PII and summarize support tickets',
    'Create webhook for processing orders',
  ]

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (messageContent?: string) => {
    const userMessage = messageContent || inputValue.trim()
    if (!userMessage || isGenerating) return

    // Add user message
    const newMessage: Message = {
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, newMessage])
    setInputValue('')
    setIsGenerating(true)
    setShowSuggestions(false)

    try {
      // Detect user intent
      const intentAnalysis = aiIntentDetector.detectIntentQuick(userMessage, nodes.length > 0)
      console.log('[AI Assistant] Intent detected:', intentAnalysis)

      // If informational query, provide help without building workflow
      if (!intentAnalysis.shouldBuildWorkflow) {
        setCurrentAction(`${intentAnalysis.intent === 'get_help' ? 'Getting tips' :
                           intentAnalysis.intent === 'analyze_workflow' ? 'Analyzing workflow' :
                           intentAnalysis.intent === 'explain_workflow' ? 'Explaining' :
                           'Thinking'}...`)

        const helpResponse = await aiIntentDetector.generateHelpfulResponse(
          userMessage,
          intentAnalysis.intent,
          {
            nodeCount: nodes.length,
            edgeCount: edges.length,
            nodeTypes: [...new Set(nodes.map(n => n.type || 'unknown'))]
          }
        )

        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: helpResponse,
            timestamp: new Date(),
            intent: intentAnalysis.intent
          },
        ])
        setIsGenerating(false)
        setCurrentAction('')
        return
      }

      // Otherwise, build workflow
      setCurrentAction('Building workflow...')

      // Check if user wants to modify existing workflow
      const isModification = userMessage.toLowerCase().includes('fix') ||
                            userMessage.toLowerCase().includes('remove') ||
                            userMessage.toLowerCase().includes('change') ||
                            userMessage.toLowerCase().includes('update') ||
                            (nodes.length > 0 && userMessage.toLowerCase().includes('add'))

      // Generate workflow
      const intent = await aiWorkflowBuilder.buildWorkflow(userMessage)

      setCurrentAction('Adding nodes to canvas...')

      // Convert to flow elements
      const { nodes: newNodes, edges: newEdges } = aiWorkflowBuilder.generateFlowElements(intent)

      // If not modifying and canvas has nodes, clear it first (creating fresh workflow)
      if (!isModification && nodes.length > 0) {
        clearFlow()
      }

      // Add nodes to canvas
      newNodes.forEach((node) => addNode(node))

      // Add edges to canvas
      useFlowStore.setState((state) => ({
        edges: isModification ? [...state.edges, ...newEdges] : newEdges,
      }))

      // Add assistant response
      const clearedMessage = !isModification && nodes.length > 0 ? '\n\n🗑️ *Previous workflow cleared*' : ''
      const assistantMessage: Message = {
        role: 'assistant',
        content: `✅ **${intent.userMessage}**${clearedMessage}

I've created a workflow with ${newNodes.length} nodes:

${newNodes.map((n, i) => `${i + 1}. **${(n.data as Record<string, unknown>).label}** (${n.type})`).join('\n')}

**Next steps:**
- Click any node to configure settings
- Connect to your database in the DB node
- Click "Run" to execute the workflow`,
        timestamp: new Date(),
        intent: 'build_workflow'
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: `❌ Sorry, I couldn't build that workflow. ${error instanceof Error ? error.message : 'Please try rephrasing your request.'}`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    }

    setIsGenerating(false)
    setCurrentAction('')
  }

  const handleSuggestImprovements = async () => {
    if (nodes.length === 0) {
      const message: Message = {
        role: 'assistant',
        content: '⚠️ There are no nodes in your workflow yet. Build a workflow first, then I can suggest improvements!',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, message])
      return
    }

    setIsGenerating(true)

    try {
      const improvements = await aiWorkflowBuilder.suggestImprovements(nodes, edges)

      const message: Message = {
        role: 'assistant',
        content: `💡 **Workflow Improvement Suggestions**

${improvements.reasoning}

**Recommendations:**
${improvements.suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, message])
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: `❌ Sorry, I couldn't analyze your workflow. ${error instanceof Error ? error.message : 'Please try again.'}`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    }

    setIsGenerating(false)
  }

  const handleClearChat = () => {
    setMessages([
      {
        role: 'system',
        content: `👋 Chat cleared! Ready to build more workflows.`,
        timestamp: new Date(),
      },
    ])
    setShowSuggestions(true)
  }

  const handleClearCanvas = () => {
    if (nodes.length === 0) {
      const message: Message = {
        role: 'assistant',
        content: 'Canvas is already empty!',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, message])
      return
    }

    if (confirm(`Clear ${nodes.length} nodes from canvas?`)) {
      clearFlow()
      const message: Message = {
        role: 'assistant',
        content: '✅ Canvas cleared! You can now create a new workflow.',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, message])
    }
  }


  // Drag and resize handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    const handle = target.getAttribute("data-resize-handle") as ResizeHandle

    if (handle) {
      isResizing.current = true
      resizeHandle.current = handle
      dragStart.current = { x: e.clientX, y: e.clientY, width: size.width, height: size.height }
      e.preventDefault()
      e.stopPropagation()
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      return
    }

    if (target.closest(".drag-handle")) {
      isDragging.current = true
      dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y, width: size.width, height: size.height }
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
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

      if (resizeHandle.current.includes("e")) newWidth = Math.max(minWidth, dragStart.current.width + deltaX)
      if (resizeHandle.current.includes("w")) {
        const tentativeWidth = dragStart.current.width - deltaX
        if (tentativeWidth >= minWidth) { newWidth = tentativeWidth; newX = position.x + deltaX }
      }
      if (resizeHandle.current.includes("s")) newHeight = Math.max(minHeight, dragStart.current.height + deltaY)
      if (resizeHandle.current.includes("n")) {
        const tentativeHeight = dragStart.current.height - deltaY
        if (tentativeHeight >= minHeight) { newHeight = tentativeHeight; newY = position.y + deltaY }
      }

      if (newX + newWidth > window.innerWidth) newWidth = window.innerWidth - newX
      if (newY + newHeight > window.innerHeight) newHeight = window.innerHeight - newY

      setSize({ width: newWidth, height: newHeight })
      if (newX !== position.x || newY !== position.y) setPosition({ x: newX, y: newY })
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
    document.removeEventListener("mousemove", handleMouseMove)
    document.removeEventListener("mouseup", handleMouseUp)
  }

  if (!isOpen) return null

  if (isMinimized) {
    return (
      <div
        style={{ left: position.x, top: position.y }}
        className="fixed z-50 rounded-lg bg-[var(--nomu-surface)] border border-[var(--nomu-border)] shadow-2xl cursor-move"
        onMouseDown={handleMouseDown}
      >
        <div className="drag-handle flex items-center justify-between px-4 py-2 cursor-move">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[var(--nomu-primary)]" />
            <span className="text-sm font-medium text-[var(--nomu-text)]">AI Assistant</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setIsMinimized(false)} className="p-1 text-[var(--nomu-text-muted)] hover:text-[var(--nomu-text)] transition">
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
      style={{ left: position.x, top: position.y, width: size.width, height: size.height }}
      className="fixed z-50 flex flex-col rounded-lg bg-[var(--nomu-bg)] border-2 border-[var(--nomu-border)] shadow-2xl"
      onMouseDown={handleMouseDown}
    >
      <div data-resize-handle="n" className="absolute top-0 left-0 right-0 h-1 cursor-n-resize hover:bg-[var(--nomu-primary)]/50 transition-colors" />
      <div data-resize-handle="s" className="absolute bottom-0 left-0 right-0 h-1 cursor-s-resize hover:bg-[var(--nomu-primary)]/50 transition-colors" />
      <div data-resize-handle="e" className="absolute top-0 right-0 bottom-0 w-1 cursor-e-resize hover:bg-[var(--nomu-primary)]/50 transition-colors" />
      <div data-resize-handle="w" className="absolute top-0 left-0 bottom-0 w-1 cursor-w-resize hover:bg-[var(--nomu-primary)]/50 transition-colors" />
      <div data-resize-handle="ne" className="absolute top-0 right-0 w-3 h-3 cursor-ne-resize hover:bg-[var(--nomu-primary)]/70 transition-colors" />
      <div data-resize-handle="nw" className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize hover:bg-[var(--nomu-primary)]/70 transition-colors" />
      <div data-resize-handle="se" className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize hover:bg-[var(--nomu-primary)]/70 transition-colors" />
      <div data-resize-handle="sw" className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize hover:bg-[var(--nomu-primary)]/70 transition-colors" />
      {/* Header */}
      <div className="drag-handle flex items-center justify-between border-b border-[var(--nomu-border)] bg-[var(--nomu-primary)]/10 px-4 py-3 cursor-move">
        <div className="flex items-center gap-2">
          <GripHorizontal size={16} className="text-[var(--nomu-text-muted)]" />
          <Sparkles size={18} className="text-[var(--nomu-primary)]" />
          <div>
            <h2 className="text-sm font-semibold text-[var(--nomu-text)]">AI Assistant</h2>
            <p className="text-xs text-[var(--nomu-primary)]">Ask me anything!</p>
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 ${
                message.role === 'user'
                  ? 'bg-[var(--nomu-primary)] text-[var(--nomu-text)]'
                  : message.role === 'system'
                  ? 'bg-[var(--nomu-surface)] border border-[var(--nomu-border)] text-[var(--nomu-text-muted)]'
                  : 'bg-[var(--nomu-primary)]/10 text-[var(--nomu-text)]'
              }`}
            >
              {message.role === 'user' ? (
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              ) : (
                <div className="text-sm prose prose-sm prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-strong:text-[var(--nomu-primary)] prose-code:bg-[var(--nomu-bg)] prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-[var(--nomu-bg)] prose-pre:p-2 prose-pre:rounded prose-p:text-[var(--nomu-text)] prose-li:text-[var(--nomu-text)]">
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}

        {isGenerating && (
          <div className="flex justify-start">
            <div className="bg-[var(--nomu-surface)] rounded-lg px-3 py-2 flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-[var(--nomu-primary)]" />
              <span className="text-sm text-[var(--nomu-text-muted)]">Building workflow...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {showSuggestions && messages.length === 1 && (
        <div className="border-t border-[var(--nomu-border)] bg-[var(--nomu-surface)]/50 p-3">
          <p className="text-xs text-[var(--nomu-text-muted)] mb-2">Quick start:</p>
          <div className="space-y-1">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSendMessage(suggestion)}
                className="w-full text-left rounded-lg bg-[var(--nomu-surface)] px-3 py-2 text-xs text-[var(--nomu-text-muted)] hover:bg-[var(--nomu-surface-hover)] hover:text-[var(--nomu-text)] transition"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="border-t border-[var(--nomu-border)] bg-[var(--nomu-surface)] px-4 py-2 space-y-2">
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSuggestImprovements}
            disabled={isGenerating || nodes.length === 0}
            leftIcon={<Lightbulb size={14} />}
            className="flex-1"
          >
            Improve
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleClearCanvas}
            disabled={isGenerating || nodes.length === 0}
            leftIcon={<Eraser size={14} />}
            className="flex-1"
          >
            Clear Canvas
          </Button>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleClearChat}
          disabled={isGenerating}
          leftIcon={<Trash2 size={14} />}
          className="w-full"
        >
          Clear Chat
        </Button>
      </div>

      {/* Input */}
      <div className="border-t border-[var(--nomu-border)] bg-[var(--nomu-bg)] p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Describe the workflow you want to build..."
            className="flex-1 rounded-lg border border-[var(--nomu-border)] bg-[var(--nomu-surface)] px-3 py-2 text-sm text-[var(--nomu-text)] placeholder-[var(--nomu-text-muted)] outline-none focus:border-[var(--nomu-primary)] focus:ring-1 focus:ring-[var(--nomu-primary)]"
            disabled={isGenerating}
          />
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleSendMessage()}
            disabled={isGenerating || !inputValue.trim()}
            className="bg-[var(--nomu-primary)] hover:bg-[var(--nomu-primary-hover)] px-3"
          >
            {isGenerating ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </Button>
        </div>
        <p className="text-xs text-[var(--nomu-text-muted)] mt-2">
          <Wand2 size={12} className="inline mr-1" />
          Powered by {aiWorkflowBuilder['model'] || 'Llama 3.2'}
        </p>
      </div>
    </div>
  )
}
