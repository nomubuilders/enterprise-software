/**
 * Docker Container API Client
 * Frontend service for Docker container orchestration
 */

import type { ContainerExecution, ApprovedImage } from '../types/docker'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

export interface DockerHealthStatus {
  available: boolean
  version?: string
  apiVersion?: string
  runtime: 'docker' | 'podman' | 'unknown'
  error?: string
}

export interface ExecuteContainerRequest {
  image: string
  tag: string
  command: string[]
  envVars: Record<string, string>
  cpuLimit: number
  memoryLimit: number
  timeout: number
  networkMode: 'none' | 'internal'
  inputData?: Record<string, unknown>
  nodeId: string
  workflowRunId: string
  runtime?: 'docker' | 'podman' | 'remote'
  runtimeConfig?: {
    socketPath?: string
    remoteHost?: string
    tlsVerify?: boolean
  }
  securityProfile?: {
    user: string
    privileged: boolean
    capDrop: string[]
    readonlyRootfs: boolean
    noNewPrivileges: boolean
    pidMode: string
    ipcMode: string
    tmpfs: Record<string, string>
  }
}

export interface ExecuteContainerResponse {
  executionId: string
  containerId: string
  status: string
}

export interface ContainerLogEntry {
  timestamp: string
  stream: 'stdout' | 'stderr'
  message: string
}

class DockerApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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
      throw new Error(error.detail || `Docker API error: ${response.status}`)
    }

    return response.json()
  }

  // Health check
  async checkHealth(): Promise<DockerHealthStatus> {
    try {
      return await this.fetch<DockerHealthStatus>('/docker/status')
    } catch {
      return { available: false, runtime: 'unknown', error: 'Docker daemon unreachable' }
    }
  }

  // Image management
  async listApprovedImages(): Promise<ApprovedImage[]> {
    return this.fetch<ApprovedImage[]>('/docker/images')
  }

  // Container execution
  async executeContainer(request: ExecuteContainerRequest): Promise<ExecuteContainerResponse> {
    return this.fetch<ExecuteContainerResponse>('/docker/execute', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  // Log streaming via SSE
  streamLogs(containerId: string, onLog: (entry: ContainerLogEntry) => void, onDone: () => void): () => void {
    const url = `${this.baseUrl}/docker/logs/${containerId}`
    const eventSource = new EventSource(url)

    eventSource.onmessage = (event) => {
      try {
        const entry = JSON.parse(event.data) as ContainerLogEntry
        onLog(entry)
      } catch {
        // Skip unparseable messages
      }
    }

    eventSource.addEventListener('done', () => {
      eventSource.close()
      onDone()
    })

    eventSource.onerror = () => {
      eventSource.close()
      onDone()
    }

    // Return cleanup function
    return () => eventSource.close()
  }

  // Container status
  async getContainerStatus(containerId: string): Promise<ContainerExecution> {
    return this.fetch<ContainerExecution>(`/docker/status/${containerId}`)
  }

  // Stop container
  async stopContainer(containerId: string): Promise<{ success: boolean; message: string }> {
    return this.fetch(`/docker/stop/${containerId}`, { method: 'POST' })
  }
}

// Export singleton instance
export const dockerApi = new DockerApiClient()

// Export class for custom instances
export { DockerApiClient }
