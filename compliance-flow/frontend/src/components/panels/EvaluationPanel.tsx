import { useState } from 'react'
import { X, CheckCircle2, XCircle, BarChart3, Sparkles } from 'lucide-react'
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

        {/* Reference Summary */}
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--nomu-text-muted)]">Reference Summary</label>
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
          {isEvaluating ? 'Evaluating...' : 'Evaluate Quality'}
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
