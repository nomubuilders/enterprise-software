/**
 * ComplianceFlow API Client
 * Connects frontend to backend services
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

// Types
export interface DatabaseConfig {
  type: 'postgresql' | 'mysql' | 'mongodb'
  host: string
  port: number
  database: string
  username: string
  password: string
  ssl: boolean
}

export interface ConnectionTestResult {
  success: boolean
  message: string
  version?: string
  latency_ms?: number
  error?: string
}

export interface TableInfo {
  name: string
  type: string
  row_count: number
  columns: Array<{ name: string; type: string; nullable: boolean }>
}

export interface QueryResult {
  success: boolean
  rows: Record<string, unknown>[]
  row_count: number
  columns: string[]
  execution_time_ms: number
  error?: string
}

export interface LLMModel {
  name: string
  size: number
  modified_at: string
  digest: string
}

export interface GenerateRequest {
  model: string
  prompt: string
  system?: string
  temperature?: number
  max_tokens?: number
  stream?: boolean
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatRequest {
  model: string
  messages: ChatMessage[]
  temperature?: number
  max_tokens?: number
  stream?: boolean
}

export interface HealthStatus {
  status: string
  timestamp: string
  version: string
  services: {
    api: string
    ollama: {
      status: string
      models: string[]
    }
    compliance: {
      gdpr: string
      eu_ai_act: string
    }
  }
}

// API Client
class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  private async fetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.detail || `API error: ${response.status}`)
    }

    return response.json()
  }

  // Health
  async getHealth(): Promise<HealthStatus> {
    return this.fetch<HealthStatus>('/health')
  }

  async getOllamaHealth(): Promise<{
    status: string
    models: LLMModel[]
    model_count: number
  }> {
    return this.fetch('/health/ollama')
  }

  // Databases
  async testDatabaseConnection(
    config: DatabaseConfig
  ): Promise<ConnectionTestResult> {
    return this.fetch<ConnectionTestResult>('/databases/test', {
      method: 'POST',
      body: JSON.stringify(config),
    })
  }

  async listTables(
    config: DatabaseConfig
  ): Promise<{ success: boolean; tables: TableInfo[]; error?: string }> {
    return this.fetch('/databases/tables', {
      method: 'POST',
      body: JSON.stringify(config),
    })
  }

  async executeQuery(
    config: DatabaseConfig,
    query: string,
    limit: number = 100
  ): Promise<QueryResult> {
    return this.fetch<QueryResult>('/databases/query', {
      method: 'POST',
      body: JSON.stringify({ ...config, query, limit }),
    })
  }

  async getSampleData(
    config: DatabaseConfig,
    table: string,
    limit: number = 100
  ): Promise<{ success: boolean; rows: Record<string, unknown>[]; error?: string }> {
    return this.fetch(`/databases/sample?table=${table}&limit=${limit}`, {
      method: 'POST',
      body: JSON.stringify(config),
    })
  }

  // LLM
  async listModels(): Promise<{ models: LLMModel[]; count: number }> {
    return this.fetch('/llm/models')
  }

  async getModelInfo(
    modelName: string
  ): Promise<{ model: string; info: Record<string, unknown> }> {
    return this.fetch(`/llm/models/${modelName}`)
  }

  async pullModel(
    modelName: string
  ): Promise<{ model: string; status: string }> {
    return this.fetch(`/llm/models/${modelName}/pull`, { method: 'POST' })
  }

  async generate(request: GenerateRequest): Promise<{
    model: string
    response: string
    done: boolean
    total_duration?: number
    eval_count?: number
  }> {
    return this.fetch('/llm/generate', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  async *generateStream(
    request: GenerateRequest
  ): AsyncGenerator<{ response: string; done: boolean }> {
    const response = await fetch(`${this.baseUrl}/llm/generate/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') return
          try {
            yield JSON.parse(data)
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }
  }

  async chat(request: ChatRequest): Promise<{
    model: string
    message: { role: string; content: string }
    done: boolean
    total_duration?: number
  }> {
    return this.fetch('/llm/chat', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  // Workflows
  async runWorkflow(
    workflowId: string,
    parameters?: Record<string, unknown>
  ): Promise<{ execution_id: string; status: string }> {
    return this.fetch(`/workflows/${workflowId}/run`, {
      method: 'POST',
      body: JSON.stringify({ parameters }),
    })
  }

  async getExecutionStatus(
    executionId: string
  ): Promise<{ status: string; logs: unknown[]; result?: unknown }> {
    return this.fetch(`/workflows/executions/${executionId}`)
  }

  // Outputs - Spreadsheet
  async exportToCSV(
    data: Record<string, unknown>[],
    filename?: string,
    includeHeaders: boolean = true
  ): Promise<{
    success: boolean
    file_content: string
    filename: string
    mime_type: string
    row_count: number
  }> {
    return this.fetch('/outputs/spreadsheet/export/csv', {
      method: 'POST',
      body: JSON.stringify({ data, filename, include_headers: includeHeaders }),
    })
  }

  async exportToExcel(
    data: Record<string, unknown>[],
    filename?: string,
    includeHeaders: boolean = true
  ): Promise<{
    success: boolean
    file_content: string
    filename: string
    mime_type: string
    row_count: number
  }> {
    return this.fetch('/outputs/spreadsheet/export/xlsx', {
      method: 'POST',
      body: JSON.stringify({ data, filename, include_headers: includeHeaders }),
    })
  }

  // Outputs - Email
  async sendEmail(params: {
    config: {
      smtp_host: string
      smtp_port: number
      smtp_username: string
      smtp_password: string
      use_tls: boolean
    }
    to_email: string
    subject: string
    body: string
    body_type?: 'html' | 'plain'
    from_name?: string
    attachments?: Array<{ filename: string; content: string }>
  }): Promise<{
    success: boolean
    message: string
    message_id?: string
  }> {
    return this.fetch('/outputs/email/send', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  }

  async testEmailConfig(config: {
    smtp_host: string
    smtp_port: number
    smtp_username: string
    smtp_password: string
    use_tls: boolean
  }): Promise<{
    success: boolean
    message: string
  }> {
    return this.fetch('/outputs/email/test', {
      method: 'POST',
      body: JSON.stringify(config),
    })
  }

  // Outputs - Telegram
  async sendTelegramMessage(params: {
    config: {
      bot_token: string
    }
    chat_id: string
    text: string
    parse_mode?: 'Markdown' | 'HTML'
    disable_notification?: boolean
  }): Promise<{
    success: boolean
    message: string
    message_id?: number
  }> {
    return this.fetch('/outputs/telegram/send', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  }

  async testTelegramConfig(config: {
    bot_token: string
  }): Promise<{
    success: boolean
    message: string
  }> {
    return this.fetch('/outputs/telegram/test', {
      method: 'POST',
      body: JSON.stringify(config),
    })
  }
}

// Export singleton instance
export const api = new ApiClient()

// Export class for custom instances
export { ApiClient }
