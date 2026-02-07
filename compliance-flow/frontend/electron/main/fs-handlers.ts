import { ipcMain, dialog, BrowserWindow } from 'electron'
import { readdir, readFile, writeFile, stat } from 'fs/promises'
import { join, extname } from 'path'

/**
 * Register filesystem IPC handlers for Database Creator and Local Folder Storage nodes.
 * All operations go through Electron's secure IPC layer with context isolation.
 */
export function registerFsHandlers(): void {
  // Select a folder via native dialog
  ipcMain.handle('fs:select-folder', async () => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return { canceled: true, path: '' }
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
    })
    return { canceled: result.canceled, path: result.filePaths[0] || '' }
  })

  // Select a database file path via native save dialog
  ipcMain.handle('fs:select-database-path', async () => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return { canceled: true, path: '' }
    const result = await dialog.showSaveDialog(win, {
      title: 'Create Database',
      filters: [
        { name: 'SQLite Database', extensions: ['db', 'sqlite', 'sqlite3'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    })
    return { canceled: result.canceled, path: result.filePath || '' }
  })

  // List files in a folder with optional pattern filtering
  ipcMain.handle('fs:list-files', async (_e, folderPath: string, pattern: string, recursive: boolean) => {
    const files: { name: string; path: string; size: number; modified: string }[] = []
    const extensions = pattern
      ? pattern.split(',').map((p) => p.trim().replace('*', '').toLowerCase())
      : []

    async function walk(dir: string) {
      const entries = await readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = join(dir, entry.name)
        if (entry.isDirectory() && recursive) {
          await walk(fullPath)
        } else if (entry.isFile()) {
          const ext = extname(entry.name).toLowerCase()
          if (extensions.length === 0 || extensions.some((e) => ext === e || e === '')) {
            const info = await stat(fullPath)
            files.push({
              name: entry.name,
              path: fullPath,
              size: info.size,
              modified: info.mtime.toISOString(),
            })
          }
        }
      }
    }

    await walk(folderPath)
    return files
  })

  // Read a file's content
  ipcMain.handle('fs:read-file', async (_e, filePath: string) => {
    const content = await readFile(filePath, 'utf-8')
    return content
  })

  // Write content to a file
  ipcMain.handle('fs:write-file', async (_e, filePath: string, content: string) => {
    await writeFile(filePath, content, 'utf-8')
    return { success: true, path: filePath }
  })

  // Check if a file/database exists
  ipcMain.handle('fs:check-exists', async (_e, filePath: string) => {
    try {
      await stat(filePath)
      return true
    } catch {
      return false
    }
  })
}
