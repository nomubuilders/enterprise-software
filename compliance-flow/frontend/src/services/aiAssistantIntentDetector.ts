import { api } from './api'

export type AssistantIntent =
  | 'build_workflow'      // User wants to create/modify workflow
  | 'explain_workflow'    // User wants info about current workflow
  | 'get_help'           // User wants tips/guidance
  | 'analyze_workflow'   // User wants workflow analysis/suggestions
  | 'general_question'   // User asking general questions

export interface IntentAnalysis {
  intent: AssistantIntent
  confidence: number
  shouldBuildWorkflow: boolean
  responseType: 'informational' | 'action'
}

/**
 * Detects user intent to determine if AI should build workflow or just provide information
 */
export class AIAssistantIntentDetector {
  private model: string = 'llama3.2'

  constructor(model?: string) {
    if (model) this.model = model
  }

  /**
   * Quick pattern-based intent detection (fast, no AI call needed)
   */
  detectIntentQuick(message: string, hasWorkflow: boolean): IntentAnalysis {
    const lower = message.toLowerCase()

    // Informational keywords - user wants info, not workflow building
    const infoKeywords = [
      'what is', 'what does', 'how does', 'explain', 'tell me about',
      'describe', 'what are', 'why', 'when should', 'which',
      'help', 'tips', 'improve', 'optimize', 'suggest', 'recommendation',
      'analyze', 'review', 'check', 'evaluate', 'assess'
    ]

    // Action keywords - user wants to build/modify workflow
    const actionKeywords = [
      'create', 'build', 'make', 'add', 'generate', 'set up',
      'configure', 'connect', 'filter', 'process', 'analyze data',
      'send', 'trigger', 'schedule'
    ]

    // Modification keywords - user wants to change existing workflow
    const modifyKeywords = [
      'fix', 'change', 'update', 'modify', 'remove', 'delete',
      'replace', 'adjust', 'edit'
    ]

    // Check for informational intent
    if (infoKeywords.some(keyword => lower.includes(keyword))) {
      return {
        intent: lower.includes('help') || lower.includes('tip') ? 'get_help' :
                lower.includes('analyze') || lower.includes('suggest') ? 'analyze_workflow' :
                'explain_workflow',
        confidence: 0.8,
        shouldBuildWorkflow: false,
        responseType: 'informational'
      }
    }

    // Check for modification intent
    if (hasWorkflow && modifyKeywords.some(keyword => lower.includes(keyword))) {
      return {
        intent: 'build_workflow',
        confidence: 0.9,
        shouldBuildWorkflow: true,
        responseType: 'action'
      }
    }

    // Check for build intent
    if (actionKeywords.some(keyword => lower.includes(keyword))) {
      return {
        intent: 'build_workflow',
        confidence: 0.85,
        shouldBuildWorkflow: true,
        responseType: 'action'
      }
    }

    // Default to general question if unclear
    return {
      intent: 'general_question',
      confidence: 0.6,
      shouldBuildWorkflow: false,
      responseType: 'informational'
    }
  }

  /**
   * Generate helpful response for informational queries
   */
  async generateHelpfulResponse(
    message: string,
    intent: AssistantIntent,
    workflowContext?: {
      nodeCount: number
      edgeCount: number
      nodeTypes: string[]
    }
  ): Promise<string> {
    const systemPrompts: Record<AssistantIntent, string> = {
      explain_workflow: `You are a workflow automation expert. The user has a workflow with ${workflowContext?.nodeCount || 0} nodes.
Explain workflow concepts clearly and concisely. Be helpful and educational.`,

      get_help: `You are a friendly AI workflow assistant. Provide practical tips and best practices for building workflows in Compliance Ready AI.
Focus on: workflow patterns, node configuration, data flow, compliance best practices, and local-first processing.`,

      analyze_workflow: `You are a workflow optimization expert. The user has ${workflowContext?.nodeCount || 0} nodes: ${workflowContext?.nodeTypes.join(', ')}.
Analyze their workflow and provide actionable suggestions for improvement, optimization, and best practices.`,

      general_question: `You are a helpful AI assistant for Compliance Ready AI. Answer questions about workflow automation, data processing, and AI integration.
Keep responses concise and actionable.`,

      build_workflow: '' // Not used for informational responses
    }

    try {
      const result = await api.chat({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: systemPrompts[intent] || systemPrompts.general_question
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      })

      return result.message?.content || 'I can help you build workflows! What would you like to create?'
    } catch (error) {
      console.error('Failed to generate helpful response:', error)
      return 'I can help you with workflow automation! Try asking me to build something specific, or ask for help.'
    }
  }
}

export const aiIntentDetector = new AIAssistantIntentDetector()
