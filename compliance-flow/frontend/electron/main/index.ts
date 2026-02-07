import { app, BrowserWindow, nativeImage } from 'electron'
import { join } from 'path'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { createMainWindow } from './window-manager'
import { registerIpcHandlers } from './ipc-handlers'
import { DockerManager } from './docker-manager'
import { initAutoUpdater } from './auto-updater'
import { registerFsHandlers } from './fs-handlers'

let mainWindow: BrowserWindow | null = null
const dockerManager = new DockerManager()

app.whenReady().then(() => {
  // Set app user model id for Windows
  electronApp.setAppUserModelId('com.nomu.complianceflow')

  // Set dock icon on macOS
  if (process.platform === 'darwin' && app.dock) {
    const iconPath = join(__dirname, '../../electron/resources/icon.png')
    app.dock.setIcon(nativeImage.createFromPath(iconPath))
  }

  // Default open or close DevTools by F12 in development
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Register IPC handlers
  registerIpcHandlers(dockerManager)
  registerFsHandlers()

  // Create window
  mainWindow = createMainWindow()

  // Initialize auto-updater
  initAutoUpdater(mainWindow)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow()
    }
  })
})

// Stop Docker services on quit
app.on('before-quit', async () => {
  await dockerManager.stopServices()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
