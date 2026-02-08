import { useState } from 'react'
import type { Node } from '@xyflow/react'
import { MessageSquare, CheckCircle2, XCircle, RefreshCw, Save } from 'lucide-react'
import { Button, Input, Select } from '../../common'
import { api } from '../../../services/api'

interface OutputNodeConfigProps {
  node: Node
  onUpdate: (data: Record<string, unknown>) => void
  onOpenChat?: () => void
}

export function OutputNodeConfig({ node, onUpdate, onOpenChat }: OutputNodeConfigProps) {
  const config = (node.data as Record<string, unknown>).config as Record<string, unknown> || {}
  const outputType = (config.outputType as string) || 'chat'

  if (outputType === 'email') return <EmailOutputConfig config={config} onUpdate={onUpdate} />
  if (outputType === 'spreadsheet') return <SpreadsheetOutputConfig config={config} onUpdate={onUpdate} />
  if (outputType === 'telegram') return <TelegramOutputConfig config={config} onUpdate={onUpdate} />
  return <ChatOutputConfig config={config} onUpdate={onUpdate} onOpenChat={onOpenChat} />
}

// --- EMAIL OUTPUT CONFIG ---
function EmailOutputConfig({
  config,
  onUpdate,
}: {
  config: Record<string, unknown>
  onUpdate: (data: Record<string, unknown>) => void
}) {
  const [smtpHost, setSmtpHost] = useState((config.smtpHost as string) ?? 'smtp.gmail.com')
  const [smtpPort, setSmtpPort] = useState((config.smtpPort as number) ?? 587)
  const [smtpUsername, setSmtpUsername] = useState((config.smtpUsername as string) ?? '')
  const [smtpPassword, setSmtpPassword] = useState((config.smtpPassword as string) ?? '')
  const [useTls, setUseTls] = useState((config.useTls as boolean) ?? true)
  const [fromName, setFromName] = useState((config.fromName as string) ?? '')
  const [toEmail, setToEmail] = useState((config.toEmail as string) ?? '')
  const [ccEmail, setCcEmail] = useState((config.ccEmail as string) ?? '')
  const [subject, setSubject] = useState((config.subject as string) ?? '')
  const [bodyType, setBodyType] = useState((config.bodyType as string) ?? 'html')
  const [format, setFormat] = useState((config.format as string) ?? 'text')
  const [showSaved, setShowSaved] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleTest = async () => {
    setIsTesting(true)
    setTestResult(null)
    try {
      const result = await api.testEmailConfig({
        smtp_host: smtpHost,
        smtp_port: smtpPort,
        smtp_username: smtpUsername,
        smtp_password: smtpPassword,
        use_tls: useTls,
      })
      setTestResult(result)
    } catch (err) {
      setTestResult({ success: false, message: err instanceof Error ? err.message : 'Connection failed' })
    }
    setIsTesting(false)
  }

  const handleSave = () => {
    onUpdate({
      config: { ...config, outputType: 'email', smtpHost, smtpPort, smtpUsername, smtpPassword, useTls, fromName, toEmail, ccEmail, subject, bodyType, format },
    })
    setShowSaved(true)
    setTimeout(() => setShowSaved(false), 2000)
  }

  return (
    <div className="space-y-6 p-4">
      {showSaved && (
        <div className="flex items-center gap-2 text-green-400 text-sm bg-green-900/30 rounded-lg px-3 py-2">
          <CheckCircle2 size={16} />
          <span>Configuration saved!</span>
        </div>
      )}

      {/* SMTP Settings */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-[var(--nomu-text)]">SMTP Settings</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <Input label="SMTP Host" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.gmail.com" />
            </div>
            <Input label="Port" type="number" value={smtpPort} onChange={(e) => setSmtpPort(parseInt(e.target.value) || 587)} />
          </div>
          <Input label="Username" value={smtpUsername} onChange={(e) => setSmtpUsername(e.target.value)} placeholder="user@gmail.com" />
          <Input label="Password" type="password" value={smtpPassword} onChange={(e) => setSmtpPassword(e.target.value)} placeholder="App password" />
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={useTls} onChange={(e) => setUseTls(e.target.checked)} className="h-4 w-4 rounded border-[var(--nomu-border)] bg-[var(--nomu-bg)] text-[var(--nomu-primary)]" />
            <span className="text-sm text-[var(--nomu-text-muted)]">Use TLS</span>
          </label>
        </div>
      </div>

      {/* Test Connection */}
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={handleTest} disabled={isTesting || !smtpHost || !smtpUsername} isLoading={isTesting} leftIcon={<RefreshCw size={14} />}>
          Test Connection
        </Button>
        {testResult && (
          <div className={`flex items-center gap-1 text-sm ${testResult.success ? 'text-green-400' : 'text-red-400'}`}>
            {testResult.success ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
            <span>{testResult.success ? 'Connected' : 'Failed'}</span>
          </div>
        )}
      </div>

      {/* Message Settings */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-[var(--nomu-text)]">Message</h3>
        <div className="space-y-3">
          <Input label="From Name" value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="Compliance Ready AI" />
          <Input label="To Email(s)" value={toEmail} onChange={(e) => setToEmail(e.target.value)} placeholder="recipient@example.com" helperText="Comma-separated for multiple" />
          <Input label="CC (optional)" value={ccEmail} onChange={(e) => setCcEmail(e.target.value)} placeholder="cc@example.com" />
          <Input label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Workflow Results" />
          <div className="grid grid-cols-2 gap-2">
            <Select label="Body Type" options={[{ value: 'html', label: 'HTML' }, { value: 'plain', label: 'Plain Text' }]} value={bodyType} onChange={(e) => setBodyType(e.target.value)} />
            <Select label="Output Format" options={[{ value: 'text', label: 'Plain Text' }, { value: 'json', label: 'JSON' }, { value: 'markdown', label: 'Markdown' }]} value={format} onChange={(e) => setFormat(e.target.value)} />
          </div>
        </div>
      </div>

      <Button variant="primary" onClick={handleSave} leftIcon={<Save size={14} />} className="w-full">
        Save Configuration
      </Button>
    </div>
  )
}

// --- SPREADSHEET OUTPUT CONFIG ---
function SpreadsheetOutputConfig({
  config,
  onUpdate,
}: {
  config: Record<string, unknown>
  onUpdate: (data: Record<string, unknown>) => void
}) {
  const [fileFormat, setFileFormat] = useState((config.fileFormat as string) ?? 'csv')
  const [filename, setFilename] = useState((config.filename as string) ?? 'output-{timestamp}')
  const [includeHeaders, setIncludeHeaders] = useState((config.includeHeaders as boolean) ?? true)
  const [maxRows, setMaxRows] = useState((config.maxRows as number) ?? 1000)
  const [encoding, setEncoding] = useState((config.encoding as string) ?? 'utf-8')
  const [showSaved, setShowSaved] = useState(false)

  const handleSave = () => {
    onUpdate({
      config: { ...config, outputType: 'spreadsheet', fileFormat, filename, includeHeaders, maxRows, encoding },
    })
    setShowSaved(true)
    setTimeout(() => setShowSaved(false), 2000)
  }

  return (
    <div className="space-y-6 p-4">
      {showSaved && (
        <div className="flex items-center gap-2 text-green-400 text-sm bg-green-900/30 rounded-lg px-3 py-2">
          <CheckCircle2 size={16} />
          <span>Configuration saved!</span>
        </div>
      )}

      {/* File Settings */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-[var(--nomu-text)]">File Settings</h3>
        <div className="space-y-3">
          <Select label="Format" options={[{ value: 'csv', label: 'CSV' }, { value: 'xlsx', label: 'Excel (XLSX)' }]} value={fileFormat} onChange={(e) => setFileFormat(e.target.value)} />
          <Input label="Filename Template" value={filename} onChange={(e) => setFilename(e.target.value)} placeholder="output-{timestamp}" helperText="{timestamp} will be replaced with current date" />
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={includeHeaders} onChange={(e) => setIncludeHeaders(e.target.checked)} className="h-4 w-4 rounded border-[var(--nomu-border)] bg-[var(--nomu-bg)] text-[var(--nomu-primary)]" />
            <span className="text-sm text-[var(--nomu-text-muted)]">Include column headers</span>
          </label>
        </div>
      </div>

      {/* Output Settings */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-[var(--nomu-text)]">Output Settings</h3>
        <div className="space-y-3">
          <Input label="Max Rows" type="number" value={maxRows} onChange={(e) => setMaxRows(parseInt(e.target.value) || 1000)} min="1" max="100000" />
          <Select label="Encoding" options={[{ value: 'utf-8', label: 'UTF-8' }, { value: 'ascii', label: 'ASCII' }]} value={encoding} onChange={(e) => setEncoding(e.target.value)} />
        </div>
      </div>

      <Button variant="primary" onClick={handleSave} leftIcon={<Save size={14} />} className="w-full">
        Save Configuration
      </Button>
    </div>
  )
}

// --- TELEGRAM OUTPUT CONFIG ---
function TelegramOutputConfig({
  config,
  onUpdate,
}: {
  config: Record<string, unknown>
  onUpdate: (data: Record<string, unknown>) => void
}) {
  const [botToken, setBotToken] = useState((config.botToken as string) ?? '')
  const [chatId, setChatId] = useState((config.chatId as string) ?? '')
  const [parseMode, setParseMode] = useState((config.parseMode as string) ?? 'Markdown')
  const [messageTemplate, setMessageTemplate] = useState((config.messageTemplate as string) ?? 'Workflow Results:\n\n{output}')
  const [disableNotification, setDisableNotification] = useState((config.disableNotification as boolean) ?? false)
  const [showSaved, setShowSaved] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleTest = async () => {
    setIsTesting(true)
    setTestResult(null)
    try {
      const result = await api.testTelegramConfig({ bot_token: botToken })
      setTestResult(result)
    } catch (err) {
      setTestResult({ success: false, message: err instanceof Error ? err.message : 'Test failed' })
    }
    setIsTesting(false)
  }

  const handleSave = () => {
    onUpdate({
      config: { ...config, outputType: 'telegram', botToken, chatId, parseMode, messageTemplate, disableNotification },
    })
    setShowSaved(true)
    setTimeout(() => setShowSaved(false), 2000)
  }

  return (
    <div className="space-y-6 p-4">
      {showSaved && (
        <div className="flex items-center gap-2 text-green-400 text-sm bg-green-900/30 rounded-lg px-3 py-2">
          <CheckCircle2 size={16} />
          <span>Configuration saved!</span>
        </div>
      )}

      {/* Bot Settings */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-[var(--nomu-text)]">Bot Settings</h3>
        <div className="space-y-3">
          <Input label="Bot Token" type="password" value={botToken} onChange={(e) => setBotToken(e.target.value)} placeholder="123456:ABC-DEF..." />
          <Input label="Chat ID" value={chatId} onChange={(e) => setChatId(e.target.value)} placeholder="-1001234567890" helperText="Group/channel ID or user ID" />
        </div>
      </div>

      {/* Test Bot */}
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={handleTest} disabled={isTesting || !botToken} isLoading={isTesting} leftIcon={<RefreshCw size={14} />}>
          Test Bot
        </Button>
        {testResult && (
          <div className={`flex items-center gap-1 text-sm ${testResult.success ? 'text-green-400' : 'text-red-400'}`}>
            {testResult.success ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
            <span>{testResult.success ? 'Valid' : 'Failed'}</span>
          </div>
        )}
      </div>

      {/* Message Settings */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-[var(--nomu-text)]">Message Settings</h3>
        <div className="space-y-3">
          <Select label="Parse Mode" options={[{ value: 'Markdown', label: 'Markdown' }, { value: 'HTML', label: 'HTML' }]} value={parseMode} onChange={(e) => setParseMode(e.target.value)} />
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--nomu-text-muted)]">Message Template</label>
            <textarea
              value={messageTemplate}
              onChange={(e) => setMessageTemplate(e.target.value)}
              className="w-full rounded-lg border border-[var(--nomu-border)] bg-[var(--nomu-surface)] px-3 py-2 font-mono text-sm text-[var(--nomu-text)] placeholder-[var(--nomu-text-muted)]"
              rows={4}
              placeholder="Workflow Results:\n\n{output}"
            />
            <p className="mt-1 text-xs text-[var(--nomu-text-muted)]">{'{output}'} will be replaced with workflow results</p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={disableNotification} onChange={(e) => setDisableNotification(e.target.checked)} className="h-4 w-4 rounded border-[var(--nomu-border)] bg-[var(--nomu-bg)] text-[var(--nomu-primary)]" />
            <span className="text-sm text-[var(--nomu-text-muted)]">Disable notification sound</span>
          </label>
        </div>
      </div>

      <Button variant="primary" onClick={handleSave} leftIcon={<Save size={14} />} className="w-full">
        Save Configuration
      </Button>
    </div>
  )
}

// --- CHAT OUTPUT CONFIG ---
function ChatOutputConfig({
  config,
  onUpdate,
  onOpenChat,
}: {
  config: Record<string, unknown>
  onUpdate: (data: Record<string, unknown>) => void
  onOpenChat?: () => void
}) {
  const [systemPrompt, setSystemPrompt] = useState((config.systemPrompt as string) ?? '')
  const [maxHistory, setMaxHistory] = useState((config.maxHistory as number) ?? 50)
  const [showDataSources, setShowDataSources] = useState((config.showDataSources as boolean) ?? true)
  const [autoOpen, setAutoOpen] = useState((config.autoOpen as boolean) ?? false)
  const [displayFormat, setDisplayFormat] = useState((config.displayFormat as string) ?? 'bubbles')
  const [showSaved, setShowSaved] = useState(false)

  const handleSave = () => {
    onUpdate({
      config: { ...config, outputType: 'chat', systemPrompt, maxHistory, showDataSources, autoOpen, displayFormat },
    })
    setShowSaved(true)
    setTimeout(() => setShowSaved(false), 2000)
  }

  return (
    <div className="space-y-6 p-4">
      {showSaved && (
        <div className="flex items-center gap-2 text-green-400 text-sm bg-green-900/30 rounded-lg px-3 py-2">
          <CheckCircle2 size={16} />
          <span>Configuration saved!</span>
        </div>
      )}

      {/* Chat Settings */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-[var(--nomu-text)]">Chat Settings</h3>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--nomu-text-muted)]">System Prompt Override</label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full rounded-lg border border-[var(--nomu-border)] bg-[var(--nomu-surface)] px-3 py-2 font-mono text-sm text-[var(--nomu-text)] placeholder-[var(--nomu-text-muted)]"
              rows={3}
              placeholder="Optional: Override the default system prompt..."
            />
          </div>
          <Input label="Max History Messages" type="number" value={maxHistory} onChange={(e) => setMaxHistory(parseInt(e.target.value) || 50)} min="1" max="500" />
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={showDataSources} onChange={(e) => setShowDataSources(e.target.checked)} className="h-4 w-4 rounded border-[var(--nomu-border)] bg-[var(--nomu-bg)] text-[var(--nomu-primary)]" />
            <span className="text-sm text-[var(--nomu-text-muted)]">Show data sources in chat</span>
          </label>
        </div>
      </div>

      {/* Display Settings */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-[var(--nomu-text)]">Display</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={autoOpen} onChange={(e) => setAutoOpen(e.target.checked)} className="h-4 w-4 rounded border-[var(--nomu-border)] bg-[var(--nomu-bg)] text-[var(--nomu-primary)]" />
            <span className="text-sm text-[var(--nomu-text-muted)]">Auto-open on workflow run</span>
          </label>
          <Select label="Display Format" options={[{ value: 'bubbles', label: 'Chat Bubbles' }, { value: 'raw', label: 'Raw Output' }]} value={displayFormat} onChange={(e) => setDisplayFormat(e.target.value)} />
        </div>
      </div>

      {/* Open Chat Window */}
      <Button variant="secondary" onClick={onOpenChat} leftIcon={<MessageSquare size={14} />} className="w-full">
        Open Chat Window
      </Button>

      <Button variant="primary" onClick={handleSave} leftIcon={<Save size={14} />} className="w-full">
        Save Configuration
      </Button>
    </div>
  )
}
