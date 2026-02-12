import { useState } from 'react'
import { X, CheckCircle2, XCircle, BarChart3, Sparkles, AlertTriangle, Brain } from 'lucide-react'
import { Button } from '../common'
import { useDocumentStore } from '../../store/documentStore'
import { API_BASE_URL } from '../../services/api'
import type { EvaluationResult } from '../../types/document'

interface EvaluationPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function EvaluationPanel({ isOpen, onClose }: EvaluationPanelProps) {
  const { summaries, documents, addEvaluationResult, evaluationResults } = useDocumentStore()

  const [selectedDocId, setSelectedDocId] = useState('')
  const [referenceText, setReferenceText] = useState('')
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [isGrading, setIsGrading] = useState(false)
  const [gradeError, setGradeError] = useState<string | null>(null)
  const [rougeThresholdL, setRougeThresholdL] = useState(0.35)
  const [bleuThreshold, setBleuThreshold] = useState(0.20)

  const handleEvaluate = async () => {
    if (!selectedDocId || !referenceText.trim()) return

    const summary = summaries.find((s) => s.documentId === selectedDocId)
    if (!summary) return

    setIsEvaluating(true)
    try {
      const generatedText = summary.fields.map((f) => `${f.name}: ${f.content}`).join('\n')
      const response = await fetch(`${API_BASE_URL}/documents/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generated_summary: generatedText,
          reference_summary: referenceText,
        }),
      })

      if (!response.ok) throw new Error('Evaluation failed')
      const data = await response.json()

      const result: EvaluationResult = {
        id: `eval-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        documentId: selectedDocId,
        summaryId: summary.id,
        rouge1: data.rouge_1,
        rouge2: data.rouge_2,
        rougeL: data.rouge_l,
        bleu: data.bleu,
        referenceSummary: referenceText,
        evaluatedAt: new Date().toISOString(),
        passesThreshold: data.rouge_l >= rougeThresholdL && data.bleu >= bleuThreshold,
      }

      addEvaluationResult(result)
    } catch (err) {
      console.error('Evaluation failed:', err)
    }
    setIsEvaluating(false)
  }

  const handleLLMGrade = async () => {
    if (!selectedDocId) return

    const summary = summaries.find((s) => s.documentId === selectedDocId)
    const doc = documents.find((d) => d.id === selectedDocId)
    if (!summary || !doc) return

    setIsGrading(true)
    setGradeError(null)
    try {
      const generatedText = summary.fields.map((f) => `${f.name}: ${f.content}`).join('\n')
      const templateFields = summary.fields.map((f) => f.name)

      const response = await fetch(`${API_BASE_URL}/documents/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_text: doc.extractedText,
          generated_summary: generatedText,
          template_fields: templateFields,
        }),
      })

      if (!response.ok) throw new Error('Grading failed')
      const data = await response.json()

      // Find existing eval result for this doc and update it, or create new one
      const existingResult = evaluationResults.find((r) => r.documentId === selectedDocId)
      const result: EvaluationResult = {
        id: existingResult?.id ?? `eval-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        documentId: selectedDocId,
        summaryId: summary.id,
        rouge1: existingResult?.rouge1 ?? 0,
        rouge2: existingResult?.rouge2 ?? 0,
        rougeL: existingResult?.rougeL ?? 0,
        bleu: existingResult?.bleu ?? 0,
        referenceSummary: existingResult?.referenceSummary ?? '',
        evaluatedAt: new Date().toISOString(),
        passesThreshold: existingResult?.passesThreshold ?? false,
        llmGrade: {
          accuracy: data.accuracy,
          completeness: data.completeness,
          legalPrecision: data.legal_precision,
          conciseness: data.conciseness,
          fabricatedClaims: data.fabricated_claims,
        },
      }

      addEvaluationResult(result)
    } catch (err) {
      setGradeError(err instanceof Error ? err.message : 'Grading failed')
    }
    setIsGrading(false)
  }

  if (!isOpen) return null

  const summarizedDocs = documents.filter((d) =>
    summaries.some((s) => s.documentId === d.id)
  )

  // Aggregate metrics
  const avgRouge1 = evaluationResults.length > 0
    ? evaluationResults.reduce((sum, r) => sum + r.rouge1, 0) / evaluationResults.length
    : 0
  const avgRougeL = evaluationResults.length > 0
    ? evaluationResults.reduce((sum, r) => sum + r.rougeL, 0) / evaluationResults.length
    : 0
  const avgBleu = evaluationResults.length > 0
    ? evaluationResults.reduce((sum, r) => sum + r.bleu, 0) / evaluationResults.length
    : 0

  // Get LLM grade for selected doc
  const selectedLlmGrade = evaluationResults.find((r) => r.documentId === selectedDocId)?.llmGrade

  return (
    <div className="fixed right-[420px] top-4 z-50 w-[400px] max-h-[90vh] overflow-y-auto rounded-xl border border-[var(--nomu-border)] bg-[var(--nomu-bg)] shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--nomu-border)] px-4 py-3">
        <div className="flex items-center gap-2">
          <BarChart3 size={18} className="text-[var(--nomu-primary)]" />
          <h2 className="font-semibold text-[var(--nomu-text)]">Quality Evaluation</h2>
        </div>
        <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--nomu-text-muted)] hover:bg-[var(--nomu-surface-hover)]">
          <X size={18} />
        </button>
      </div>

      <div className="p-4 space-y-6">
        {/* Document Selection */}
        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--nomu-text-muted)]">Select Document</label>
          <select
            value={selectedDocId}
            onChange={(e) => setSelectedDocId(e.target.value)}
            className="w-full rounded-lg border border-[var(--nomu-border)] bg-[var(--nomu-surface)] px-3 py-2 text-sm text-[var(--nomu-text)]"
          >
            <option value="">Select a summarized document...</option>
            {summarizedDocs.map((doc) => (
              <option key={doc.id} value={doc.id}>{doc.name}</option>
            ))}
          </select>
        </div>

        {/* LLM-as-Judge Grading */}
        {selectedDocId && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-[var(--nomu-text)]">AI Grading</h3>
            <p className="text-xs text-[var(--nomu-text-muted)]">
              Grade the summary using AI — no reference summary needed. The LLM compares the summary against the source document.
            </p>
            <Button
              variant="primary"
              onClick={handleLLMGrade}
              disabled={isGrading || !selectedDocId}
              isLoading={isGrading}
              leftIcon={<Brain size={14} />}
              className="w-full"
            >
              {isGrading ? 'Grading with AI...' : 'Grade with AI'}
            </Button>

            {gradeError && (
              <div className="flex items-center gap-2 rounded-lg bg-red-900/20 px-3 py-2 text-xs text-red-400">
                <XCircle size={14} />
                <span>{gradeError}</span>
              </div>
            )}

            {/* LLM Grade Results */}
            {selectedLlmGrade && (
              <div className="rounded-lg bg-[var(--nomu-surface)] p-3 space-y-3">
                <h4 className="text-xs font-medium text-[var(--nomu-primary)]">AI Quality Scores</h4>
                {([
                  { label: 'Accuracy', value: selectedLlmGrade.accuracy, color: 'bg-green-500' },
                  { label: 'Completeness', value: selectedLlmGrade.completeness, color: 'bg-blue-500' },
                  { label: 'Legal Precision', value: selectedLlmGrade.legalPrecision, color: 'bg-purple-500' },
                  { label: 'Conciseness', value: selectedLlmGrade.conciseness, color: 'bg-cyan-500' },
                ] as const).map(({ label, value, color }) => (
                  <div key={label}>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-[var(--nomu-text-muted)]">{label}</span>
                      <span className={`text-xs font-medium ${value >= 70 ? 'text-green-400' : value >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>{value}/100</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[var(--nomu-border)]">
                      <div className={`h-1.5 rounded-full ${color} transition-all duration-300`} style={{ width: `${value}%` }} />
                    </div>
                  </div>
                ))}

                {/* Fabricated Claims */}
                {selectedLlmGrade.fabricatedClaims && selectedLlmGrade.fabricatedClaims.length > 0 && (
                  <div className="mt-2 rounded-lg bg-red-900/20 border border-red-600/30 p-2">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <AlertTriangle size={12} className="text-red-400" />
                      <span className="text-xs font-medium text-red-400">Potential Fabricated Claims</span>
                    </div>
                    <ul className="space-y-1">
                      {selectedLlmGrade.fabricatedClaims.map((claim, idx) => (
                        <li key={idx} className="text-xs text-red-300 pl-3 relative before:content-[''] before:absolute before:left-0 before:top-1.5 before:h-1 before:w-1 before:rounded-full before:bg-red-400">
                          {claim}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Divider */}
        {selectedDocId && (
          <div className="border-t border-[var(--nomu-border)]" />
        )}

        {/* Reference Summary */}
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--nomu-text-muted)]">Reference Summary (for ROUGE/BLEU)</label>
          <textarea
            value={referenceText}
            onChange={(e) => setReferenceText(e.target.value)}
            className="w-full rounded-lg border border-[var(--nomu-border)] bg-[var(--nomu-surface)] px-3 py-2 text-sm text-[var(--nomu-text)] placeholder-[var(--nomu-text-muted)]"
            rows={4}
            placeholder="Paste the expert-written reference summary here..."
          />
        </div>

        {/* Thresholds */}
        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--nomu-text-muted)]">Quality Thresholds</label>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-xs text-[var(--nomu-text-muted)]">ROUGE-L minimum</span>
                <span className="text-xs font-medium text-[var(--nomu-text)]">{rougeThresholdL}</span>
              </div>
              <input type="range" min="0" max="1" step="0.05" value={rougeThresholdL} onChange={(e) => setRougeThresholdL(parseFloat(e.target.value))} className="w-full accent-[var(--nomu-primary)]" />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-xs text-[var(--nomu-text-muted)]">BLEU minimum</span>
                <span className="text-xs font-medium text-[var(--nomu-text)]">{bleuThreshold}</span>
              </div>
              <input type="range" min="0" max="1" step="0.05" value={bleuThreshold} onChange={(e) => setBleuThreshold(parseFloat(e.target.value))} className="w-full accent-[var(--nomu-primary)]" />
            </div>
          </div>
        </div>

        {/* Evaluate Button */}
        <Button
          variant="primary"
          onClick={handleEvaluate}
          disabled={isEvaluating || !selectedDocId || !referenceText.trim()}
          isLoading={isEvaluating}
          leftIcon={<Sparkles size={14} />}
          className="w-full"
        >
          {isEvaluating ? 'Evaluating...' : 'Evaluate with ROUGE/BLEU'}
        </Button>

        {/* Results Table */}
        {evaluationResults.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-medium text-[var(--nomu-text)]">Evaluation Results</h3>
            <div className="space-y-2">
              {evaluationResults.map((result) => {
                const doc = documents.find((d) => d.id === result.documentId)
                return (
                  <div key={result.id} className="rounded-lg bg-[var(--nomu-surface)] p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-[var(--nomu-text)]">{doc?.name || 'Unknown'}</span>
                      {result.passesThreshold ? (
                        <CheckCircle2 size={16} className="text-green-400" />
                      ) : (
                        <XCircle size={16} className="text-red-400" />
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div>
                        <p className="text-xs text-[var(--nomu-text-muted)]">R-1</p>
                        <p className="text-sm font-medium text-[var(--nomu-text)]">{(result.rouge1 * 100).toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--nomu-text-muted)]">R-2</p>
                        <p className="text-sm font-medium text-[var(--nomu-text)]">{(result.rouge2 * 100).toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--nomu-text-muted)]">R-L</p>
                        <p className={`text-sm font-medium ${result.rougeL >= rougeThresholdL ? 'text-green-400' : 'text-red-400'}`}>{(result.rougeL * 100).toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--nomu-text-muted)]">BLEU</p>
                        <p className={`text-sm font-medium ${result.bleu >= bleuThreshold ? 'text-green-400' : 'text-red-400'}`}>{(result.bleu * 100).toFixed(1)}%</p>
                      </div>
                    </div>
                    {/* Inline LLM grade if available */}
                    {result.llmGrade && (
                      <div className="mt-2 pt-2 border-t border-[var(--nomu-border)] grid grid-cols-4 gap-2 text-center">
                        <div>
                          <p className="text-xs text-[var(--nomu-text-muted)]">Acc</p>
                          <p className="text-sm font-medium text-[var(--nomu-text)]">{result.llmGrade.accuracy}</p>
                        </div>
                        <div>
                          <p className="text-xs text-[var(--nomu-text-muted)]">Comp</p>
                          <p className="text-sm font-medium text-[var(--nomu-text)]">{result.llmGrade.completeness}</p>
                        </div>
                        <div>
                          <p className="text-xs text-[var(--nomu-text-muted)]">Prec</p>
                          <p className="text-sm font-medium text-[var(--nomu-text)]">{result.llmGrade.legalPrecision}</p>
                        </div>
                        <div>
                          <p className="text-xs text-[var(--nomu-text-muted)]">Conc</p>
                          <p className="text-sm font-medium text-[var(--nomu-text)]">{result.llmGrade.conciseness}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Aggregate */}
            <div className="mt-3 rounded-lg bg-[var(--nomu-primary)]/10 border border-[var(--nomu-primary)]/30 p-3">
              <p className="text-xs font-medium text-[var(--nomu-primary)] mb-2">Aggregate Scores ({evaluationResults.length} evaluations)</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs text-[var(--nomu-text-muted)]">Avg R-1</p>
                  <p className="text-sm font-medium text-[var(--nomu-text)]">{(avgRouge1 * 100).toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--nomu-text-muted)]">Avg R-L</p>
                  <p className="text-sm font-medium text-[var(--nomu-text)]">{(avgRougeL * 100).toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--nomu-text-muted)]">Avg BLEU</p>
                  <p className="text-sm font-medium text-[var(--nomu-text)]">{(avgBleu * 100).toFixed(1)}%</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
