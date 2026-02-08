import { memo, useEffect, useRef } from 'react'
import { Mic, Bot, Volume2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import type { ChatMessage } from '../../services/api'

interface PersonaPlexChatThreadProps {
  messages: ChatMessage[]
  onPlayTts: (text: string) => void
  ttsAvailable: boolean
}

export const PersonaPlexChatThread = memo(
  ({ messages, onPlayTts, ttsAvailable }: PersonaPlexChatThreadProps) => {
    const endRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
      endRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages.length])

    if (messages.length === 0) {
      return (
        <div className="flex h-[100px] items-center justify-center text-[10px] text-[var(--nomu-text-muted)]">
          Ask a question about your data
        </div>
      )
    }

    return (
      <div className="max-h-[200px] space-y-1.5 overflow-y-auto pr-1">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-1.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <Bot size={12} className="mt-0.5 shrink-0 text-[var(--nomu-primary)]" />
            )}
            <div
              className={`max-w-[85%] rounded-md px-2 py-1 text-[10px] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[var(--nomu-primary)]/10 text-[var(--nomu-text-muted)]'
                  : 'bg-[var(--nomu-surface)] text-[var(--nomu-text-secondary)]'
              }`}
            >
              {msg.role === 'user' ? (
                msg.content
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none text-[10px] prose-p:my-0.5 prose-p:text-[10px] prose-p:leading-relaxed prose-headings:my-1 prose-headings:text-[11px] prose-ul:my-0.5 prose-ul:pl-3 prose-ol:my-0.5 prose-ol:pl-3 prose-li:my-0 prose-li:text-[10px] prose-code:bg-black/10 dark:prose-code:bg-white/10 prose-code:px-0.5 prose-code:rounded prose-code:text-[9px] prose-code:text-[var(--nomu-text-secondary)] prose-p:text-[var(--nomu-text-secondary)] prose-li:text-[var(--nomu-text-secondary)] prose-strong:text-[var(--nomu-text)] prose-headings:text-[var(--nomu-text)]">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              )}
            </div>
            {msg.role === 'user' && (
              <Mic size={10} className="mt-0.5 shrink-0 text-[var(--nomu-text-muted)]" />
            )}
            {msg.role === 'assistant' && ttsAvailable && (
              <button
                onClick={() => onPlayTts(msg.content)}
                className="mt-0.5 shrink-0 text-[var(--nomu-text-muted)] hover:text-[var(--nomu-primary)] transition-colors"
              >
                <Volume2 size={10} />
              </button>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    )
  },
)

PersonaPlexChatThread.displayName = 'PersonaPlexChatThread'
