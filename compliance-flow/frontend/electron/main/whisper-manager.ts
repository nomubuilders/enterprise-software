import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, unlinkSync, renameSync, statSync, createWriteStream } from 'fs'
import { get as httpsGet } from 'https'
import type { IncomingMessage } from 'http'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WhisperModelSize = 'tiny' | 'small' | 'medium' | 'large-v3-turbo'

export interface WhisperModelInfo {
  name: WhisperModelSize
  fileName: string
  size: string
  sizeBytes: number
  downloaded: boolean
}

export interface TranscribeSegment {
  start: number
  end: number
  text: string
}

export interface TranscribeResult {
  text: string
  language: string
  segments: TranscribeSegment[]
}

export interface DownloadProgress {
  model: WhisperModelSize
  progress: number
  downloadedBytes: number
  totalBytes: number
  status: 'downloading' | 'completed' | 'error'
  error?: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HF_BASE = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main'

const MODEL_CATALOG: Record<WhisperModelSize, { fileName: string; size: string; sizeBytes: number }> = {
  tiny: { fileName: 'ggml-tiny.bin', size: '75 MB', sizeBytes: 77_700_000 },
  small: { fileName: 'ggml-small.bin', size: '466 MB', sizeBytes: 488_000_000 },
  medium: { fileName: 'ggml-medium.bin', size: '1.5 GB', sizeBytes: 1_530_000_000 },
  'large-v3-turbo': { fileName: 'ggml-large-v3-turbo.bin', size: '1.6 GB', sizeBytes: 1_620_000_000 },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse a whisper timestamp string like "00:01:23.456" into seconds. */
function parseTimestamp(ts: string): number {
  if (!ts || typeof ts !== 'string') return 0
  const parts = ts.replace(/[\[\]]/g, '').split(':')
  if (parts.length === 3) {
    return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2])
  }
  if (parts.length === 2) {
    return parseFloat(parts[0]) * 60 + parseFloat(parts[1])
  }
  return parseFloat(ts) || 0
}

// ---------------------------------------------------------------------------
// WhisperManager
// ---------------------------------------------------------------------------

export class WhisperManager {
  private modelsDir: string
  private loadedModel: WhisperModelSize | null = null
  private transcribeFn: ((opts: Record<string, unknown>) => Promise<{ transcription: string[][] | string[] }>) | null = null
  private downloading: WhisperModelSize | null = null
  private abortController: AbortController | null = null

  constructor() {
    this.modelsDir = join(app.getPath('userData'), 'whisper-models')
    if (!existsSync(this.modelsDir)) {
      mkdirSync(this.modelsDir, { recursive: true })
    }
  }

  // -----------------------------------------------------------------------
  // Addon loading
  // -----------------------------------------------------------------------

  private loadAddon(): void {
    if (this.transcribeFn) return
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { transcribe } = require('@kutalia/whisper-node-addon')
      this.transcribeFn = transcribe
    } catch (err) {
      throw new Error(
        `Failed to load @kutalia/whisper-node-addon: ${err instanceof Error ? err.message : err}`
      )
    }
  }

  // -----------------------------------------------------------------------
  // Model directory helpers
  // -----------------------------------------------------------------------

  private modelPath(size: WhisperModelSize): string {
    return join(this.modelsDir, MODEL_CATALOG[size].fileName)
  }

  private isModelDownloaded(size: WhisperModelSize): boolean {
    const p = this.modelPath(size)
    if (!existsSync(p)) return false
    const stat = statSync(p)
    // Accept if file is at least 90% of expected size (accounts for slight variance)
    return stat.size >= MODEL_CATALOG[size].sizeBytes * 0.9
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /** List all supported models with download status. */
  async getModels(): Promise<WhisperModelInfo[]> {
    return (Object.entries(MODEL_CATALOG) as [WhisperModelSize, (typeof MODEL_CATALOG)[WhisperModelSize]][]).map(
      ([name, info]) => ({
        name,
        fileName: info.fileName,
        size: info.size,
        sizeBytes: info.sizeBytes,
        downloaded: this.isModelDownloaded(name),
      })
    )
  }

  /** Alias for getModels (matches architect contract). */
  async listModels(): Promise<WhisperModelInfo[]> {
    return this.getModels()
  }

  /** Return currently loaded model (or null). */
  getLoadedModel(): WhisperModelSize | null {
    return this.loadedModel
  }

  /** Download a model from Hugging Face with progress reporting. */
  async downloadModel(size: WhisperModelSize): Promise<void> {
    if (this.downloading) {
      throw new Error(`Already downloading model: ${this.downloading}`)
    }
    if (this.isModelDownloaded(size)) return

    const info = MODEL_CATALOG[size]
    if (!info) throw new Error(`Unknown model size: ${size}`)

    const url = `${HF_BASE}/${info.fileName}`
    const dest = this.modelPath(size)
    const partDest = `${dest}.part`

    this.downloading = size
    this.abortController = new AbortController()

    try {
      await this.httpDownload(url, partDest, size, info.sizeBytes)
      renameSync(partDest, dest)
      this.broadcastProgress({ model: size, progress: 100, downloadedBytes: info.sizeBytes, totalBytes: info.sizeBytes, status: 'completed' })
    } catch (err) {
      if (existsSync(partDest)) unlinkSync(partDest)
      this.broadcastProgress({ model: size, progress: 0, downloadedBytes: 0, totalBytes: info.sizeBytes, status: 'error', error: err instanceof Error ? err.message : String(err) })
      throw err
    } finally {
      this.downloading = null
      this.abortController = null
    }
  }

  /** Cancel an in-progress download. */
  cancelDownload(): void {
    if (this.abortController) {
      this.abortController.abort()
    }
  }

  /** Delete a downloaded model from disk. */
  async deleteModel(size: WhisperModelSize): Promise<void> {
    if (this.loadedModel === size) {
      this.loadedModel = null
    }
    const p = this.modelPath(size)
    if (existsSync(p)) unlinkSync(p)
  }

  /**
   * Transcribe audio from a PCM Float32 buffer (16 kHz mono).
   * Model must be downloaded first via downloadModel().
   */
  async transcribe(
    pcmf32: Float32Array,
    model: WhisperModelSize = 'small',
    language = 'en'
  ): Promise<TranscribeResult> {
    this.loadAddon()
    if (!this.transcribeFn) throw new Error('Whisper addon not loaded')

    if (!this.isModelDownloaded(model)) {
      throw new Error(`Model "${model}" not downloaded. Call downloadModel() first.`)
    }

    this.loadedModel = model

    const result = await this.transcribeFn({
      pcmf32,
      model: this.modelPath(model),
      language,
      use_gpu: true,
      no_prints: true,
    })

    return this.normalizeResult(result, language)
  }

  /**
   * Transcribe audio from a file path.
   */
  async transcribeFile(
    filePath: string,
    model: WhisperModelSize = 'small',
    language = 'en'
  ): Promise<TranscribeResult> {
    this.loadAddon()
    if (!this.transcribeFn) throw new Error('Whisper addon not loaded')

    if (!this.isModelDownloaded(model)) {
      throw new Error(`Model "${model}" not downloaded. Call downloadModel() first.`)
    }

    this.loadedModel = model

    const result = await this.transcribeFn({
      fname_inp: filePath,
      model: this.modelPath(model),
      language,
      use_gpu: true,
      no_prints: true,
    })

    return this.normalizeResult(result, language)
  }

  /** Get the models directory path. */
  getModelsDir(): string {
    return this.modelsDir
  }

  /** Check if the native addon can be loaded. */
  isAddonAvailable(): boolean {
    try {
      this.loadAddon()
      return true
    } catch {
      return false
    }
  }

  // -----------------------------------------------------------------------
  // Internals
  // -----------------------------------------------------------------------

  private broadcastProgress(dp: DownloadProgress): void {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('whisper:download-progress', dp)
    }
  }

  private normalizeResult(
    raw: { transcription: string[][] | string[] },
    language: string
  ): TranscribeResult {
    const t = raw.transcription
    // The addon returns string[][] ([ [timestamp, text], ... ]) or string[]
    const segments: TranscribeSegment[] = []

    if (Array.isArray(t[0])) {
      // string[][] — each sub-array may be [startTime, endTime, text] or [timestamp, text]
      for (const seg of t as string[][]) {
        if (seg.length >= 3) {
          segments.push({ start: parseTimestamp(seg[0]), end: parseTimestamp(seg[1]), text: seg[2].trim() })
        } else if (seg.length === 2) {
          segments.push({ start: parseTimestamp(seg[0]), end: 0, text: seg[1].trim() })
        } else if (seg.length === 1) {
          segments.push({ start: 0, end: 0, text: seg[0].trim() })
        }
      }
    } else {
      // string[] — flat text segments without timestamps
      for (const text of t as string[]) {
        const trimmed = text.trim()
        if (trimmed) segments.push({ start: 0, end: 0, text: trimmed })
      }
    }

    return {
      text: segments.map((s) => s.text).join(' ').trim(),
      language,
      segments,
    }
  }

  private httpDownload(
    url: string,
    dest: string,
    model: WhisperModelSize,
    expectedSize: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let redirectCount = 0
      const MAX_REDIRECTS = 10

      const follow = (targetUrl: string) => {
        httpsGet(targetUrl, (res: IncomingMessage) => {
          // Handle redirects (Hugging Face uses 302)
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            if (++redirectCount > MAX_REDIRECTS) {
              reject(new Error(`Too many redirects (>${MAX_REDIRECTS})`))
              return
            }
            follow(res.headers.location)
            return
          }

          if (res.statusCode !== 200) {
            reject(new Error(`Download failed: HTTP ${res.statusCode}`))
            return
          }

          const totalBytes = parseInt(res.headers['content-length'] || '0', 10) || expectedSize
          let downloadedBytes = 0

          const fileStream = createWriteStream(dest)

          res.on('data', (chunk: Buffer) => {
            downloadedBytes += chunk.length
            const pct = Math.round((downloadedBytes / totalBytes) * 100)
            this.broadcastProgress({ model, progress: pct, downloadedBytes, totalBytes, status: 'downloading' })
          })

          res.pipe(fileStream)

          fileStream.on('finish', () => {
            fileStream.close()
            resolve()
          })

          fileStream.on('error', (err) => {
            fileStream.close()
            reject(err)
          })

          // Handle abort
          if (this.abortController) {
            this.abortController.signal.addEventListener('abort', () => {
              res.destroy()
              fileStream.close()
              reject(new Error('Download cancelled'))
            })
          }
        }).on('error', reject)
      }

      follow(url)
    })
  }
}
