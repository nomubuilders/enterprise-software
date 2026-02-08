import { memo } from 'react'
import { Mic, MicOff, Loader2, RotateCcw, X } from 'lucide-react'
import type { RecorderStatus } from '../../hooks/useAudioRecorder'

interface VoiceWaveformProps {
  status: RecorderStatus
  volumeLevels: number[]
  transcript: string
  duration: number
  error: string
  onStart: () => void
  onStop: () => void
  onClear: () => void
}

function formatTime(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export const VoiceWaveform = memo(
  ({ status, volumeLevels, transcript, duration, error, onStart, onStop, onClear }: VoiceWaveformProps) => {
    if (status === 'error') {
      return (
        <div className="flex flex-col items-center gap-1.5 py-1">
          <span className="text-red-400 text-center leading-tight">{error}</span>
          <button
            onClick={onClear}
            className="flex items-center gap-1 text-[var(--nomu-text-muted)] hover:text-[var(--nomu-text-secondary)] transition-colors"
          >
            <RotateCcw size={12} /> Retry
          </button>
        </div>
      )
    }

    if (status === 'done') {
      return (
        <div className="flex flex-col gap-1 py-0.5">
          <p className="leading-tight max-h-[72px] overflow-y-auto text-[var(--nomu-text-secondary)]">{transcript}</p>
          <button
            onClick={onClear}
            className="flex items-center gap-1 self-end text-[var(--nomu-text-muted)] hover:text-[var(--nomu-text-secondary)] transition-colors"
          >
            <X size={10} /> Clear
          </button>
        </div>
      )
    }

    if (status === 'transcribing') {
      return (
        <div className="flex flex-col items-center gap-1.5 py-1">
          <div className="flex items-end justify-center gap-0.5 h-6">
            {volumeLevels.map((_, i) => (
              <div key={i} className="w-1 rounded-full bg-[var(--nomu-primary)] opacity-50" style={{ height: 12 }} />
            ))}
          </div>
          <div className="flex items-center gap-1 text-[var(--nomu-text-muted)]">
            <Loader2 size={14} className="animate-spin text-[var(--nomu-primary)]" />
            Transcribing...
          </div>
        </div>
      )
    }

    if (status === 'recording') {
      return (
        <div className="flex flex-col items-center gap-1.5 py-1">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-400 font-medium">REC {formatTime(duration)}</span>
          </div>
          <div className="flex items-end justify-center gap-0.5 h-6">
            {volumeLevels.map((v, i) => (
              <div
                key={i}
                className="w-1 rounded-full bg-red-500 transition-[height] duration-75"
                style={{ height: Math.max(4, v * 24) }}
              />
            ))}
          </div>
          <button
            onClick={onStop}
            className="p-1 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
          >
            <MicOff size={14} />
          </button>
        </div>
      )
    }

    // Idle
    return (
      <div className="flex flex-col items-center gap-1 py-1">
        <button
          onClick={onStart}
          className="p-2 rounded-full bg-[var(--nomu-primary)]/10 hover:bg-[var(--nomu-primary)]/20 text-[var(--nomu-text-muted)] hover:text-[var(--nomu-primary)] transition-colors"
        >
          <Mic size={16} />
        </button>
        <span className="text-[var(--nomu-text-muted)]">Click to record</span>
      </div>
    )
  },
)

VoiceWaveform.displayName = 'VoiceWaveform'
