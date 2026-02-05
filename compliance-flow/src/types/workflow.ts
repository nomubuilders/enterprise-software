import type { Node, Edge } from '@xyflow/react'

export interface Workflow {
  id: string
  name: string
  description?: string
  nodes: Node[]
  edges: Edge[]
  createdAt: string
  updatedAt: string
  status: 'draft' | 'saved' | 'running' | 'completed' | 'error'
}

export interface DatabaseConfig {
  id: string
  name: string
  type: 'postgresql' | 'mysql' | 'mongodb'
  host: string
  port: number
  database: string
  username: string
  password: string
  ssl: boolean
  status: 'disconnected' | 'connecting' | 'connected' | 'error'
}

export interface LLMConfig {
  id: string
  name: string
  provider: 'ollama' | 'huggingface' | 'vllm'
  model: string
  baseUrl: string
  temperature: number
  maxTokens: number
  status: 'disconnected' | 'connected' | 'error'
}

export interface WorkflowExecution {
  id: string
  workflowId: string
  status: 'pending' | 'running' | 'completed' | 'error'
  startedAt: string
  completedAt?: string
  logs: ExecutionLog[]
  results?: Record<string, unknown>
}

export interface ExecutionLog {
  timestamp: string
  nodeId: string
  nodeName: string
  level: 'info' | 'warn' | 'error'
  message: string
  data?: unknown
}

export type { DockerContainerConfig } from './docker'
