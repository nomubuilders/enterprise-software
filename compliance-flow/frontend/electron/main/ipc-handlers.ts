import { ipcMain, app, BrowserWindow } from 'electron'
import Store from 'electron-store'
import http from 'http'
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

  // Ollama model handlers
  ipcMain.handle('ollama:list-models', () => {
    return new Promise((resolve) => {
      http.get('http://localhost:11434/api/tags', (res) => {
        let data = ''
        res.on('data', (chunk) => { data += chunk })
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data)
            resolve(parsed.models?.map((m: { name: string }) => m.name) || [])
          } catch {
            resolve([])
          }
        })
      }).on('error', () => resolve([]))
    })
  })

  ipcMain.handle('ollama:pull-model', (_e, modelName: string) => {
    const win = BrowserWindow.getAllWindows()[0]
    return new Promise<void>((resolve, reject) => {
      const postData = JSON.stringify({ name: modelName })
      const req = http.request({
        hostname: 'localhost',
        port: 11434,
        path: '/api/pull',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }, (res) => {
        let buffer = ''
        res.on('data', (chunk) => {
          buffer += chunk.toString()
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''
          for (const line of lines) {
            if (!line.trim()) continue
            try {
              const status = JSON.parse(line)
              const total = status.total || 0
              const completed = status.completed || 0
              const pct = total > 0 ? Math.round((completed / total) * 100) : 0
              if (win) {
                win.webContents.send('ollama:pull-progress', {
                  progress: pct,
                  message: status.status || 'Downloading...',
                })
              }
            } catch { /* ignore parse errors on partial lines */ }
          }
        })
        res.on('end', () => {
          if (win) {
            win.webContents.send('ollama:pull-progress', { progress: 100, message: 'Model ready' })
          }
          resolve()
        })
      })
      req.on('error', (err) => reject(err))
      req.write(postData)
      req.end()
    })
  })

  // App handlers
  ipcMain.handle('app:get-version', () => app.getVersion())
  ipcMain.handle('app:get-platform', () => process.platform)
  ipcMain.handle('app:is-first-run', () => !store.get('firstRunComplete'))
  ipcMain.handle('app:set-first-run-complete', () => {
    store.set('firstRunComplete', true)
  })
}
