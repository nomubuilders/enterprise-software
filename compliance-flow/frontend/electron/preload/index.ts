import { contextBridge, ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'

const electronAPI = {
  // Docker management
  docker: {
    checkInstalled: () => ipcRenderer.invoke('docker:check-installed'),
    startServices: () => ipcRenderer.invoke('docker:start-services'),
    stopServices: () => ipcRenderer.invoke('docker:stop-services'),
    getHealth: () => ipcRenderer.invoke('docker:get-health'),
    pullImages: () => ipcRenderer.invoke('docker:pull-images'),
    getServiceLogs: (service: string) => ipcRenderer.invoke('docker:get-logs', service),
    onHealthUpdate: (callback: (health: unknown) => void) => {
      const handler = (_event: IpcRendererEvent, data: unknown) => callback(data)
      ipcRenderer.on('docker:health-update', handler)
      return () => ipcRenderer.removeListener('docker:health-update', handler)
    },
    onLogOutput: (callback: (data: { service: string; log: string }) => void) => {
      const handler = (_event: IpcRendererEvent, data: { service: string; log: string }) => callback(data)
      ipcRenderer.on('docker:log-output', handler)
      return () => ipcRenderer.removeListener('docker:log-output', handler)
    },
    onPullProgress: (callback: (data: { progress: number; message: string }) => void) => {
      const handler = (_event: IpcRendererEvent, data: { progress: number; message: string }) => callback(data)
      ipcRenderer.on('docker:pull-progress', handler)
      return () => ipcRenderer.removeListener('docker:pull-progress', handler)
    },
  },

  // App info
  app: {
    getVersion: () => ipcRenderer.invoke('app:get-version'),
    getPlatform: () => ipcRenderer.invoke('app:get-platform'),
    isFirstRun: () => ipcRenderer.invoke('app:is-first-run'),
    setFirstRunComplete: () => ipcRenderer.invoke('app:set-first-run-complete'),
  },

  // Filesystem operations (Database Creator & Local Folder Storage nodes)
  filesystem: {
    selectFolder: () => ipcRenderer.invoke('fs:select-folder'),
    selectDatabasePath: () => ipcRenderer.invoke('fs:select-database-path'),
    listFiles: (folderPath: string, pattern: string, recursive: boolean) =>
      ipcRenderer.invoke('fs:list-files', folderPath, pattern, recursive),
    readFile: (filePath: string) => ipcRenderer.invoke('fs:read-file', filePath),
    writeFile: (filePath: string, content: string) => ipcRenderer.invoke('fs:write-file', filePath, content),
    checkExists: (filePath: string) => ipcRenderer.invoke('fs:check-exists', filePath),
  },

  // Auto-updater
  updater: {
    checkForUpdates: () => ipcRenderer.invoke('updater:check'),
    downloadUpdate: () => ipcRenderer.invoke('updater:download'),
    installUpdate: () => ipcRenderer.invoke('updater:install'),
    onUpdateAvailable: (callback: (info: unknown) => void) => {
      const handler = (_event: IpcRendererEvent, data: unknown) => callback(data)
      ipcRenderer.on('updater:available', handler)
      return () => ipcRenderer.removeListener('updater:available', handler)
    },
    onUpdateDownloaded: (callback: () => void) => {
      const handler = () => callback()
      ipcRenderer.on('updater:downloaded', handler)
      return () => ipcRenderer.removeListener('updater:downloaded', handler)
    },
  },
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

export type ElectronAPI = typeof electronAPI
