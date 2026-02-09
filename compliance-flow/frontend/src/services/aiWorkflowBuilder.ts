import type { Node, Edge } from '@xyflow/react'
import { api } from './api'

export interface WorkflowIntent {
  userMessage: string
  nodes: Array<{
    type: string
    label: string
    config: Record<string, unknown>
  }>
  edges: Array<{
    from: number
    to: number
  }>
}

/**
 * AI Workflow Builder Service
 * Analyzes user intent and automatically generates workflow nodes and connections
 */
export class AIWorkflowBuilder {
  private model: string = 'qwen3:8b'

  constructor(model?: string) {
    if (model) this.model = model
  }

  /**
   * Pre-built workflow templates for common requests (deterministic, no LLM needed)
   */
  private matchTemplate(request: string): WorkflowIntent | null {
    const lower = request.toLowerCase()

    // Legal document + database cross-check
    if (
      (lower.includes('legal') || lower.includes('document') || lower.includes('contract') || lower.includes('nda')) &&
      (lower.includes('database') || lower.includes('compliance') || lower.includes('cross-check') || lower.includes('check against'))
    ) {
      return {
        userMessage: "I'll create a workflow that reads legal documents, strips PII, queries your compliance database, and uses AI to cross-reference them.",
        nodes: [
          { type: 'triggerNode', label: 'Manual Trigger', config: { triggerType: 'manual' } },
          { type: 'documentNode', label: 'Legal Document', config: { documentType: 'legal', format: 'text' } },
          { type: 'piiFilterNode', label: 'PII Redact', config: { mode: 'redact', entities: ['EMAIL', 'PHONE', 'NAME', 'ADDRESS'] } },
          { type: 'databaseNode', label: 'Compliance DB', config: { dbType: 'postgresql', query: 'SELECT * FROM regulatory_frameworks rf JOIN compliance_obligations co ON rf.id = co.framework_id LIMIT 20', host: 'localhost', port: 5433, database: 'compliance_demo', username: 'postgres' } },
          { type: 'llmNode', label: 'AI Cross-Check Agent', config: { model: 'llama3.2:3b', systemPrompt: 'You are a compliance expert. Analyze the legal document against the regulatory data. Identify which regulations are referenced, which are missing, and flag any compliance gaps.', temperature: 0.3, maxTokens: 2048 } },
          { type: 'outputNode', label: 'Results', config: { outputType: 'chat', format: 'markdown' } },
        ],
        edges: [
          { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 4 },
          { from: 0, to: 3 }, { from: 3, to: 4 }, { from: 4, to: 5 },
        ],
      }
    }

    // Database query + AI analysis
    if (
      (lower.includes('database') || lower.includes('query') || lower.includes('sql')) &&
      (lower.includes('ai') || lower.includes('analy') || lower.includes('investigate'))
    ) {
      return {
        userMessage: "I'll create a workflow that queries your database and has AI analyze the results.",
        nodes: [
          { type: 'triggerNode', label: 'Manual Trigger', config: { triggerType: 'manual' } },
          { type: 'databaseNode', label: 'PostgreSQL Query', config: { dbType: 'postgresql', query: 'SELECT * FROM ai_systems WHERE risk_classification IN (\'high\', \'unacceptable\') ORDER BY risk_classification DESC', host: 'localhost', port: 5433, database: 'compliance_demo', username: 'postgres' } },
          { type: 'llmNode', label: 'AI Analyst', config: { model: 'llama3.2:3b', systemPrompt: 'Analyze the query results and provide actionable insights. Highlight any compliance risks or anomalies.', temperature: 0.3, maxTokens: 2048 } },
          { type: 'outputNode', label: 'Chat Output', config: { outputType: 'chat', format: 'markdown' } },
        ],
        edges: [
          { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 },
        ],
      }
    }

    // PII filtering / GDPR workflow
    if (
      (lower.includes('pii') || lower.includes('gdpr') || lower.includes('personal data') || lower.includes('redact') || lower.includes('anonymi'))
    ) {
      return {
        userMessage: "I'll create a workflow that filters personal data for GDPR compliance.",
        nodes: [
          { type: 'triggerNode', label: 'Manual Trigger', config: { triggerType: 'manual' } },
          { type: 'documentNode', label: 'Input Document', config: { documentType: 'text', format: 'text' } },
          { type: 'piiFilterNode', label: 'PII Redact', config: { mode: 'redact', entities: ['EMAIL', 'PHONE', 'SSN', 'NAME', 'ADDRESS', 'DATE_OF_BIRTH'] } },
          { type: 'outputNode', label: 'Clean Output', config: { outputType: 'chat', format: 'markdown' } },
        ],
        edges: [
          { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 },
        ],
      }
    }

    // Generic "build me a workflow" with AI
    if (lower.includes('workflow') && (lower.includes('build') || lower.includes('create') || lower.includes('make'))) {
      return {
        userMessage: "I'll create a basic AI workflow with a trigger, database, AI agent, and output.",
        nodes: [
          { type: 'triggerNode', label: 'Manual Trigger', config: { triggerType: 'manual' } },
          { type: 'databaseNode', label: 'Data Source', config: { dbType: 'postgresql', query: 'SELECT * FROM ai_systems LIMIT 10', host: 'localhost', port: 5433, database: 'compliance_demo', username: 'postgres' } },
          { type: 'llmNode', label: 'AI Agent', config: { model: 'llama3.2:3b', systemPrompt: 'Analyze the provided data and generate a concise summary with key findings.', temperature: 0.5, maxTokens: 2048 } },
          { type: 'outputNode', label: 'Results', config: { outputType: 'chat', format: 'markdown' } },
        ],
        edges: [
          { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 },
        ],
      }
    }

    return null
  }

  /**
   * Parse user request and generate workflow structure.
   * Uses LLM first for authentic AI experience, falls back to templates if LLM fails.
   */
  async buildWorkflow(userRequest: string): Promise<WorkflowIntent> {
    // Try LLM first for authentic AI generation experience
    try {
      const intent = await this.buildWithLLM(userRequest)
      return intent
    } catch (error) {
      console.warn('[AI Workflow] LLM failed, falling back to template:', error)
    }

    // Fall back to deterministic templates if LLM fails
    const template = this.matchTemplate(userRequest)
    if (template) {
      return template
    }

    throw new Error('Failed to generate workflow. Please try rephrasing your request.')
  }

  /**
   * Build workflow using the LLM
   */
  private async buildWithLLM(userRequest: string): Promise<WorkflowIntent> {
    const systemPrompt = `You are an expert workflow automation assistant for Compliance Ready AI - a local-first AI workflow builder.

Your job is to analyze user requests and generate workflows using these node types:

## Available Node Types:

1. **triggerNode** - Starts workflows
   - Types: manual (click to run), schedule (cron-based), webhook (HTTP endpoint)
   - Config: { triggerType: "manual" | "schedule" | "webhook", schedule?: string, webhookPath?: string }

2. **databaseNode** - Query databases
   - Types: postgresql, mysql, mongodb
   - Config: { dbType: string, query: string, host: string, port: number, database: string, username: string }

3. **llmNode** - AI text generation
   - Models: llama3.2, mistral, codellama
   - Config: { model: string, systemPrompt: string, temperature: number, maxTokens: number }

4. **piiFilterNode** - Filter sensitive data
   - Modes: redact (remove), mask (replace with ***)
   - Config: { mode: "redact" | "mask", entities: string[] }
   - Entities: EMAIL, PHONE, SSN, CREDIT_CARD, NAME, ADDRESS, IP_ADDRESS, DATE_OF_BIRTH

5. **outputNode** - Output results
   - Types: chat (interactive), spreadsheet (CSV/Excel), email, telegram
   - Config: { outputType: string, format?: string, destination?: string }

6. **documentNode** - Document ingestion/parsing
   - Config: { documentType: string, format: string }

## Response Format:

Respond with ONLY valid JSON, no markdown. Example:
{"userMessage":"Building a data pipeline","nodes":[{"type":"triggerNode","label":"Start","config":{"triggerType":"manual"}},{"type":"databaseNode","label":"Query","config":{"dbType":"postgresql","query":"SELECT 1","host":"localhost","port":5432,"database":"mydb","username":"postgres"}},{"type":"outputNode","label":"Output","config":{"outputType":"chat"}}],"edges":[{"from":0,"to":1},{"from":1,"to":2}]}`

    try {
      const response = await api.chat({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userRequest },
        ],
        temperature: 0.2,
        max_tokens: 3000,
      })

      const content = response.message?.content || '{}'

      // Try to extract JSON from potential markdown code blocks
      let jsonStr = content.trim()
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/```json\n?/, '').replace(/\n?```$/, '')
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```\n?/, '').replace(/\n?```$/, '')
      }

      // Try to find JSON object in the response
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        jsonStr = jsonMatch[0]
      }

      const intent = JSON.parse(jsonStr) as WorkflowIntent

      // Validate minimum structure
      if (!intent.nodes || !Array.isArray(intent.nodes) || intent.nodes.length === 0) {
        throw new Error('Invalid workflow structure')
      }

      return intent
    } catch (error) {
      console.error('Failed to parse AI response:', error)
      throw new Error('Failed to generate workflow. Please try rephrasing your request.')
    }
  }

  /**
   * Convert WorkflowIntent to React Flow nodes and edges
   */
  generateFlowElements(intent: WorkflowIntent): { nodes: Node[]; edges: Edge[] } {
    const horizontalSpacing = 280
    const startX = 100
    const startY = 200

    // Generate nodes with auto-layout
    const nodes: Node[] = intent.nodes.map((nodeIntent, index) => {
      // Simple horizontal layout with slight vertical offset for branching
      const column = index
      const x = startX + column * horizontalSpacing
      const y = startY

      return {
        id: `${nodeIntent.type}-${Date.now()}-${index}`,
        type: nodeIntent.type,
        position: { x, y },
        data: {
          label: nodeIntent.label,
          type: nodeIntent.type.replace('Node', ''),
          config: nodeIntent.config,
        },
      }
    })

    // Generate edges
    const edges: Edge[] = intent.edges.map((edge, index) => ({
      id: `edge-${Date.now()}-${index}`,
      source: nodes[edge.from].id,
      target: nodes[edge.to].id,
      animated: true,
    }))

    return { nodes, edges }
  }

  /**
   * Suggest improvements to an existing workflow
   */
  async suggestImprovements(
    nodes: Node[],
    edges: Edge[]
  ): Promise<{ suggestions: string[]; reasoning: string }> {
    const workflowDescription = this.describeWorkflow(nodes, edges)

    const systemPrompt = `You are a workflow optimization expert. Analyze workflows and suggest improvements for:
- Performance (parallel execution, caching)
- Compliance (PII filtering, data retention)
- Reliability (error handling, retries)
- Security (credential management, encryption)

Respond with JSON:
{
  "suggestions": ["suggestion 1", "suggestion 2", ...],
  "reasoning": "explanation"
}`

    try {
      const response = await api.chat({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: workflowDescription },
        ],
        temperature: 0.4,
        max_tokens: 1000,
      })

      const content = response.message?.content || '{}'
      let jsonStr = content.trim()
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/```json\n?/, '').replace(/\n?```$/, '')
      }

      return JSON.parse(jsonStr)
    } catch {
      return {
        suggestions: [],
        reasoning: 'Unable to analyze workflow at this time.',
      }
    }
  }

  private describeWorkflow(nodes: Node[], edges: Edge[]): string {
    const nodeDescriptions = nodes.map((node, i) => {
      const data = node.data as Record<string, unknown>
      return `${i}. ${node.type} (${data.label}) - Config: ${JSON.stringify(data.config)}`
    })

    const edgeDescriptions = edges.map((edge) => {
      const sourceIdx = nodes.findIndex((n) => n.id === edge.source)
      const targetIdx = nodes.findIndex((n) => n.id === edge.target)
      return `${sourceIdx} → ${targetIdx}`
    })

    return `Workflow with ${nodes.length} nodes:\n${nodeDescriptions.join('\n')}\n\nConnections:\n${edgeDescriptions.join('\n')}`
  }
}

// Export singleton instance
export const aiWorkflowBuilder = new AIWorkflowBuilder()
