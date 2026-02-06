import type { DragEvent, ReactNode } from 'react'
import {
  Bot,
  Database,
  Play,
  Shield,
  Container,
  MessageSquare,
  FileSpreadsheet,
  FileText,
  Mail,
  Send,
  Clock,
  Webhook,
  Search,
  Sparkles,
} from 'lucide-react'
import { useDockerStore } from '../../store/dockerStore'

interface NodeTemplate {
  type: string
  label: string
  icon: ReactNode
  color: string
  category: string
  config?: Record<string, unknown>
}

const nodeTemplates: NodeTemplate[] = [
  // Triggers
  {
    type: 'triggerNode',
    label: 'Manual Trigger',
    icon: <Play size={18} />,
    color: 'bg-[var(--nomu-accent)]',
    category: 'Triggers',
    config: { triggerType: 'manual' },
  },
  {
    type: 'triggerNode',
    label: 'Schedule',
    icon: <Clock size={18} />,
    color: 'bg-[var(--nomu-accent)]',
    category: 'Triggers',
    config: { triggerType: 'schedule' },
  },
  {
    type: 'triggerNode',
    label: 'Webhook',
    icon: <Webhook size={18} />,
    color: 'bg-[var(--nomu-accent)]',
    category: 'Triggers',
    config: { triggerType: 'webhook' },
  },
  // Data Sources
  {
    type: 'databaseNode',
    label: 'PostgreSQL',
    icon: <Database size={18} />,
    color: 'bg-[var(--nomu-primary)]',
    category: 'Data Sources',
    config: { dbType: 'postgresql' },
  },
  {
    type: 'databaseNode',
    label: 'MySQL',
    icon: <Database size={18} />,
    color: 'bg-[var(--nomu-primary)]',
    category: 'Data Sources',
    config: { dbType: 'mysql' },
  },
  {
    type: 'databaseNode',
    label: 'MongoDB',
    icon: <Database size={18} />,
    color: 'bg-[var(--nomu-primary)]',
    category: 'Data Sources',
    config: { dbType: 'mongodb' },
  },
  // Documents
  {
    type: 'documentNode',
    label: 'Legal Document',
    icon: <FileText size={18} />,
    color: 'bg-[var(--nomu-primary)]',
    category: 'Documents',
    config: { mode: 'summarize', templateId: null, chunkSize: 20000, documents: [] },
  },
  // AI Models
  {
    type: 'llmNode',
    label: 'AI Agent',
    icon: <Bot size={18} />,
    color: 'bg-[var(--nomu-primary)]',
    category: 'AI Models',
    config: { model: 'llama3.2', temperature: 0.7, maxTokens: 2048 },
  },
  // Compliance
  {
    type: 'piiFilterNode',
    label: 'PII Redact',
    icon: <Shield size={18} />,
    color: 'bg-[var(--nomu-accent)]',
    category: 'Compliance',
    config: { mode: 'redact' },
  },
  {
    type: 'piiFilterNode',
    label: 'PII Mask',
    icon: <Shield size={18} />,
    color: 'bg-[var(--nomu-accent)]',
    category: 'Compliance',
    config: { mode: 'mask' },
  },
  // Outputs
  {
    type: 'outputNode',
    label: 'Chat Interface',
    icon: <MessageSquare size={18} />,
    color: 'bg-[var(--nomu-primary)]',
    category: 'Outputs',
    config: { outputType: 'chat' },
  },
  {
    type: 'outputNode',
    label: 'Spreadsheet',
    icon: <FileSpreadsheet size={18} />,
    color: 'bg-[var(--nomu-primary)]',
    category: 'Outputs',
    config: { outputType: 'spreadsheet' },
  },
  {
    type: 'outputNode',
    label: 'Email',
    icon: <Mail size={18} />,
    color: 'bg-[var(--nomu-accent)]',
    category: 'Outputs',
    config: { outputType: 'email' },
  },
  {
    type: 'outputNode',
    label: 'Telegram Bot',
    icon: <Send size={18} />,
    color: 'bg-[var(--nomu-primary)]',
    category: 'Outputs',
    config: { outputType: 'telegram' },
  },
  // Containers
  {
    type: 'dockerContainerNode',
    label: 'Docker Container',
    icon: <Container size={18} />,
    color: 'bg-[var(--nomu-primary)]',
    category: 'Containers',
    config: { image: '', tag: 'latest', command: [], envVars: {}, cpuLimit: 0.5, memoryLimit: 512, timeout: 300, networkMode: 'none' },
  },
]

const categories = ['Triggers', 'Data Sources', 'Documents', 'AI Models', 'Compliance', 'Outputs', 'Containers']

export function Sidebar() {
  const dockerAvailable = useDockerStore((s) => s.dockerAvailable)

  const onDragStart = (event: DragEvent, template: NodeTemplate) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(template))
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <aside className="flex h-full w-64 flex-col border-r border-[var(--nomu-border)] bg-[var(--nomu-bg-secondary)]">
      {/* Header */}
      <div className="border-b border-[var(--nomu-border)] p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-[var(--nomu-primary)]" />
          <h1 className="font-['Barlow'] text-lg font-bold text-[var(--nomu-text)]">ComplianceFlow</h1>
        </div>
        <p className="mt-1 text-xs text-[var(--nomu-text-muted)]">Local AI Workflow Builder</p>
      </div>

      {/* Search */}
      <div className="p-3">
        <div className="flex items-center gap-2 rounded-lg bg-[var(--nomu-surface)] px-3 py-2">
          <Search size={16} className="text-[var(--nomu-text-muted)]" />
          <input
            type="text"
            placeholder="Search nodes..."
            className="w-full bg-transparent text-sm text-[var(--nomu-text)] placeholder-[var(--nomu-text-muted)] outline-none"
          />
        </div>
      </div>

      {/* Node Palette */}
      <div className="flex-1 overflow-y-auto p-3">
        {categories.map((category) => (
          <div key={category} className="mb-4">
            <h3 className="mb-2 font-['Barlow'] text-xs font-semibold uppercase tracking-wider text-[var(--nomu-text-muted)]">
              {category}
              {category === 'Containers' && (
                <span className={`ml-1.5 inline-block h-1.5 w-1.5 rounded-full ${dockerAvailable ? 'bg-green-500' : 'bg-gray-500'}`} />
              )}
            </h3>
            <div className="space-y-1">
              {nodeTemplates
                .filter((t) => t.category === category)
                .map((template, index) => (
                  <div
                    key={`${template.type}-${index}`}
                    draggable
                    onDragStart={(e) => onDragStart(e, template)}
                    className={`
                      flex cursor-grab items-center gap-2 rounded-lg px-3 py-2
                      transition-all duration-150
                      hover:bg-[var(--nomu-surface-hover)] active:cursor-grabbing
                    `}
                  >
                    <div className={`rounded p-1.5 text-white ${template.color}`}>
                      {template.icon}
                    </div>
                    <span className="text-sm text-[var(--nomu-text)]">{template.label}</span>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-[var(--nomu-border)] p-3">
        <div className="rounded-lg bg-[var(--nomu-surface)] p-3">
          <div className="flex items-center gap-2 text-xs text-[var(--nomu-text-muted)]">
            <Shield size={14} className="text-[var(--nomu-accent)]" />
            <span>GDPR & EU AI Act Ready</span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-[var(--nomu-text-muted)]">
            <div className="h-2 w-2 rounded-full bg-[var(--nomu-accent)]" />
            <span>100% Local Processing</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
