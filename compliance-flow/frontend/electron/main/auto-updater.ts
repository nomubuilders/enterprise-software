import { autoUpdater } from 'electron-updater'
import { ipcMain } from 'electron'
import type { BrowserWindow } from 'electron'

export function initAutoUpdater(mainWindow: BrowserWindow): void {
  // Don't auto-download — enterprise users need to approve downloads
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false

  autoUpdater.on('update-available', (info) => {
    mainWindow.webContents.send('updater:available', {
      version: info.version,
      releaseNotes: info.releaseNotes,
    })
  })

  autoUpdater.on('update-downloaded', () => {
    mainWindow.webContents.send('updater:downloaded')
  })

  // IPC handlers
  ipcMain.handle('updater:check', () => autoUpdater.checkForUpdates())
  ipcMain.handle('updater:download', () => autoUpdater.downloadUpdate())
  ipcMain.handle('updater:install', () => autoUpdater.quitAndInstall())

  // Check for updates after 5s delay
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {
      // Silently fail — offline or no releases
    })
  }, 5000)
}
