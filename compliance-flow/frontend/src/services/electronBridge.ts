import type { ElectronAPI } from '../types/electron'

/**
 * Returns the Electron API if running inside Electron, null otherwise.
 * All consumer code should check: if (electronBridge) { ... }
 */
export function getElectronBridge(): ElectronAPI | null {
  return window.electronAPI ?? null
}

export function isElectron(): boolean {
  return window.electronAPI !== undefined
}
