import { useState, useEffect } from 'react'
import type { Node } from '@xyflow/react'
import { Bot, CheckCircle2, Loader2, Save, Sparkles } from 'lucide-react'
import { Button, Input, Select } from '../../common'
import { api } from '../../../services/api'

interface PromptPreset {
  id: string
  label: string
  icon: string
  description: string
  systemPrompt: string
  prompt: string
  recommendedTemp: number
}

const PROMPT_PRESETS: PromptPreset[] = [
  {
    id: 'custom',
    label: 'Custom',
    icon: '✏️',
    description: 'Write your own system prompt and instructions',
    systemPrompt: '',
    prompt: '',
    recommendedTemp: 0.0,
  },
  {
    id: 'gdpr_audit',
    label: 'GDPR Compliance Audit',
    icon: '🇪🇺',
    description: 'Assess data protection compliance under EU GDPR',
    systemPrompt:
      'You are a senior data protection officer specializing in EU General Data Protection Regulation (GDPR). You have deep expertise in Articles 5-9 (lawfulness of processing), Articles 12-23 (data subject rights), Articles 24-43 (controller/processor obligations), and Articles 44-49 (international data transfers). You assess documents with precision, citing specific GDPR articles when identifying gaps.\n\nYou MUST structure every report using exactly these sections in this order:\n\n# Executive Summary\nBrief overview of the document analyzed, parties involved, and overall compliance posture.\n\n# Compliance Assessment\nDetailed assessment per framework. Include a markdown table:\n| Framework | Compliance Status | Key Article | Notes |\n\n# Findings\n## Gaps in Compliance Provisions\nBullet list of identified gaps.\n## Confirmations of Compliance\nBullet list of confirmed compliant areas.\n\n# Recommendations\n## General Recommendations\nNumbered list of broad recommendations.\n## Specific Recommendations\nNumbered list of targeted, actionable items.\n\n# Evidence References\nBullet list of specific clauses, articles, or sections referenced.',
    prompt:
      'Analyze the provided data for GDPR compliance. Fill in each section of the report template with your analysis. Be thorough in the Compliance Assessment table and cite specific GDPR articles throughout.',
    recommendedTemp: 0.2,
  },
  {
    id: 'soc2_assessment',
    label: 'SOC 2 Assessment',
    icon: '🔒',
    description: 'Evaluate controls against SOC 2 Trust Service Criteria',
    systemPrompt:
      'You are a certified SOC 2 auditor with expertise in the AICPA Trust Service Criteria (TSC). You evaluate organizations against the five trust service categories: Security (CC), Availability, Processing Integrity, Confidentiality, and Privacy. You reference specific control criteria (CC1-CC9) and provide gap analysis aligned with SOC 2 Type II requirements.\n\nYou MUST structure every report using exactly these sections in this order:\n\n# Executive Summary\nBrief overview of the document analyzed, scope, and overall SOC 2 readiness posture.\n\n# Compliance Assessment\nDetailed assessment per trust service category. Include a markdown table:\n| Category | Control ID | Status | Evidence | Notes |\n\n# Findings\n## Gaps in Compliance Provisions\nBullet list of identified control deficiencies.\n## Confirmations of Compliance\nBullet list of confirmed effective controls.\n\n# Recommendations\n## General Recommendations\nNumbered list of broad recommendations.\n## Specific Recommendations\nNumbered list of targeted, actionable items with estimated effort.\n\n# Evidence References\nBullet list of specific controls, criteria, or sections referenced.',
    prompt:
      'Evaluate the upstream data against SOC 2 Trust Service Criteria. Fill in each section of the report template. Focus on Security (CC) criteria as the primary category and provide an overall readiness assessment.',
    recommendedTemp: 0.2,
  },
  {
    id: 'ai_act_risk',
    label: 'EU AI Act Risk Assessment',
    icon: '🤖',
    description: 'Classify AI system risk and assess compliance with EU AI Act',
    systemPrompt:
      'You are an AI governance specialist with deep knowledge of the EU AI Act (Regulation 2024/1689). You classify AI systems by risk level (Unacceptable, High-Risk, Limited Risk, Minimal Risk) per Annex III, assess conformity requirements under Articles 8-15, and evaluate transparency obligations. You advise on technical documentation (Article 11), record-keeping (Article 12), and human oversight (Article 14).\n\nYou MUST structure every report using exactly these sections in this order:\n\n# Executive Summary\nBrief overview of the AI system analyzed, risk classification, and overall compliance posture.\n\n# Compliance Assessment\nDetailed assessment per AI Act requirement. Include a markdown table:\n| Article | Requirement | Status | Priority | Notes |\n\n# Findings\n## Gaps in Compliance Provisions\nBullet list of identified compliance gaps.\n## Confirmations of Compliance\nBullet list of confirmed compliant areas.\n\n# Recommendations\n## General Recommendations\nNumbered list of broad recommendations.\n## Specific Recommendations\nNumbered list of targeted, actionable items.\n\n# Evidence References\nBullet list of specific articles, annexes, or sections referenced.',
    prompt:
      'Assess the AI system described in the upstream data for EU AI Act compliance. Fill in each section of the report template. Determine the risk classification per Annex III and evaluate against Articles 8-15.',
    recommendedTemp: 0.3,
  },
  {
    id: 'contract_review',
    label: 'Contract & NDA Review',
    icon: '📝',
    description: 'Analyze contracts for compliance risks and missing clauses',
    systemPrompt:
      'You are a corporate legal compliance analyst specializing in contract review. You assess agreements for regulatory compliance, missing protective clauses, ambiguous terms, and liability exposure. You identify data protection clauses (DPA requirements), intellectual property provisions, limitation of liability terms, and termination rights. You flag any terms that could expose the organization to undue risk.\n\nYou MUST structure every report using exactly these sections in this order:\n\n# Executive Summary\nBrief overview of the agreement type, parties involved, key terms, and overall compliance posture.\n\n# Compliance Assessment\nDetailed assessment of required clauses. Include a markdown table:\n| Clause | Present | Adequate | Risk Level | Notes |\n\n# Findings\n## Gaps in Compliance Provisions\nBullet list of missing or inadequate clauses.\n## Confirmations of Compliance\nBullet list of well-drafted protective clauses.\n\n# Recommendations\n## General Recommendations\nNumbered list of broad recommendations.\n## Specific Recommendations\nNumbered list of targeted amendments or additions.\n\n# Evidence References\nBullet list of specific clauses, sections, or regulations referenced.',
    prompt:
      'Review the provided contract/agreement for compliance. Fill in each section of the report template. Check for: Data Protection, Confidentiality, IP Rights, Liability Limitation, Termination, Force Majeure, Governing Law, and Dispute Resolution clauses.',
    recommendedTemp: 0.2,
  },
  {
    id: 'data_processing',
    label: 'Data Processing Audit',
    icon: '🗄️',
    description: 'Audit data processing activities against privacy regulations',
    systemPrompt:
      'You are a privacy engineer specializing in data processing impact assessments (DPIA). You evaluate data collection, storage, processing, and sharing practices against GDPR, CCPA, and industry-specific regulations. You assess data minimization, purpose limitation, storage limitation, and technical/organizational security measures. You identify risks to data subjects and recommend privacy-by-design improvements.\n\nYou MUST structure every report using exactly these sections in this order:\n\n# Executive Summary\nBrief overview of the data processing activities analyzed and overall compliance posture.\n\n# Compliance Assessment\nDetailed assessment per data category. Include a markdown table:\n| Data Type | Purpose | Legal Basis | Retention | Status | Notes |\n\n# Findings\n## Gaps in Compliance Provisions\nBullet list of identified data protection gaps.\n## Confirmations of Compliance\nBullet list of confirmed compliant processing activities.\n\n# Recommendations\n## General Recommendations\nNumbered list of broad privacy improvements.\n## Specific Recommendations\nNumbered list of targeted, actionable items.\n\n# Evidence References\nBullet list of specific articles, clauses, or regulations referenced.',
    prompt:
      'Conduct a data processing audit of the provided information. Fill in each section of the report template. Categorize data as Personal, Special Category, Financial, or Health and assess each processing activity.',
    recommendedTemp: 0.2,
  },
  {
    id: 'security_posture',
    label: 'Security Posture Review',
    icon: '🛡️',
    description: 'Assess security controls against NIST/ISO 27001 frameworks',
    systemPrompt:
      'You are a cybersecurity compliance analyst with certifications in NIST CSF, ISO 27001, and CIS Controls. You evaluate organizational security posture across the five NIST functions: Identify, Protect, Detect, Respond, and Recover. You map findings to both NIST SP 800-53 controls and ISO 27001 Annex A controls, providing a unified compliance view.\n\nYou MUST structure every report using exactly these sections in this order:\n\n# Executive Summary\nBrief overview of the security scope analyzed and overall posture.\n\n# Compliance Assessment\nDetailed assessment per NIST function. Include a markdown table:\n| NIST Function | Control | ISO 27001 Mapping | Status | Evidence |\n\n# Findings\n## Gaps in Compliance Provisions\nBullet list of identified security gaps and vulnerabilities.\n## Confirmations of Compliance\nBullet list of confirmed effective controls.\n\n# Recommendations\n## General Recommendations\nNumbered list of broad security improvements.\n## Specific Recommendations\nNumbered list of targeted, actionable items with priority.\n\n# Evidence References\nBullet list of specific controls, standards, or sections referenced.',
    prompt:
      'Assess the security posture based on the upstream data. Fill in each section of the report template. Rate each NIST function on a 1-5 maturity scale and provide an overall security score.',
    recommendedTemp: 0.2,
  },
]

export function LLMNodeConfig({
  node,
  onUpdate,
}: {
  node: Node
  onUpdate: (data: Record<string, unknown>) => void
}) {
  const config = (node.data as Record<string, unknown>).config as Record<string, unknown> || {}

  const [selectedPreset, setSelectedPreset] = useState((config.selectedPreset as string) ?? 'custom')
  const [model, setModel] = useState((config.model as string) ?? 'llama3.2:3b')
  const [systemPrompt, setSystemPrompt] = useState((config.systemPrompt as string) ?? '')
  const [prompt, setPrompt] = useState((config.prompt as string) ?? '')
  const [temperature, setTemperature] = useState((config.temperature as number) ?? 0.7)
  const [maxTokens, setMaxTokens] = useState((config.maxTokens as number) ?? 2048)
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showSaved, setShowSaved] = useState(false)

  useEffect(() => {
    loadModels()
  }, [])

  const loadModels = async () => {
    setIsLoading(true)
    try {
      const result = await api.listModels()
      setAvailableModels(result.models.map((m) => m.name))
    } catch {
      setAvailableModels(['gemma4', 'llama3.2:3b', 'mistral', 'codellama'])
    }
    setIsLoading(false)
  }

  const handlePresetChange = (presetId: string) => {
    setSelectedPreset(presetId)
    const preset = PROMPT_PRESETS.find((p) => p.id === presetId)
    if (preset) {
      setSystemPrompt(preset.systemPrompt)
      setPrompt(preset.prompt)
      setTemperature(preset.recommendedTemp)
    }
  }

  const handleSave = () => {
    onUpdate({
      config: {
        ...config,
        selectedPreset,
        model,
        systemPrompt,
        prompt,
        temperature,
        maxTokens,
      },
      label: `AI Agent (${model})`,
    })
    setShowSaved(true)
    setTimeout(() => setShowSaved(false), 2000)
  }

  const getTempDescription = () => {
    if (temperature < 0.3) return 'Factual & deterministic responses'
    if (temperature < 0.7) return 'Balanced creativity & accuracy'
    if (temperature < 1.2) return 'Creative & varied responses'
    return 'Highly creative & unpredictable'
  }

  const getTempColor = () => {
    if (temperature < 0.3) return 'text-blue-400'
    if (temperature < 0.7) return 'text-green-400'
    if (temperature < 1.2) return 'text-orange-400'
    return 'text-red-400'
  }

  const activePreset = PROMPT_PRESETS.find((p) => p.id === selectedPreset)

  return (
    <div className="space-y-6">
      {/* Saved confirmation */}
      {showSaved && (
        <div className="flex items-center gap-2 text-green-400 text-sm bg-green-900/30 rounded-lg px-3 py-2">
          <CheckCircle2 size={16} />
          <span>AI Agent configured!</span>
        </div>
      )}

      {/* Info Box */}
      <div className="rounded-lg bg-[var(--nomu-primary)]/10 border border-[var(--nomu-primary)]/30 p-3">
        <p className="text-xs text-[var(--nomu-primary)]">
          <Bot size={12} className="inline mr-1" />
          Configure your AI agent's behavior. The agent will process data from upstream nodes.
        </p>
      </div>

      {/* Workflow Preset Selector */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={14} className="text-[var(--nomu-primary)]" />
          <label className="text-sm font-medium text-[var(--nomu-text-muted)]">Workflow Preset</label>
        </div>
        <div className="space-y-2">
          {PROMPT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handlePresetChange(preset.id)}
              className={`w-full text-left rounded-lg border p-3 transition-all ${selectedPreset === preset.id
                ? 'border-[var(--nomu-primary)] bg-[var(--nomu-primary)]/10'
                : 'border-[var(--nomu-border)] bg-[var(--nomu-surface)] hover:border-[var(--nomu-primary)]/50'
                }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{preset.icon}</span>
                <span className={`text-sm font-medium ${selectedPreset === preset.id ? 'text-[var(--nomu-primary)]' : 'text-[var(--nomu-text)]'
                  }`}>
                  {preset.label}
                </span>
              </div>
              <p className="text-xs text-[var(--nomu-text-muted)] mt-1 ml-7">
                {preset.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Active preset indicator */}
      {activePreset && activePreset.id !== 'custom' && (
        <div className="rounded-lg bg-[var(--nomu-primary)]/5 border border-[var(--nomu-primary)]/20 px-3 py-2">
          <p className="text-xs text-[var(--nomu-text-muted)]">
            <span className="text-[var(--nomu-primary)] font-medium">{activePreset.icon} {activePreset.label}</span> loaded — you can customize the prompts below
          </p>
        </div>
      )}

      {/* System Prompt */}
      <div>
        <label className="mb-2 block text-sm font-medium text-[var(--nomu-text-muted)]">System Prompt</label>
        <textarea
          value={systemPrompt}
          onChange={(e) => { setSystemPrompt(e.target.value); setSelectedPreset('custom') }}
          placeholder="You are a compliance analyst specializing in EU AI Act and SOC2..."
          rows={4}
          className="w-full rounded-lg bg-[var(--nomu-input-bg)] border border-[var(--nomu-border)] px-3 py-2 text-sm text-[var(--nomu-text)] placeholder:text-[var(--nomu-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--nomu-primary)] resize-y"
        />
        <p className="mt-1 text-xs text-[var(--nomu-text-muted)]">
          Sets the AI's role, expertise, and persona
        </p>
      </div>

      {/* User Prompt */}
      <div>
        <label className="mb-2 block text-sm font-medium text-[var(--nomu-text-muted)]">Prompt</label>
        <textarea
          value={prompt}
          onChange={(e) => { setPrompt(e.target.value); setSelectedPreset('custom') }}
          placeholder="Analyze the upstream data for compliance gaps and summarize findings by severity..."
          rows={6}
          className="w-full rounded-lg bg-[var(--nomu-input-bg)] border border-[var(--nomu-border)] px-3 py-2 text-sm text-[var(--nomu-text)] placeholder:text-[var(--nomu-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--nomu-primary)] resize-y"
        />
        <p className="mt-1 text-xs text-[var(--nomu-text-muted)]">
          Tell the AI what to do with the upstream data
        </p>
      </div>

      {/* Model Selection */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-[var(--nomu-text-muted)]">AI Model</label>
          <button
            onClick={loadModels}
            disabled={isLoading}
            className="text-xs text-[var(--nomu-primary)] hover:text-[var(--nomu-primary-hover)] disabled:opacity-50"
          >
            {isLoading ? <Loader2 size={12} className="animate-spin" /> : '🔄 Refresh'}
          </button>
        </div>
        <Select
          options={availableModels.map((m) => ({ value: m, label: m }))}
          value={model}
          onChange={(e) => setModel(e.target.value)}
        />
        {availableModels.length === 0 && !isLoading && (
          <p className="mt-1 text-xs text-amber-400">⚠️ No models found. Make sure Ollama is running.</p>
        )}
        {availableModels.length > 0 && (
          <p className="mt-1 text-xs text-[var(--nomu-text-muted)]">
            Running locally via Ollama • 100% private
          </p>
        )}
      </div>

      {/* Temperature */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-[var(--nomu-text-muted)]">Temperature</label>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${getTempColor()}`}>{temperature}</span>
          </div>
        </div>
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={temperature}
          onChange={(e) => setTemperature(parseFloat(e.target.value))}
          className="w-full accent-[var(--nomu-primary)]"
        />
        <div className="flex justify-between text-xs text-[var(--nomu-text-muted)] mt-1">
          <span>0.0 Precise</span>
          <span>1.0 Balanced</span>
          <span>2.0 Creative</span>
        </div>
        <p className={`mt-2 text-xs ${getTempColor()}`}>
          {getTempDescription()}
        </p>
      </div>

      {/* Max Tokens */}
      <div>
        <label className="mb-2 block text-sm font-medium text-[var(--nomu-text-muted)]">Max Response Length</label>
        <Input
          type="number"
          value={maxTokens}
          onChange={(e) => setMaxTokens(parseInt(e.target.value) || 2048)}
          placeholder="2048"
          min="128"
          max="8192"
          step="128"
        />
        <p className="mt-1 text-xs text-[var(--nomu-text-muted)]">
          Tokens: ~{Math.floor(maxTokens / 4)} words • Higher = longer responses
        </p>
      </div>

      {/* Save */}
      <Button variant="primary" onClick={handleSave} leftIcon={<Save size={14} />} className="w-full">
        Save Configuration
      </Button>
    </div>
  )
}
