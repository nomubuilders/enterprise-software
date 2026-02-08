import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { Mic } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { getNodeColorClass } from '../../config/nodeColors'
import { useAudioRecorder } from '../../hooks/useAudioRecorder'
import { VoiceWaveform } from './VoiceWaveform'

const MODEL_LABELS: Record<string, string> = {
  tiny: 'Tiny',
  small: 'Small',
  medium: 'Medium',
  'large-v3-turbo': 'Large v3 Turbo',
}

export const VoiceAssistantNode = memo((props: NodeProps) => {
  const config = (props.data as { config?: Record<string, unknown> }).config
  const model = (config?.transcription_model as string) ?? 'small'
  const language = (config?.language as string) ?? 'en'
  const useBackend = config?.use_backend === true

  const recorder = useAudioRecorder({ model, language, useBackend })

  return (
    <BaseNode {...props} icon={<Mic size={16} />} color={getNodeColorClass('voiceAssistantNode')}>
      <div className="w-[280px]">
      <VoiceWaveform
        status={recorder.status}
        volumeLevels={recorder.volumeLevels}
        transcript={recorder.transcript}
        duration={recorder.duration}
        error={recorder.error}
        onStart={recorder.startRecording}
        onStop={recorder.stopRecording}
        onClear={recorder.clear}
      />
      <div className="flex justify-between text-[10px] text-[var(--nomu-text-muted)] mt-1">
        <span>{MODEL_LABELS[model] ?? model}</span>
        <span>{language.toUpperCase()}</span>
      </div>
      </div>
    </BaseNode>
  )
})

VoiceAssistantNode.displayName = 'VoiceAssistantNode'
