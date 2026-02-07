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
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}
