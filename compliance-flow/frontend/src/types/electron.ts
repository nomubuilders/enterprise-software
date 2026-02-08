export interface ServiceHealth {
  name: string
  port: number
  status: 'running' | 'starting' | 'stopped' | 'error'
  containerId?: string
}

export interface HealthReport {
  services: ServiceHealth[]
  allHealthy: boolean
}

export interface DockerCheckResult {
  installed: boolean
  version?: string
  error?: string
}

export interface PullProgress {
  progress: number
  message: string
}

export interface LogOutput {
  service: string
  log: string
}

export interface WhisperModel {
  name: string
  fileName: string
  size: string
  sizeBytes: number
  downloaded: boolean
}

export interface TranscribeSegment {
  start: number
  end: number
  text: string
}

export interface TranscribeResult {
  text: string
  language: string
  segments: TranscribeSegment[]
}

export interface WhisperDownloadProgress {
  model: string
  progress: number
  downloadedBytes: number
  totalBytes: number
  status: 'downloading' | 'completed' | 'error'
  error?: string
}

export interface ElectronAPI {
  docker: {
    checkInstalled: () => Promise<DockerCheckResult>
    startServices: () => Promise<void>
    stopServices: () => Promise<void>
    getHealth: () => Promise<HealthReport>
    pullImages: () => Promise<void>
    getServiceLogs: (service: string) => Promise<string>
    onHealthUpdate: (callback: (health: HealthReport) => void) => () => void
    onLogOutput: (callback: (data: LogOutput) => void) => () => void
    onPullProgress: (callback: (data: PullProgress) => void) => () => void
  }
  app: {
    getVersion: () => Promise<string>
    getPlatform: () => Promise<string>
    isFirstRun: () => Promise<boolean>
    setFirstRunComplete: () => Promise<void>
  }
  updater: {
    checkForUpdates: () => Promise<void>
    downloadUpdate: () => Promise<void>
    installUpdate: () => Promise<void>
    onUpdateAvailable: (callback: (info: unknown) => void) => () => void
    onUpdateDownloaded: (callback: () => void) => () => void
  }
  whisper: {
    listModels: () => Promise<WhisperModel[]>
    getModelStatus: (modelName: string) => Promise<WhisperModel | null>
    downloadModel: (modelName: string) => Promise<void>
    cancelDownload: () => Promise<void>
    deleteModel: (modelName: string) => Promise<void>
    transcribe: (audioBase64: string, options?: { model?: string; language?: string }) => Promise<TranscribeResult>
    onDownloadProgress: (callback: (data: WhisperDownloadProgress) => void) => () => void
  }
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}
