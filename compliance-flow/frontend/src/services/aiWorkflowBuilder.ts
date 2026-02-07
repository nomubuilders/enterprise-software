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
  private model: string = 'llama3.2'

  constructor(model?: string) {
    if (model) this.model = model
  }

  /**
   * Parse user request and generate workflow structure
   */
  async buildWorkflow(userRequest: string): Promise<WorkflowIntent> {
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

## Workflow Building Rules:

1. **Always start with a trigger node** - Every workflow needs exactly ONE trigger at the beginning
2. **Connect nodes logically** - Data flows from left to right (trigger → processing → output)
3. **Use PII filters for compliance** - When handling user data, add piiFilterNode before LLM
4. **Configure nodes fully** - Provide sensible defaults for all config fields
5. **Keep it simple** - Only add nodes that are necessary for the user's goal

## Response Format:

You MUST respond with ONLY a valid JSON object (no markdown, no explanation). Format:

{
  "userMessage": "Brief confirmation of what you're building",
  "nodes": [
    {
      "type": "triggerNode",
      "label": "Manual Trigger",
      "config": { "triggerType": "manual" }
    }
  ],
  "edges": [
    { "from": 0, "to": 1 }
  ]
}

## Examples:

User: "I want to analyze customer feedback from our database"
Response:
{
  "userMessage": "I'll create a workflow that queries your customer feedback database and analyzes it with AI",
  "nodes": [
    {
      "type": "triggerNode",
      "label": "Manual Trigger",
      "config": { "triggerType": "manual" }
    },
    {
      "type": "databaseNode",
      "label": "Customer Feedback DB",
      "config": {
        "dbType": "postgresql",
        "query": "SELECT * FROM customer_feedback WHERE created_at > NOW() - INTERVAL '7 days' ORDER BY created_at DESC LIMIT 100",
        "host": "localhost",
        "port": 5432,
        "database": "customer_db",
        "username": "postgres"
      }
    },
    {
      "type": "piiFilterNode",
      "label": "Remove PII",
      "config": {
        "mode": "redact",
        "entities": ["EMAIL", "PHONE", "NAME"]
      }
    },
    {
      "type": "llmNode",
      "label": "Analyze Sentiment",
      "config": {
        "model": "llama3.2",
        "systemPrompt": "Analyze the customer feedback sentiment. Categorize as positive, negative, or neutral. Identify common themes and issues.",
        "temperature": 0.3,
        "maxTokens": 2048
      }
    },
    {
      "type": "outputNode",
      "label": "Results",
      "config": {
        "outputType": "chat",
        "format": "markdown"
      }
    }
  ],
  "edges": [
    { "from": 0, "to": 1 },
    { "from": 1, "to": 2 },
    { "from": 2, "to": 3 },
    { "from": 3, "to": 4 }
  ]
}

User: "Send me an email every day with new user signups"
Response:
{
  "userMessage": "I'll create a scheduled workflow that emails you daily signup reports",
  "nodes": [
    {
      "type": "triggerNode",
      "label": "Daily at 9 AM",
      "config": {
        "triggerType": "schedule",
        "schedule": "0 9 * * *"
      }
    },
    {
      "type": "databaseNode",
      "label": "New Users",
      "config": {
        "dbType": "postgresql",
        "query": "SELECT email, name, created_at FROM users WHERE created_at >= CURRENT_DATE ORDER BY created_at DESC",
        "host": "localhost",
        "port": 5432,
        "database": "app_db",
        "username": "postgres"
      }
    },
    {
      "type": "piiFilterNode",
      "label": "Mask Emails",
      "config": {
        "mode": "mask",
        "entities": ["EMAIL"]
      }
    },
    {
      "type": "outputNode",
      "label": "Send Email",
      "config": {
        "outputType": "email",
        "format": "html",
        "destination": "admin@company.com"
      }
    }
  ],
  "edges": [
    { "from": 0, "to": 1 },
    { "from": 1, "to": 2 },
    { "from": 2, "to": 3 }
  ]
}

Now analyze this user request and respond with ONLY valid JSON:`

    try {
      const response = await api.chat({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userRequest },
        ],
        temperature: 0.2, // Low temperature for structured output
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

      const intent = JSON.parse(jsonStr) as WorkflowIntent
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
