import { useState } from 'react'
import type { DragEvent, ReactNode } from 'react'
import nomuLogo from '../../assets/nomu-logo.png'
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
  Globe,
  UserCircle,
  ScrollText,
  FileCode,
  Plug,
  GitBranch,
  ShieldCheck,
  BarChart3,
  Brain,
  Archive,
  Scale,
  Lightbulb,
  Bug,
  Activity,
  Bell,
  Lock,
  Radio,
  Layers,
  HeartPulse,
  Landmark,
  FileCheck,
  UserCheck,
  ShieldAlert,
  DatabaseZap,
  FolderOpen,
  Cloud,
  Ticket,
  Building2,
  Mic,
  MessageSquareMore,
} from 'lucide-react'
import { useDockerStore } from '../../store/dockerStore'
import { getNodeColorClass } from '../../config/nodeColors'

interface NodeTemplate {
  type: string
  label: string
  description: string
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
    description: 'Start a workflow manually with a single click',
    icon: <Play size={18} />,
    color: getNodeColorClass('triggerNode'),
    category: 'Triggers',
    config: { triggerType: 'manual' },
  },
  {
    type: 'triggerNode',
    label: 'Schedule',
    description: 'Run workflows automatically on a cron schedule',
    icon: <Clock size={18} />,
    color: getNodeColorClass('triggerNode'),
    category: 'Triggers',
    config: { triggerType: 'schedule' },
  },
  {
    type: 'triggerNode',
    label: 'Webhook',
    description: 'Trigger workflows via an incoming HTTP request',
    icon: <Webhook size={18} />,
    color: getNodeColorClass('triggerNode'),
    category: 'Triggers',
    config: { triggerType: 'webhook' },
  },
  // Data Sources
  {
    type: 'databaseNode',
    label: 'PostgreSQL',
    description: 'Connect to a PostgreSQL database to query or write data',
    icon: <Database size={18} />,
    color: getNodeColorClass('databaseNode'),
    category: 'Data Sources',
    config: { dbType: 'postgresql' },
  },
  {
    type: 'databaseNode',
    label: 'MySQL',
    description: 'Connect to a MySQL database to query or write data',
    icon: <Database size={18} />,
    color: getNodeColorClass('databaseNode'),
    category: 'Data Sources',
    config: { dbType: 'mysql' },
  },
  {
    type: 'databaseNode',
    label: 'MongoDB',
    description: 'Connect to a MongoDB instance for document-based queries',
    icon: <Database size={18} />,
    color: getNodeColorClass('databaseNode'),
    category: 'Data Sources',
    config: { dbType: 'mongodb' },
  },
  // Documents
  {
    type: 'documentNode',
    label: 'Legal Document',
    description: 'Ingest PDFs, DOCX or text files for AI summarization and analysis',
    icon: <FileText size={18} />,
    color: getNodeColorClass('documentNode'),
    category: 'Documents',
    config: { mode: 'summarize', templateId: null, chunkSize: 20000, documents: [] },
  },
  // AI Models
  {
    type: 'llmNode',
    label: 'AI Agent',
    description: 'Process text with a local LLM — summarize, classify, extract, or generate',
    icon: <Bot size={18} />,
    color: getNodeColorClass('llmNode'),
    category: 'AI Models',
    config: { model: 'llama3.2:3b', temperature: 0.7, maxTokens: 2048 },
  },
  {
    type: 'personaPlexNode',
    label: 'PersonaPlex Assistant',
    description: 'Voice-enabled AI assistant with custom persona and real-time transcription',
    icon: <MessageSquareMore size={18} />,
    color: getNodeColorClass('personaPlexNode'),
    category: 'AI Models',
    config: {
      model: '', temperature: 0.7,
      transcription_model: 'small', language: 'en',
      personaplex_url: '', persona_prompt: '', voice_embedding: '',
    },
  },
  // Compliance
  {
    type: 'piiFilterNode',
    label: 'PII Redact',
    description: 'Permanently remove personal data (names, emails, SSNs) from text',
    icon: <Shield size={18} />,
    color: getNodeColorClass('piiFilterNode'),
    category: 'Compliance',
    config: { mode: 'redact' },
  },
  {
    type: 'piiFilterNode',
    label: 'PII Mask',
    description: 'Replace personal data with masked placeholders (e.g. ***@***.com)',
    icon: <Shield size={18} />,
    color: getNodeColorClass('piiFilterNode'),
    category: 'Compliance',
    config: { mode: 'mask' },
  },
  // Outputs
  {
    type: 'outputNode',
    label: 'Chat Interface',
    description: 'Interactive chat window to converse with your AI workflow',
    icon: <MessageSquare size={18} />,
    color: getNodeColorClass('outputNode'),
    category: 'Outputs',
    config: { outputType: 'chat' },
  },
  {
    type: 'outputNode',
    label: 'Spreadsheet',
    description: 'Export results as CSV or Excel spreadsheet for download',
    icon: <FileSpreadsheet size={18} />,
    color: getNodeColorClass('outputNode'),
    category: 'Outputs',
    config: { outputType: 'spreadsheet' },
  },
  {
    type: 'outputNode',
    label: 'Email',
    description: 'Send workflow results via SMTP email with attachments',
    icon: <Mail size={18} />,
    color: getNodeColorClass('outputNode'),
    category: 'Outputs',
    config: { outputType: 'email' },
  },
  {
    type: 'outputNode',
    label: 'Telegram Bot',
    description: 'Push results to a Telegram chat or channel via bot',
    icon: <Send size={18} />,
    color: getNodeColorClass('outputNode'),
    category: 'Outputs',
    config: { outputType: 'telegram' },
  },
  // Containers
  {
    type: 'dockerContainerNode',
    label: 'Docker Container',
    description: 'Run isolated code in a sandboxed Docker container',
    icon: <Container size={18} />,
    color: getNodeColorClass('dockerContainerNode'),
    category: 'Containers',
    config: { image: '', tag: 'latest', command: [], envVars: {}, cpuLimit: 0.5, memoryLimit: 512, timeout: 300, networkMode: 'none' },
  },
  // Data Processing
  {
    type: 'spreadsheetNode',
    label: 'Spreadsheet',
    description: 'Import and transform CSV/Excel data — filter, sort, and reshape',
    icon: <FileSpreadsheet size={18} />,
    color: getNodeColorClass('spreadsheetNode'),
    category: 'Data Processing',
    config: { format: 'csv', operation: 'import' },
  },
  {
    type: 'emailInboxNode',
    label: 'Email Inbox',
    description: 'Fetch emails from an IMAP inbox for processing and analysis',
    icon: <Mail size={18} />,
    color: getNodeColorClass('emailInboxNode'),
    category: 'Data Processing',
    config: { protocol: 'imap' },
  },
  {
    type: 'webSearchNode',
    label: 'Web Search',
    description: 'Search the web via SearXNG and feed results into your workflow',
    icon: <Globe size={18} />,
    color: getNodeColorClass('webSearchNode'),
    category: 'Data Processing',
    config: { engine: 'searxng', maxResults: 10 },
  },
  // AI Configuration
  {
    type: 'personalityNode',
    label: 'AI Personality',
    description: 'Define the tone, persona, and language for AI responses',
    icon: <UserCircle size={18} />,
    color: getNodeColorClass('personalityNode'),
    category: 'AI Configuration',
    config: { persona: 'professional', tone: 'formal', language: 'en' },
  },
  {
    type: 'codeReviewNode',
    label: 'Code Review',
    description: 'AI-powered code review for security issues and best practices',
    icon: <FileCode size={18} />,
    color: getNodeColorClass('codeReviewNode'),
    category: 'AI Configuration',
    config: { reviewType: 'security', language: 'auto', minSeverity: 'medium' },
  },
  {
    type: 'mcpContextNode',
    label: 'MCP Context',
    description: 'Connect to external tools and data via Model Context Protocol',
    icon: <Plug size={18} />,
    color: getNodeColorClass('mcpContextNode'),
    category: 'AI Configuration',
    config: { protocol: 'stdio' },
  },
  // Audit & Compliance
  {
    type: 'auditNode',
    label: 'Audit Trail',
    description: 'Log every workflow decision for regulatory audit compliance',
    icon: <ScrollText size={18} />,
    color: getNodeColorClass('auditNode'),
    category: 'Audit & Compliance',
    config: { auditLevel: 'full', retentionDays: 90, logFormat: 'json', enabled: true },
  },
  // Workflow Control
  {
    type: 'conditionalNode',
    label: 'Conditional Logic',
    description: 'Branch your workflow based on if/else conditions',
    icon: <GitBranch size={18} />,
    color: getNodeColorClass('conditionalNode'),
    category: 'Workflow Control',
    config: { field: '', operator: 'equals', value: '' },
  },
  {
    type: 'approvalGateNode',
    label: 'Approval Gate',
    description: 'Pause workflow until a human reviewer approves or rejects',
    icon: <ShieldCheck size={18} />,
    color: getNodeColorClass('approvalGateNode'),
    category: 'Workflow Control',
    config: { approvalType: 'single', approvers: [], requireAll: true, approvalStatus: 'pending' },
  },
  // Compliance Frameworks
  {
    type: 'complianceDashboardNode',
    label: 'Compliance Report',
    description: 'Generate PDF compliance reports for GDPR, SOC2, or ISO 27001',
    icon: <BarChart3 size={18} />,
    color: getNodeColorClass('complianceDashboardNode'),
    category: 'Compliance Frameworks',
    config: { frameworks: [], reportFormat: 'pdf', autoGenerate: true },
  },
  {
    type: 'modelRegistryNode',
    label: 'Model Registry',
    description: 'Track AI model versions, risk levels, and EU AI Act classification',
    icon: <Brain size={18} />,
    color: getNodeColorClass('modelRegistryNode'),
    category: 'Compliance Frameworks',
    config: { modelName: '', riskLevel: 'unclassified', modelVersion: '1.0' },
  },
  {
    type: 'evidenceCollectionNode',
    label: 'Evidence Collection',
    description: 'Collect and package audit artifacts for SOC2 or ISO reviews',
    icon: <Archive size={18} />,
    color: getNodeColorClass('evidenceCollectionNode'),
    category: 'Compliance Frameworks',
    config: { artifactTypes: ['logs', 'configs'], targetFramework: 'soc2', autoPackage: true },
  },
  // AI Testing
  {
    type: 'biasTestingNode',
    label: 'Bias & Fairness',
    description: 'Test AI outputs for demographic bias and disparate impact',
    icon: <Scale size={18} />,
    color: getNodeColorClass('biasTestingNode'),
    category: 'AI Testing',
    config: { testType: 'disparate_impact', protectedAttributes: [], threshold: 0.8 },
  },
  {
    type: 'explainabilityNode',
    label: 'Explainability (XAI)',
    description: 'Generate human-readable explanations for AI decisions',
    icon: <Lightbulb size={18} />,
    color: getNodeColorClass('explainabilityNode'),
    category: 'AI Testing',
    config: { method: 'feature_importance', model: 'llama3.2:3b', detailLevel: 'summary' },
  },
  {
    type: 'redTeamingNode',
    label: 'Red Teaming',
    description: 'Stress-test AI models for prompt injection and adversarial attacks',
    icon: <Bug size={18} />,
    color: getNodeColorClass('redTeamingNode'),
    category: 'AI Testing',
    config: { attackVectors: ['prompt_injection'], minSeverity: 'medium', iterations: 10 },
  },
  {
    type: 'driftDetectionNode',
    label: 'Drift Detection',
    description: 'Monitor AI output consistency and detect model degradation over time',
    icon: <Activity size={18} />,
    color: getNodeColorClass('driftDetectionNode'),
    category: 'AI Testing',
    config: { metric: 'output_similarity', driftThreshold: 0.15, schedule: 'daily' },
  },
  // Communication
  {
    type: 'voiceAssistantNode',
    label: 'Voice Assistant',
    description: 'Voice-to-text input with real-time transcription via Whisper',
    icon: <Mic size={18} />,
    color: getNodeColorClass('voiceAssistantNode'),
    category: 'Communication',
    config: { transcription_model: 'small', language: 'en', realtime_preview: false, use_backend: false, personaplex_enabled: false, personaplex_url: '', persona_prompt: '', voice_embedding: '' },
  },
  {
    type: 'notificationNode',
    label: 'Notification',
    description: 'Send alerts via webhook when workflow events occur',
    icon: <Bell size={18} />,
    color: getNodeColorClass('notificationNode'),
    category: 'Communication',
    config: { channel: 'webhook', messageTemplate: '' },
  },
  {
    type: 'webhookGatewayNode',
    label: 'API Gateway',
    description: 'Expose your workflow as a REST API endpoint with authentication',
    icon: <Radio size={18} />,
    color: getNodeColorClass('webhookGatewayNode'),
    category: 'Communication',
    config: { method: 'POST', authType: 'api_key', endpointPath: '/api/workflow' },
  },
  {
    type: 'subWorkflowNode',
    label: 'Sub-Workflow',
    description: 'Execute another saved workflow as a step in this one',
    icon: <Layers size={18} />,
    color: getNodeColorClass('subWorkflowNode'),
    category: 'Communication',
    config: { targetWorkflowId: '', targetWorkflowName: '', passData: true },
  },
  // Security
  {
    type: 'encryptionNode',
    label: 'Encryption',
    description: 'Encrypt or decrypt data using AES-256 before storage or transit',
    icon: <Lock size={18} />,
    color: getNodeColorClass('encryptionNode'),
    category: 'Security',
    config: { algorithm: 'aes-256-gcm', operation: 'encrypt' },
  },
  // Healthcare
  {
    type: 'phiClassificationNode',
    label: 'PHI Classification',
    description: 'Detect and de-identify Protected Health Information per HIPAA Safe Harbor',
    icon: <HeartPulse size={18} />,
    color: getNodeColorClass('phiClassificationNode'),
    category: 'Healthcare',
    config: { deidentMethod: 'safe_harbor', identifiers: [] },
  },
  {
    type: 'consentManagementNode',
    label: 'Consent Check',
    description: 'Verify patient or user consent before processing sensitive data',
    icon: <UserCheck size={18} />,
    color: getNodeColorClass('consentManagementNode'),
    category: 'Healthcare',
    config: { regulation: 'hipaa', consentType: 'explicit', blockOnMissing: true },
  },
  // Fintech
  {
    type: 'fairLendingNode',
    label: 'Fair Lending',
    description: 'Analyze lending decisions for ECOA compliance and discrimination risk',
    icon: <Landmark size={18} />,
    color: getNodeColorClass('fairLendingNode'),
    category: 'Fintech',
    config: { regulation: 'ecoa', analysisType: 'disparate_impact', protectedClasses: [] },
  },
  // Insurance
  {
    type: 'claimsAuditNode',
    label: 'Claims Audit',
    description: 'Audit insurance claim decisions for auto-denial patterns and bias',
    icon: <FileCheck size={18} />,
    color: getNodeColorClass('claimsAuditNode'),
    category: 'Insurance',
    config: { auditType: 'full', flagAutoDenials: true, generateExplanation: true },
  },
  // Team Collaboration
  {
    type: 'slackComplianceNode',
    label: 'Slack Compliance',
    description: 'Scan Slack messages for PII leaks and compliance violations',
    icon: <MessageSquare size={18} />,
    color: getNodeColorClass('slackComplianceNode'),
    category: 'Team Collaboration',
    config: { authType: 'oauth', scanMode: 'batch', detectPII: true, extractDocs: false, maxMessages: 1000 },
  },
  {
    type: 'microsoftTeamsDORANode',
    label: 'MS Teams DORA',
    description: 'Monitor MS Teams for ICT incident keywords per DORA regulation',
    icon: <ShieldAlert size={18} />,
    color: getNodeColorClass('microsoftTeamsDORANode'),
    category: 'Team Collaboration',
    config: { monitoringMode: 'ict_incidents', alertWindow: 240, keywords: 'outage, incident, breach, failure, downtime' },
  },
  // Data Sources (additional)
  {
    type: 'databaseCreatorNode',
    label: 'Database Creator',
    description: 'Spin up a new SQLite database on the fly for local storage',
    icon: <DatabaseZap size={18} />,
    color: getNodeColorClass('databaseCreatorNode'),
    category: 'Data Sources',
    config: { dbType: 'sqlite', databaseName: 'compliance_db', encrypted: false },
  },
  {
    type: 'localFolderStorageNode',
    label: 'Local Folder',
    description: 'Read files from a local directory — supports PDF, DOCX, and more',
    icon: <FolderOpen size={18} />,
    color: getNodeColorClass('localFolderStorageNode'),
    category: 'Data Sources',
    config: { operation: 'list', filePattern: '*.pdf, *.docx', recursive: false },
  },
  {
    type: 'cloudDocumentNode',
    label: 'Cloud Documents',
    description: 'Connect to Google Drive, Dropbox, or MEGA to import documents',
    icon: <Cloud size={18} />,
    color: getNodeColorClass('cloudDocumentNode'),
    category: 'Data Sources',
    config: { provider: 'google_drive', operation: 'list', folderId: 'root', maxResults: 100 },
  },
  // Audit & Compliance (additional)
  {
    type: 'jiraComplianceNode',
    label: 'Jira Compliance',
    description: 'Analyze Jira tickets for compliance resolution times and SLA gaps',
    icon: <Ticket size={18} />,
    color: getNodeColorClass('jiraComplianceNode'),
    category: 'Audit & Compliance',
    config: { authType: 'oauth', analysisType: 'resolution_time', jqlQuery: 'project = COMP AND status != Closed', includeChangelog: false },
  },
  // Fintech (additional)
  {
    type: 'sapERPNode',
    label: 'SAP ERP',
    description: 'Pull financial reports from SAP ERP for compliance analysis',
    icon: <Building2 size={18} />,
    color: getNodeColorClass('sapERPNode'),
    category: 'Fintech',
    config: { reportType: 'balance_sheet', fiscalYear: '2025', companyCode: '1000', authType: 'oauth', includeActuals: true, includeBudget: false },
  },
]

const categories = ['Triggers', 'Data Sources', 'Documents', 'AI Models', 'Compliance', 'Outputs', 'Containers', 'Data Processing', 'AI Configuration', 'Audit & Compliance', 'Workflow Control', 'Compliance Frameworks', 'AI Testing', 'Communication', 'Team Collaboration', 'Security', 'Healthcare', 'Fintech', 'Insurance']

export function Sidebar() {
  const dockerAvailable = useDockerStore((s) => s.dockerAvailable)
  const [searchQuery, setSearchQuery] = useState('')

  const onDragStart = (event: DragEvent, template: NodeTemplate) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(template))
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <aside data-tutorial="sidebar" className="flex h-full w-64 flex-col border-r border-[var(--nomu-border)] bg-[var(--nomu-bg-secondary)]">
      {/* Header */}
      <div className="border-b border-[var(--nomu-border)] p-4">
        <img src={nomuLogo} alt="NOMU" className="h-6 [filter:var(--nomu-logo-filter)]" draggable={false} />
        <p className="mt-1 text-xs text-[var(--nomu-text-muted)]">Local AI Workflow Builder</p>
      </div>

      {/* Search */}
      <div className="p-3">
        <div className="flex items-center gap-2 rounded-lg bg-[var(--nomu-surface)] px-3 py-2">
          <Search size={16} className="text-[var(--nomu-text-muted)]" />
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-[var(--nomu-text)] placeholder-[var(--nomu-text-muted)] outline-none"
          />
        </div>
      </div>

      {/* Node Palette */}
      <div className="flex-1 overflow-y-auto p-3">
        {categories.map((category) => {
          const filtered = nodeTemplates.filter(
            (t) => t.category === category && t.label.toLowerCase().includes(searchQuery.toLowerCase())
          )
          if (filtered.length === 0) return null
          return (
            <div key={category} className="mb-4" data-tutorial={`category-${category.toLowerCase().replace(/\s+/g, '-')}`}>
              <h3 className="mb-2 font-['Barlow'] text-xs font-semibold uppercase tracking-wider text-[var(--nomu-text-muted)]">
                {category}
                {category === 'Containers' && (
                  <span className={`ml-1.5 inline-block h-1.5 w-1.5 rounded-full ${dockerAvailable ? 'bg-green-500' : 'bg-[var(--nomu-text-muted)]'}`} />
                )}
              </h3>
              <div className="space-y-1">
                {filtered
                  .map((template, index) => (
                    <div
                      key={`${template.type}-${index}`}
                      draggable
                      onDragStart={(e) => onDragStart(e, template)}
                      className="group relative flex cursor-grab items-center gap-2 rounded-lg px-3 py-2 transition-all duration-150 hover:bg-[var(--nomu-surface-hover)] active:cursor-grabbing"
                    >
                      <div className={`rounded p-1.5 text-white ${template.color}`}>
                        {template.icon}
                      </div>
                      <span className="text-sm text-[var(--nomu-text)]">{template.label}</span>
                      {/* Hover tooltip */}
                      <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-[var(--nomu-surface)] px-3 py-2 text-xs text-[var(--nomu-text-muted)] opacity-0 shadow-xl ring-1 ring-[var(--nomu-border)] transition-opacity duration-200 group-hover:opacity-100">
                        <div className="absolute -left-1 top-1/2 -translate-y-1/2 rotate-45 h-2 w-2 bg-[var(--nomu-surface)] ring-1 ring-[var(--nomu-border)] [clip-path:polygon(0_0,0_100%,100%_100%)]" />
                        {template.description}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )
        })}
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
