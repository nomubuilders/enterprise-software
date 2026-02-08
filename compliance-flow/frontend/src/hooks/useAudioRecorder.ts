import { useState, useRef, useCallback, useEffect } from 'react'
import { getElectronBridge } from '../services/electronBridge'
import { API_BASE_URL } from '../services/api'

export type RecorderStatus = 'idle' | 'recording' | 'transcribing' | 'done' | 'error'

interface UseAudioRecorderOptions {
  model: string
  language: string
  useBackend: boolean
}

interface RecorderState {
  status: RecorderStatus
  volumeLevels: number[]
  transcript: string
  duration: number
  error: string
}

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 4)
  const view = new DataView(buffer)
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i))
  }
  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 4, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 3, true) // IEEE float
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 4, true)
  view.setUint16(32, 4, true)
  view.setUint16(34, 32, true)
  writeStr(36, 'data')
  view.setUint32(40, samples.length * 4, true)
  for (let i = 0; i < samples.length; i++) view.setFloat32(44 + i * 4, samples[i], true)
  return new Blob([buffer], { type: 'audio/wav' })
}

function resample(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return input
  const ratio = fromRate / toRate
  const len = Math.round(input.length / ratio)
  const out = new Float32Array(len)
  for (let i = 0; i < len; i++) {
    const idx = i * ratio
    const lo = Math.floor(idx)
    const hi = Math.min(lo + 1, input.length - 1)
    const frac = idx - lo
    out[i] = input[lo] * (1 - frac) + input[hi] * frac
  }
  return out
}

export function useAudioRecorder({ model, language, useBackend }: UseAudioRecorderOptions) {
  const [state, setState] = useState<RecorderState>({
    status: 'idle',
    volumeLevels: [0, 0, 0, 0, 0],
    transcript: '',
    duration: 0,
    error: '',
  })

  const streamRef = useRef<MediaStream | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)
  const chunksRef = useRef<Float32Array[]>([])
  const rafRef = useRef(0)
  const timerRef = useRef(0)
  const startTimeRef = useRef(0)

  const cleanup = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    clearInterval(timerRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (ctxRef.current?.state !== 'closed') ctxRef.current?.close()
    ctxRef.current = null
  }, [])

  useEffect(() => cleanup, [cleanup])

  const startRecording = useCallback(async () => {
    try {
      chunksRef.current = []
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1 },
      })
      streamRef.current = stream

      const ctx = new AudioContext({ sampleRate: 16000 })
      ctxRef.current = ctx
      const source = ctx.createMediaStreamSource(stream)

      // Analyser for volume bars
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 64
      source.connect(analyser)
      const freqData = new Uint8Array(analyser.frequencyBinCount)

      let lastDraw = 0
      const drawBars = (now: number) => {
        rafRef.current = requestAnimationFrame(drawBars)
        if (now - lastDraw < 66) return // ~15fps
        lastDraw = now
        analyser.getByteFrequencyData(freqData)
        const step = Math.floor(freqData.length / 5)
        const levels = Array.from({ length: 5 }, (_, i) => freqData[i * step] / 255)
        setState((s) => (s.status === 'recording' ? { ...s, volumeLevels: levels } : s))
      }
      rafRef.current = requestAnimationFrame(drawBars)

      // ScriptProcessor for PCM capture
      const processor = ctx.createScriptProcessor(4096, 1, 1)
      processor.onaudioprocess = (e) => {
        chunksRef.current.push(new Float32Array(e.inputBuffer.getChannelData(0)))
      }
      source.connect(processor)
      processor.connect(ctx.destination)

      // Duration timer
      startTimeRef.current = Date.now()
      timerRef.current = window.setInterval(() => {
        setState((s) =>
          s.status === 'recording'
            ? { ...s, duration: Math.floor((Date.now() - startTimeRef.current) / 1000) }
            : s,
        )
      }, 1000)

      setState({
        status: 'recording',
        volumeLevels: [0, 0, 0, 0, 0],
        transcript: '',
        duration: 0,
        error: '',
      })
    } catch (err) {
      cleanup()
      const msg =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Microphone permission denied'
          : 'Failed to start recording'
      setState((s) => ({ ...s, status: 'error', error: msg }))
    }
  }, [cleanup])

  const stopRecording = useCallback(async () => {
    cleanup()
    setState((s) => ({ ...s, status: 'transcribing', volumeLevels: [0.3, 0.3, 0.3, 0.3, 0.3] }))

    try {
      const totalLen = chunksRef.current.reduce((n, c) => n + c.length, 0)
      const merged = new Float32Array(totalLen)
      let offset = 0
      for (const c of chunksRef.current) {
        merged.set(c, offset)
        offset += c.length
      }

      const sampleRate = ctxRef.current?.sampleRate ?? 16000
      const pcm = resample(merged, sampleRate, 16000)

      const bridge = getElectronBridge()
      let text: string

      if (bridge && !useBackend) {
        // Electron path: base64
        const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength)
        let binary = ''
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
        const base64 = btoa(binary)
        const result = await bridge.whisper.transcribe(base64, { model, language })
        text = result.text
      } else {
        // Backend path: WAV FormData
        const wav = encodeWav(pcm, 16000)
        const form = new FormData()
        form.append('file', wav, 'recording.wav')
        form.append('model', model)
        form.append('language', language)
        const resp = await fetch(`${API_BASE_URL}/voice/transcribe`, { method: 'POST', body: form })
        if (!resp.ok) throw new Error(`Server error: ${resp.status}`)
        const result = await resp.json()
        text = result.text
      }

      setState((s) => ({ ...s, status: 'done', transcript: text }))
    } catch (err) {
      setState((s) => ({
        ...s,
        status: 'error',
        error: err instanceof Error ? err.message : 'Transcription failed',
      }))
    }
  }, [model, language, useBackend, cleanup])

  const clear = useCallback(() => {
    setState({
      status: 'idle',
      volumeLevels: [0, 0, 0, 0, 0],
      transcript: '',
      duration: 0,
      error: '',
    })
  }, [])

  return { ...state, startRecording, stopRecording, clear }
}
