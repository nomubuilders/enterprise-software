import { useState, useRef, useCallback, useEffect } from 'react'
import { API_BASE_URL, api } from '../services/api'
import type { ChatMessage } from '../services/api'

export type VoiceChatStatus = 'idle' | 'recording' | 'transcribing' | 'thinking' | 'done' | 'error'

interface VoiceChatState {
  messages: ChatMessage[]
  status: VoiceChatStatus
  volumeLevels: number[]
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

/** Strip markdown syntax so TTS reads clean text (no "asterisk asterisk"). */
function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, '')       // code blocks
    .replace(/`([^`]+)`/g, '$1')          // inline code
    .replace(/\*\*([^*]+)\*\*/g, '$1')    // bold
    .replace(/\*([^*]+)\*/g, '$1')        // italic
    .replace(/__([^_]+)__/g, '$1')        // bold alt
    .replace(/_([^_]+)_/g, '$1')          // italic alt
    .replace(/^#{1,6}\s+/gm, '')          // headings
    .replace(/^\s*[-*+]\s+/gm, '')        // unordered list markers
    .replace(/^\s*\d+\.\s+/gm, '')        // ordered list markers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1') // images
    .replace(/\n{2,}/g, '\n')             // collapse blank lines
    .trim()
}

interface UseVoiceChatOptions {
  transcriptionModel: string
  language: string
}

export function useVoiceChat({ transcriptionModel, language }: UseVoiceChatOptions) {
  const [state, setState] = useState<VoiceChatState>({
    messages: [],
    status: 'idle',
    volumeLevels: [0, 0, 0, 0, 0],
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

      const analyser = ctx.createAnalyser()
      analyser.fftSize = 64
      source.connect(analyser)
      const freqData = new Uint8Array(analyser.frequencyBinCount)

      let lastDraw = 0
      const drawBars = (now: number) => {
        rafRef.current = requestAnimationFrame(drawBars)
        if (now - lastDraw < 66) return
        lastDraw = now
        analyser.getByteFrequencyData(freqData)
        const step = Math.floor(freqData.length / 5)
        const levels = Array.from({ length: 5 }, (_, i) => freqData[i * step] / 255)
        setState((s) => (s.status === 'recording' ? { ...s, volumeLevels: levels } : s))
      }
      rafRef.current = requestAnimationFrame(drawBars)

      const processor = ctx.createScriptProcessor(4096, 1, 1)
      processor.onaudioprocess = (e) => {
        chunksRef.current.push(new Float32Array(e.inputBuffer.getChannelData(0)))
      }
      source.connect(processor)
      processor.connect(ctx.destination)

      startTimeRef.current = Date.now()
      timerRef.current = window.setInterval(() => {
        setState((s) =>
          s.status === 'recording'
            ? { ...s, duration: Math.floor((Date.now() - startTimeRef.current) / 1000) }
            : s,
        )
      }, 1000)

      setState((s) => ({ ...s, status: 'recording', volumeLevels: [0, 0, 0, 0, 0], duration: 0, error: '' }))
    } catch (err) {
      cleanup()
      const msg =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Microphone permission denied'
          : 'Failed to start recording'
      setState((s) => ({ ...s, status: 'error', error: msg }))
    }
  }, [cleanup])

  const playResponse = useCallback(async (text: string, personaplexUrl?: string, voiceEmbedding?: string) => {
    try {
      const cleanText = stripMarkdown(text)
      if (!cleanText) return
      const blob = await api.tts(cleanText, voiceEmbedding, personaplexUrl || undefined)
      const objUrl = URL.createObjectURL(blob)
      const audio = new Audio(objUrl)
      audio.onended = () => URL.revokeObjectURL(objUrl)
      audio.play()
    } catch (err) {
      console.error('[PersonaPlex] TTS playback failed:', err)
      setState((s) => ({
        ...s,
        status: 'error',
        error: `TTS failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      }))
    }
  }, [])

  const stopAndSend = useCallback(
    async (context: string, model: string, temperature: number, tts?: { url?: string; voiceEmbedding?: string }) => {
      cleanup()
      setState((s) => ({ ...s, status: 'transcribing', volumeLevels: [0.3, 0.3, 0.3, 0.3, 0.3] }))

      try {
        // Merge audio chunks
        const totalLen = chunksRef.current.reduce((n, c) => n + c.length, 0)
        const merged = new Float32Array(totalLen)
        let offset = 0
        for (const c of chunksRef.current) {
          merged.set(c, offset)
          offset += c.length
        }

        const sampleRate = ctxRef.current?.sampleRate ?? 16000
        const pcm = resample(merged, sampleRate, 16000)
        const wav = encodeWav(pcm, 16000)

        // Transcribe via backend
        const form = new FormData()
        form.append('file', wav, 'recording.wav')
        form.append('model', transcriptionModel)
        form.append('language', language)
        const resp = await fetch(`${API_BASE_URL}/voice/transcribe`, { method: 'POST', body: form })
        if (!resp.ok) throw new Error(`Transcription error: ${resp.status}`)
        const { text } = await resp.json()

        if (!text?.trim()) {
          setState((s) => ({ ...s, status: 'idle' }))
          return
        }

        // Append user message and switch to thinking
        const userMsg: ChatMessage = { role: 'user', content: text }
        setState((s) => {
          const updated = [...s.messages, userMsg]
          return { ...s, messages: updated, status: 'thinking' }
        })

        // Build messages for LLM with context
        const allMessages: ChatMessage[] = [
          { role: 'system', content: context },
          ...state.messages,
          userMsg,
        ]

        const result = await api.chat({ model, messages: allMessages, temperature })
        const assistantMsg: ChatMessage = { role: 'assistant', content: result.message.content }

        setState((s) => ({
          ...s,
          messages: [...s.messages, assistantMsg],
          status: 'done',
        }))

        // Auto-play TTS (built-in Piper if no external URL)
        if (tts) {
          playResponse(result.message.content, tts.url, tts.voiceEmbedding)
        }
      } catch (err) {
        setState((s) => ({
          ...s,
          status: 'error',
          error: err instanceof Error ? err.message : 'Voice chat failed',
        }))
      }
    },
    [transcriptionModel, language, state.messages, cleanup, playResponse],
  )

  const clear = useCallback(() => {
    setState({
      messages: [],
      status: 'idle',
      volumeLevels: [0, 0, 0, 0, 0],
      duration: 0,
      error: '',
    })
  }, [])

  return { ...state, startRecording, stopAndSend, playResponse, clear } as const
}
