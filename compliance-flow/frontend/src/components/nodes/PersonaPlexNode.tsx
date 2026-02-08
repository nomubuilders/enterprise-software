import { memo, useCallback, useMemo, useState, useEffect } from 'react'
import type { NodeProps, Node } from '@xyflow/react'
import { MessageSquareMore, Mic, MicOff, Loader2, RotateCcw, Trash2, Volume2, VolumeX } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { PersonaPlexChatThread } from './PersonaPlexChatThread'
import { getNodeColorClass } from '../../config/nodeColors'
import { useVoiceChat } from '../../hooks/useVoiceChat'
import { useFlowStore } from '../../store/flowStore'
import { api } from '../../services/api'
import type { TableInfo } from '../../services/api'

function findUpstreamNodes(nodeId: string, nodes: Node[], edges: { source: string; target: string }[]): Node[] {
  const visited = new Set<string>()
  const collect = (id: string): Node[] => {
    if (visited.has(id)) return []
    visited.add(id)
    const result: Node[] = []
    for (const e of edges) {
      if (e.target === id) {
        const src = nodes.find((n) => n.id === e.source)
        if (src) {
          result.push(src)
          result.push(...collect(src.id))
        }
      }
    }
    return result
  }
  return collect(nodeId)
}

function buildStaticContext(upstream: Node[]): { prompt: string; dbCount: number } {
  let prompt = ''
  let dbCount = 0

  for (const node of upstream) {
    const data = node.data as Record<string, unknown>
    const cfg = (data.config as Record<string, unknown>) ?? {}

    if (node.type === 'databaseNode') {
      dbCount++
    } else if (node.type === 'piiFilterNode') {
      prompt += `\nCompliance: PII filter (${cfg.mode ?? 'redact'}) is active.`
    } else if (node.type === 'personalityNode') {
      prompt += `\nPersona: ${cfg.persona ?? 'professional'}, tone: ${cfg.tone ?? 'formal'}`
    }
  }

  return { prompt, dbCount }
}

export const PersonaPlexNode = memo((props: NodeProps) => {
  const config = ((props.data as Record<string, unknown>).config as Record<string, unknown>) ?? {}
  const model = (config.model as string) ?? ''
  const temperature = (config.temperature as number) ?? 0.7
  const transcriptionModel = (config.transcription_model as string) ?? 'small'
  const lang = (config.language as string) ?? 'en'
  const personaplexUrl = (config.personaplex_url as string) ?? ''
  const voiceEmbedding = (config.voice_embedding as string) ?? ''
  const personaPrompt = (config.persona_prompt as string) ?? ''

  const nodes = useFlowStore((s) => s.nodes)
  const edges = useFlowStore((s) => s.edges)

  const voiceChat = useVoiceChat({ transcriptionModel, language: lang })
  const [ttsMuted, setTtsMuted] = useState(false)
  const ttsAvailable = true // built-in Piper TTS always available

  // Stop clicks on interactive elements from selecting the node (opening settings pane)
  const stop = (e: React.MouseEvent) => e.stopPropagation()

  const upstream = useMemo(() => findUpstreamNodes(props.id, nodes, edges), [props.id, nodes, edges])
  const { prompt: staticPrompt, dbCount } = useMemo(() => buildStaticContext(upstream), [upstream])

  // Real DB context (schema + sample data) loaded from upstream database nodes
  const [dbSchema, setDbSchema] = useState<TableInfo[]>([])
  const [sampleData, setSampleData] = useState<Record<string, unknown>[] | null>(null)

  // Stable key from DB config — prevents re-fetching on node drag
  const dbConfigKey = useMemo(() => {
    const dbNode = upstream.find((n) => n.type === 'databaseNode')
    if (!dbNode) return ''
    const cfg = ((dbNode.data as Record<string, unknown>).config as Record<string, unknown>) ?? {}
    if (!cfg.host || !cfg.database) return ''
    return JSON.stringify({ t: cfg.dbType, h: cfg.host, p: cfg.port, d: cfg.database, u: cfg.username })
  }, [upstream])

  useEffect(() => {
    if (!dbConfigKey) {
      setDbSchema([])
      setSampleData(null)
      return
    }

    const dbNode = upstream.find((n) => n.type === 'databaseNode')!
    const data = dbNode.data as Record<string, unknown>
    const cfg = (data.config as Record<string, unknown>) ?? {}

    const dbConfig = {
      type: (cfg.dbType as 'postgresql' | 'mysql' | 'mongodb') ?? 'postgresql',
      host: cfg.host as string,
      port: (cfg.port as number) ?? 5432,
      database: cfg.database as string,
      username: (cfg.username as string) ?? '',
      password: (cfg.password as string) ?? '',
      ssl: (cfg.ssl as boolean) ?? false,
    }

    let cancelled = false

    ;(async () => {
      try {
        console.log('[PersonaPlex] Loading DB context:', dbConfig.host, dbConfig.database)
        const tablesResult = await api.listTables(dbConfig)
        if (cancelled || !tablesResult.success) {
          console.warn('[PersonaPlex] listTables failed:', tablesResult)
          return
        }
        console.log('[PersonaPlex] Schema loaded:', tablesResult.tables.map((t: TableInfo) => t.name))
        setDbSchema(tablesResult.tables)

        const tableName = tablesResult.tables[0]?.name
        if (!tableName) return

        const query = ((cfg.query as string) || `SELECT * FROM ${tableName}`).trim().replace(/;$/, '')
        const queryResult = await api.executeQuery(dbConfig, query.toLowerCase().includes('limit') ? query : `${query} LIMIT 50`, 50)
        if (cancelled || !queryResult.success) return
        setSampleData(queryResult.rows)
      } catch (err) {
        console.error('[PersonaPlex] Failed to load DB context:', err)
      }
    })()

    return () => { cancelled = true }
  }, [dbConfigKey])

  const systemPrompt = useMemo(() => {
    let prompt = 'You are an expert data analyst. Answer questions based on the connected data sources.\n'

    if (dbSchema.length > 0) {
      prompt += '\n## Database Schema:'
      for (const table of dbSchema) {
        prompt += `\n- **${table.name}**: ${table.columns?.map((c) => `${c.name} (${c.type})`).join(', ')}`
      }
    }

    if (sampleData && sampleData.length > 0) {
      prompt += `\n\n## Sample Data (${sampleData.length} rows):\n\`\`\`json\n${JSON.stringify(sampleData.slice(0, 20), null, 2)}\n\`\`\``
    }

    if (staticPrompt) prompt += `\n${staticPrompt}`
    if (personaPrompt) prompt += `\n\n${personaPrompt}`

    return prompt
  }, [dbSchema, sampleData, staticPrompt, personaPrompt])

  const handleStop = useCallback(() => {
    const tts = ttsMuted ? undefined : { url: personaplexUrl || undefined, voiceEmbedding: voiceEmbedding || undefined }
    voiceChat.stopAndSend(systemPrompt, model || 'llama3.2', temperature, tts)
  }, [voiceChat.stopAndSend, systemPrompt, model, temperature, personaplexUrl, voiceEmbedding, ttsMuted])

  const handlePlayTts = useCallback(
    (text: string) => {
      if (ttsMuted) return
      voiceChat.playResponse(text, personaplexUrl, voiceEmbedding || undefined)
    },
    [voiceChat.playResponse, personaplexUrl, voiceEmbedding, ttsMuted],
  )

  return (
    <BaseNode {...props} icon={<MessageSquareMore size={16} />} color={getNodeColorClass('personaPlexNode')}>
      <div className="w-[280px]">
        {/* Chat thread */}
        <PersonaPlexChatThread
          messages={voiceChat.messages}
          onPlayTts={handlePlayTts}
          ttsAvailable={ttsAvailable}
        />

        {/* Voice input bar */}
        <div className="mt-2 rounded-md border border-[var(--nomu-border)] bg-[var(--nomu-bg)] px-2 py-1.5" onMouseDown={stop}>
          {voiceChat.status === 'error' ? (
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-red-400 truncate">{voiceChat.error}</span>
              <button onClick={voiceChat.clear} onMouseDown={stop} className="text-[var(--nomu-text-muted)] hover:text-[var(--nomu-text-secondary)]">
                <RotateCcw size={12} />
              </button>
            </div>
          ) : voiceChat.status === 'recording' ? (
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
              <div className="flex items-end gap-0.5 h-4 flex-1">
                {voiceChat.volumeLevels.map((v, i) => (
                  <div
                    key={i}
                    className="w-1 rounded-full bg-red-500 transition-[height] duration-75"
                    style={{ height: Math.max(3, v * 16) }}
                  />
                ))}
              </div>
              <button
                onClick={handleStop}
                onMouseDown={stop}
                className="p-0.5 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
              >
                <MicOff size={12} />
              </button>
            </div>
          ) : voiceChat.status === 'transcribing' ? (
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-[var(--nomu-text-muted)]">
              <Loader2 size={12} className="animate-spin text-[var(--nomu-primary)]" />
              Transcribing...
            </div>
          ) : voiceChat.status === 'thinking' ? (
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-[var(--nomu-text-muted)]">
              <Loader2 size={12} className="animate-spin text-[var(--nomu-primary)]" />
              Thinking...
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <button
                onClick={voiceChat.startRecording}
                onMouseDown={stop}
                className="p-1 rounded-full bg-[var(--nomu-primary)]/10 hover:bg-[var(--nomu-primary)]/20 text-[var(--nomu-text-muted)] hover:text-[var(--nomu-primary)] transition-colors"
              >
                <Mic size={12} />
              </button>
              <span className="text-[10px] text-[var(--nomu-text-muted)]">Ask a question...</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setTtsMuted((m) => !m)}
                  onMouseDown={stop}
                  className="text-[var(--nomu-text-muted)] hover:text-[var(--nomu-text-secondary)]"
                  title={ttsMuted ? 'Unmute TTS' : 'Mute TTS'}
                >
                  {ttsMuted ? <VolumeX size={10} /> : <Volume2 size={10} />}
                </button>
                {voiceChat.messages.length > 0 && (
                  <button onClick={voiceChat.clear} onMouseDown={stop} className="text-[var(--nomu-text-muted)] hover:text-[var(--nomu-text-secondary)]">
                    <Trash2 size={10} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between text-[10px] text-[var(--nomu-text-muted)] mt-1">
          <span>{model || 'No model'}</span>
          <span>{dbSchema.length > 0 ? `${dbSchema.length} tables` : dbCount > 0 ? `${dbCount} DB` : 'No DB'}</span>
        </div>
      </div>
    </BaseNode>
  )
})

PersonaPlexNode.displayName = 'PersonaPlexNode'
