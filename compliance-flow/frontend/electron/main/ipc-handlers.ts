import { ipcMain, app } from 'electron'
import Store from 'electron-store'
import type { DockerManager } from './docker-manager'

const store = new Store<{ firstRunComplete: boolean }>({
  defaults: { firstRunComplete: false },
})

export function registerIpcHandlers(dockerManager: DockerManager): void {
  // Docker handlers
  ipcMain.handle('docker:check-installed', () => dockerManager.checkDockerInstalled())
  ipcMain.handle('docker:start-services', () => dockerManager.startServices())
  ipcMain.handle('docker:stop-services', () => dockerManager.stopServices())
  ipcMain.handle('docker:get-health', () => dockerManager.getServiceHealth())
  ipcMain.handle('docker:pull-images', () => dockerManager.pullImages())
  ipcMain.handle('docker:get-logs', (_e, service: string) => dockerManager.getServiceLogs(service))

  // App handlers
  ipcMain.handle('app:get-version', () => app.getVersion())
  ipcMain.handle('app:get-platform', () => process.platform)
  ipcMain.handle('app:is-first-run', () => !store.get('firstRunComplete'))
  ipcMain.handle('app:set-first-run-complete', () => {
    store.set('firstRunComplete', true)
  })
}
