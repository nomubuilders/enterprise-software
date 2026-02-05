export interface DockerContainerConfig {
  id: string
  name: string
  image: string
  tag: string
  command: string[]
  envVars: Record<string, string>
  volumes: VolumeMapping[]
  cpuLimit: number        // 0.25 - 4.0 cores, default 0.5
  memoryLimit: number     // 128 - 4096 MB, default 512
  timeout: number         // 30 - 3600 seconds, default 300
  networkMode: 'none' | 'internal'  // default 'none' (air-gapped)
  status: 'idle' | 'pulling' | 'running' | 'completed' | 'error'
}

export interface VolumeMapping {
  hostPath: string
  containerPath: string
  readOnly: boolean
}

export interface ApprovedImage {
  name: string
  tag: string
  sha256: string
  approvedBy: string
  approvedAt: string
  maxCpu: number
  maxMemory: number
  description?: string
}

export interface ContainerExecution {
  id: string
  nodeId: string
  workflowRunId: string
  status: 'pending' | 'pulling' | 'running' | 'completed' | 'error'
  image: string
  imageSha256: string
  command: string[]
  startedAt: string
  completedAt?: string
  exitCode?: number
  logs: string[]
  output?: Record<string, unknown>
  error?: string
  resourceUsage?: {
    cpuPercent: number
    memoryUsedMB: number
  }
}

export interface ContainerAuditLog {
  eventType: 'container_execution' | 'container_blocked' | 'image_pull'
  workflowId: string
  workflowRunId: string
  nodeId: string
  userId: string
  timestamp: string
  image: string
  imageSha256: string
  command: string[]
  resourceLimits: {
    cpu: number
    memory: string
  }
  networkMode: 'none' | 'internal'
  exitCode?: number
  duration?: string
  outputSizeBytes?: number
  blocked?: boolean
  blockReason?: string
}
