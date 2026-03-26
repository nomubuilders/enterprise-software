import { ipcMain, dialog, BrowserWindow } from 'electron'
import { readdir, readFile, writeFile, stat } from 'fs/promises'
import { join, extname, normalize, resolve, dirname } from 'path'

/** Directories the user has explicitly selected via native dialogs. */
const allowedBasePaths = new Set<string>()

/** Validate a path is within a user-selected directory. */
function assertPathAllowed(targetPath: string): string {
  const resolved = resolve(normalize(targetPath))
  for (const base of allowedBasePaths) {
    if (resolved.startsWith(base + '/') || resolved === base) return resolved
  }
  throw new Error('Access denied: path not within an allowed directory. Select a folder first.')
}

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
    const selected = result.filePaths[0] || ''
    if (!result.canceled && selected) {
      allowedBasePaths.add(resolve(normalize(selected)))
    }
    return { canceled: result.canceled, path: selected }
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
    const selected = result.filePath || ''
    if (!result.canceled && selected) {
      allowedBasePaths.add(resolve(normalize(dirname(selected))))
    }
    return { canceled: result.canceled, path: selected }
  })

  // List files in a folder with optional pattern filtering
  ipcMain.handle('fs:list-files', async (_e, folderPath: string, pattern: string, recursive: boolean) => {
    assertPathAllowed(folderPath)
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
          if (extensions.length === 0 || extensions.some((filterExt) => ext === filterExt || filterExt === '')) {
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
    assertPathAllowed(filePath)
    return readFile(filePath, 'utf-8')
  })

  // Write content to a file
  ipcMain.handle('fs:write-file', async (_e, filePath: string, content: string) => {
    assertPathAllowed(filePath)
    await writeFile(filePath, content, 'utf-8')
    return { success: true, path: filePath }
  })

  // Check if a file/database exists
  ipcMain.handle('fs:check-exists', async (_e, filePath: string) => {
    assertPathAllowed(filePath)
    try {
      await stat(filePath)
      return true
    } catch {
      return false
    }
  })
}
