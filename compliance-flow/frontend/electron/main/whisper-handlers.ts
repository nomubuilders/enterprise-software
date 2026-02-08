import { ipcMain } from 'electron'
import type { WhisperManager, WhisperModelSize } from './whisper-manager'

const VALID_MODELS: WhisperModelSize[] = ['tiny', 'small', 'medium', 'large-v3-turbo']

export function registerWhisperHandlers(whisperManager: WhisperManager): void {
  ipcMain.handle('whisper:list-models', () => whisperManager.getModels())

  ipcMain.handle('whisper:get-model-status', async (_e, modelName: string) => {
    const models = await whisperManager.getModels()
    return models.find((m) => m.name === modelName) ?? null
  })

  // Progress events are pushed by WhisperManager via BrowserWindow.getAllWindows()
  ipcMain.handle('whisper:download-model', (_e, modelName: string) =>
    whisperManager.downloadModel(modelName as WhisperModelSize),
  )

  ipcMain.handle('whisper:cancel-download', () => whisperManager.cancelDownload())

  ipcMain.handle('whisper:delete-model', async (_e, modelName: string) =>
    whisperManager.deleteModel(modelName as WhisperModelSize),
  )

  ipcMain.handle(
    'whisper:transcribe',
    async (_e, audioBase64: string, options?: { model?: string; language?: string }) => {
      const model = options?.model as WhisperModelSize | undefined
      if (model && !VALID_MODELS.includes(model)) {
        throw new Error(`Invalid model: "${model}". Valid: ${VALID_MODELS.join(', ')}`)
      }
      const audioBuffer = Buffer.from(audioBase64, 'base64')
      const pcmf32 = new Float32Array(audioBuffer.buffer, audioBuffer.byteOffset, audioBuffer.byteLength / 4)
      return whisperManager.transcribe(pcmf32, model, options?.language)
    },
  )
}
