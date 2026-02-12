import { useState, useEffect, useRef, useMemo } from 'react'
import type { Node } from '@xyflow/react'
import {
  FileText,
  Shield,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Sparkles,
  BarChart3,
  Square,
  Save,
  AlertTriangle,
  Info,
} from 'lucide-react'
import { Button, Input, Select, DocumentUploadZone } from '../../common'
import { EvaluationPanel } from '../EvaluationPanel'
import { useDocumentStore } from '../../../store/documentStore'
import { API_BASE_URL } from '../../../services/api'
import { summarizeDocument, summarizeBatch, searchDocuments, indexDocumentForSearch, detectDocumentType } from '../../../services/summarizationService'
import type { DocumentSummary, SummaryField } from '../../../types/document'

export function DocumentNodeConfig({
  node,
  onUpdate,
}: {
  node: Node
  onUpdate: (data: Record<string, unknown>) => void
}) {
  const config = (node.data as Record<string, unknown>).config as Record<string, unknown> || {}
  const templates = useDocumentStore((s) => s.templates)
  const allDocuments = useDocumentStore((s) => s.documents)
  const nodeDocuments = useMemo(() => allDocuments.filter((d) => d.nodeId === node.id), [allDocuments, node.id])
  const { addDocument } = useDocumentStore()

  const [mode, setMode] = useState((config.mode as string) ?? 'summarize')
  const [templateId, setTemplateId] = useState((config.templateId as string) ?? '')
  const [chunkSize, setChunkSize] = useState((config.chunkSize as number) ?? 20000)
  const [systemPromptOverride, setSystemPromptOverride] = useState((config.systemPromptOverride as string) ?? '')
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'parsing' | 'parsed' | 'error'>('idle')
  const [uploadError, setUploadError] = useState<string | undefined>()
  const [showSaved, setShowSaved] = useState(false)
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [summaryFields, setSummaryFields] = useState<SummaryField[]>([])
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [typeMismatch, setTypeMismatch] = useState<{ detectedType: string; suggestedTemplateId: string | null } | null>(null)
  const [isDetecting, setIsDetecting] = useState(false)
  const [progress, setProgress] = useState<{ current: number; total: number; status: string } | null>(null)
  const [showChunks, setShowChunks] = useState(false)
  const [chunkSummariesData, setChunkSummariesData] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{ documentId: string; documentName: string; summaryText: string; score: number }>>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isIndexing, setIsIndexing] = useState(false)
  const [showEvalPanel, setShowEvalPanel] = useState(false)

  // Batch mode state
  const [batchResults, setBatchResults] = useState<DocumentSummary[]>([])
  const [batchErrors, setBatchErrors] = useState<Array<{ documentId: string; error: string }>>([])
  const [batchProgress, setBatchProgress] = useState<{ completed: number; total: number; currentDocId: string } | null>(null)
  const [isBatchProcessing, setIsBatchProcessing] = useState(false)
  const cancelRef = useRef({ current: false })

  // Restore summary results when panel reopens with previously saved doc IDs
  const savedDocIds = (config.documents as string[] | undefined) ?? []
  useEffect(() => {
    if (savedDocIds.length === 0 || summaryFields.length > 0 || isSummarizing) return

    const { getSummaryForDocument } = useDocumentStore.getState()
    for (const docId of savedDocIds) {
      const summary = getSummaryForDocument(docId)
      if (summary) {
        setSummaryFields(summary.fields)
        if (summary.chunkSummaries) {
          setChunkSummariesData(summary.chunkSummaries)
        }
        return // Show first available summary
      }
    }
  }, [savedDocIds.length, summaryFields.length, isSummarizing])

  const handleFileSelect = async (files: File[]) => {
    setUploadFiles(files)
    setUploadStatus('uploading')
    setUploadError(undefined)

    try {
      for (const file of files) {
        setUploadStatus('parsing')
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch(`${API_BASE_URL}/documents/parse`, {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) throw new Error('Parse failed')

        const result = await response.json()
        const docId = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

        addDocument({
          id: docId,
          nodeId: node.id,
          name: file.name,
          fileType: file.name.split('.').pop() as 'pdf' | 'docx' | 'txt',
          fileSize: file.size,
          pageCount: result.metadata?.pages || 1,
          extractedText: result.text,
          uploadedAt: new Date().toISOString(),
          status: 'parsed',
        })
      }
      setUploadStatus('parsed')

      // Auto-detect document type if a template is selected
      if (templateId) {
        const latestDoc = useDocumentStore.getState().documents.at(-1)
        if (latestDoc?.extractedText) {
          setIsDetecting(true)
          try {
            const detection = await detectDocumentType(latestDoc.extractedText, templateId)
            if (!detection.matchesTemplate) {
              setTypeMismatch({ detectedType: detection.detectedType, suggestedTemplateId: detection.suggestedTemplateId })
            } else {
              setTypeMismatch(null)
            }
          } catch {
            // Detection is best-effort; don't block upload flow
          }
          setIsDetecting(false)
        }
      }
    } catch (err) {
      setUploadStatus('error')
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    }
  }

  const handleFileRemove = (index: number) => {
    setUploadFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setIsSearching(true)
    try {
      const results = await searchDocuments(searchQuery)
      setSearchResults(results)
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : 'Search failed')
    }
    setIsSearching(false)
  }

  const handleIndexAll = async () => {
    setIsIndexing(true)
    try {
      for (const doc of nodeDocuments) {
        await indexDocumentForSearch(doc.id)
      }
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : 'Indexing failed')
    }
    setIsIndexing(false)
  }

  const handleSummarize = async () => {
    if (!templateId) return
    const docIds = (config.documents as string[]) || []
    const docId = docIds[0] || nodeDocuments[nodeDocuments.length - 1]?.id
    if (!docId) return

    setIsSummarizing(true)
    setSummaryError(null)
    setProgress(null)
    setChunkSummariesData([])
    try {
      const summary = await summarizeDocument(
        docId,
        templateId,
        'llama3.2',
        chunkSize,
        (current, total, status) => setProgress({ current, total, status })
      )
      setSummaryFields(summary.fields)
      if (summary.chunkSummaries) {
        setChunkSummariesData(summary.chunkSummaries)
      }
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : 'Summarization failed')
    }
    setIsSummarizing(false)
    setProgress(null)
  }

  const handleStartBatch = async () => {
    if (!templateId || nodeDocuments.length === 0) return

    setIsBatchProcessing(true)
    setBatchResults([])
    setBatchErrors([])
    setBatchProgress(null)
    cancelRef.current = { current: false }

    const docIds = nodeDocuments.map((d) => d.id)

    const { results, errors } = await summarizeBatch(
      docIds,
      templateId,
      'llama3.2',
      chunkSize,
      (completed, total, documentId) => {
        setBatchProgress({ completed, total, currentDocId: documentId })
      },
      cancelRef.current
    )

    setBatchResults(results)
    setBatchErrors(errors)
    setIsBatchProcessing(false)
    setBatchProgress(null)
  }

  const handleCancelBatch = () => {
    cancelRef.current.current = true
  }

  const handleSave = () => {
    // Collect IDs of all documents currently in the store
    const docIds = nodeDocuments.map((d) => d.id)
    onUpdate({
      config: {
        ...config,
        mode,
        templateId: templateId || null,
        chunkSize,
        systemPromptOverride: systemPromptOverride || undefined,
        documents: docIds,
      },
    })
    setShowSaved(true)
    setTimeout(() => setShowSaved(false), 2000)
  }

  // Helper to get per-document batch status
  const getDocBatchStatus = (docId: string): 'pending' | 'processing' | 'complete' | 'error' => {
    if (batchErrors.some((e) => e.documentId === docId)) return 'error'
    if (batchResults.some((r) => r.documentId === docId)) return 'complete'
    if (batchProgress?.currentDocId === docId) return 'processing'
    return 'pending'
  }

  return (
    <div className="space-y-6">
      {showSaved && (
        <div className="flex items-center gap-2 text-green-400 text-sm bg-green-900/30 rounded-lg px-3 py-2">
          <CheckCircle2 size={16} />
          <span>Configuration saved!</span>
        </div>
      )}

      {/* Info Box */}
      <div className="rounded-lg bg-[var(--nomu-primary)]/10 border border-[var(--nomu-primary)]/30 p-3">
        <p className="text-xs text-[var(--nomu-primary)]">
          <FileText size={12} className="inline mr-1" />
          Upload legal documents for AI-powered structured summarization, search, or batch processing.
        </p>
      </div>

      {/* Document Upload */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-[var(--nomu-text)]">Document Upload</h3>
        <DocumentUploadZone
          multiple
          files={uploadFiles}
          status={uploadStatus}
          error={uploadError}
          onFileSelect={handleFileSelect}
          onFileRemove={handleFileRemove}
        />
        {/* Show previously attached documents when panel is reopened */}
        {uploadFiles.length === 0 && savedDocIds.length > 0 && (
          <div className="mt-3 space-y-1">
            <p className="text-xs text-[var(--nomu-text-muted)]">Previously attached:</p>
            {savedDocIds.map((docId) => {
              const doc = nodeDocuments.find((d) => d.id === docId)
              if (!doc) return null
              return (
                <div key={docId} className="flex items-center gap-2 rounded bg-[var(--nomu-surface)] px-3 py-1.5">
                  <FileText size={12} className="text-[var(--nomu-primary)] shrink-0" />
                  <span className="text-xs text-[var(--nomu-text)] truncate flex-1">{doc.name}</span>
                  <span className="text-xs text-[var(--nomu-text-muted)]">
                    {(doc.fileSize / 1024).toFixed(0)}KB
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Template Selector */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-[var(--nomu-text)]">Extraction Template</h3>
        <Select
          options={[
            { value: '', label: 'Select a template...' },
            ...templates.map((t) => ({ value: t.id, label: t.name })),
          ]}
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
        />
        {templateId && (
          <p className="mt-1 text-xs text-[var(--nomu-text-muted)]">
            {templates.find((t) => t.id === templateId)?.description}
          </p>
        )}

        {/* Document Type Mismatch Warning */}
        {typeMismatch && (
          <div className="mt-3 rounded-lg bg-yellow-900/20 border border-yellow-600/30 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle size={14} className="text-yellow-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-yellow-400 font-medium">Template Mismatch Detected</p>
                <p className="text-xs text-[var(--nomu-text-muted)] mt-1">
                  This appears to be a <span className="font-medium text-yellow-300">{typeMismatch.detectedType}</span>, but you selected <span className="font-medium text-[var(--nomu-text)]">{templates.find((t) => t.id === templateId)?.name}</span>. Consider switching for better accuracy.
                </p>
                {typeMismatch.suggestedTemplateId && (
                  <button
                    onClick={() => {
                      setTemplateId(typeMismatch.suggestedTemplateId!)
                      setTypeMismatch(null)
                    }}
                    className="mt-2 rounded bg-yellow-600/30 px-3 py-1 text-xs font-medium text-yellow-300 hover:bg-yellow-600/50 transition"
                  >
                    Switch to {templates.find((t) => t.id === typeMismatch.suggestedTemplateId)?.name ?? typeMismatch.detectedType}
                  </button>
                )}
              </div>
              <button onClick={() => setTypeMismatch(null)} className="text-[var(--nomu-text-muted)] hover:text-[var(--nomu-text)]">
                <XCircle size={12} />
              </button>
            </div>
          </div>
        )}

        {isDetecting && (
          <div className="mt-2 flex items-center gap-2 text-xs text-[var(--nomu-text-muted)]">
            <Loader2 size={12} className="animate-spin" />
            <span>Detecting document type...</span>
          </div>
        )}
      </div>

      {/* Mode Toggle */}
      <div>
        <label className="mb-2 block text-sm font-medium text-[var(--nomu-text-muted)]">Processing Mode</label>
        <div className="grid grid-cols-3 gap-2">
          {(['summarize', 'search', 'batch'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-lg p-3 text-center transition ${
                mode === m
                  ? 'bg-[var(--nomu-primary)]/20 border-2 border-[var(--nomu-primary)]'
                  : 'bg-[var(--nomu-surface)] border-2 border-transparent hover:border-[var(--nomu-border)]'
              }`}
            >
              <p className="font-medium text-sm text-[var(--nomu-text)] capitalize">{m}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Chunk Size (only for summarize mode) */}
      {mode === 'summarize' && (
        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--nomu-text-muted)]">Chunk Size (characters)</label>
          <Input
            type="number"
            value={chunkSize}
            onChange={(e) => setChunkSize(parseInt(e.target.value) || 20000)}
            min="1000"
            max="100000"
            step="1000"
          />
          <p className="mt-1 text-xs text-[var(--nomu-text-muted)]">
            Documents larger than this will be split into chunks for summarization
          </p>
        </div>
      )}

      {/* System Prompt Override */}
      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--nomu-text-muted)]">System Prompt Override</label>
        <textarea
          value={systemPromptOverride}
          onChange={(e) => setSystemPromptOverride(e.target.value)}
          className="w-full rounded-lg border border-[var(--nomu-border)] bg-[var(--nomu-surface)] px-3 py-2 font-mono text-sm text-[var(--nomu-text)] placeholder-[var(--nomu-text-muted)]"
          rows={3}
          placeholder="Optional: Override the template's default system prompt..."
        />
      </div>

      {/* Summarize Button (only in summarize mode with template selected) */}
      {mode === 'summarize' && templateId && (
        <Button
          variant="primary"
          onClick={handleSummarize}
          disabled={isSummarizing || nodeDocuments.length === 0}
          isLoading={isSummarizing}
          leftIcon={isSummarizing ? undefined : <Sparkles size={14} />}
          className="w-full"
        >
          {isSummarizing ? 'Summarizing...' : 'Summarize Document'}
        </Button>
      )}

      {/* Search Mode UI */}
      {mode === 'search' && (
        <div className="space-y-4">
          <div>
            <h3 className="mb-3 text-sm font-medium text-[var(--nomu-text)]">Document Search</h3>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleIndexAll}
              disabled={isIndexing || nodeDocuments.length === 0}
              isLoading={isIndexing}
              className="w-full mb-3"
            >
              {isIndexing ? 'Indexing...' : `Index ${nodeDocuments.length} Document(s)`}
            </Button>
            <div className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                placeholder="Search documents..."
                onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleSearch()}
              />
              <Button
                variant="primary"
                size="sm"
                onClick={handleSearch}
                disabled={isSearching || !searchQuery.trim()}
                isLoading={isSearching}
              >
                Search
              </Button>
            </div>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-[var(--nomu-text-muted)]">
                {searchResults.length} result(s)
              </h4>
              {searchResults.map((result, idx) => (
                <div key={idx} className="rounded-lg bg-[var(--nomu-surface)] p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-[var(--nomu-text)]">{result.documentName}</span>
                    <span className="text-xs text-[var(--nomu-primary)]">{(result.score * 100).toFixed(1)}%</span>
                  </div>
                  <p className="text-xs text-[var(--nomu-text-muted)] line-clamp-3">{result.summaryText.slice(0, 200)}...</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Batch Mode UI */}
      {mode === 'batch' && templateId && (
        <div className="space-y-4">
          <div className="rounded-lg bg-[var(--nomu-surface)] p-3">
            <p className="text-xs text-[var(--nomu-text-muted)]">
              {nodeDocuments.length} document(s) ready for batch processing
            </p>
          </div>

          {/* Start / Cancel Batch */}
          {!isBatchProcessing ? (
            <Button
              variant="primary"
              onClick={handleStartBatch}
              disabled={nodeDocuments.length === 0}
              leftIcon={<Sparkles size={14} />}
              className="w-full"
            >
              Start Batch ({nodeDocuments.length} documents)
            </Button>
          ) : (
            <Button
              variant="danger"
              onClick={handleCancelBatch}
              leftIcon={<Square size={14} />}
              className="w-full"
            >
              Cancel Batch
            </Button>
          )}

          {/* Batch Progress Bar */}
          {batchProgress && (
            <div className="rounded-lg bg-[var(--nomu-surface)] p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[var(--nomu-text-muted)]">
                  Processing {batchProgress.completed}/{batchProgress.total}...
                </span>
                <span className="text-xs text-[var(--nomu-primary)]">
                  {Math.round((batchProgress.completed / batchProgress.total) * 100)}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-[var(--nomu-border)]">
                <div
                  className="h-2 rounded-full bg-[var(--nomu-primary)] transition-all duration-300"
                  style={{ width: `${(batchProgress.completed / batchProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Per-Document Status List */}
          {(isBatchProcessing || batchResults.length > 0 || batchErrors.length > 0) && (
            <div>
              <h4 className="mb-2 text-xs font-medium text-[var(--nomu-text-muted)]">Document Status</h4>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {nodeDocuments.map((doc) => {
                  const st = getDocBatchStatus(doc.id)
                  const errEntry = batchErrors.find((e) => e.documentId === doc.id)
                  return (
                    <div key={doc.id} className="flex items-center gap-2 rounded-lg bg-[var(--nomu-surface)] px-3 py-2">
                      {st === 'complete' && <CheckCircle2 size={14} className="text-green-400 shrink-0" />}
                      {st === 'error' && <XCircle size={14} className="text-red-400 shrink-0" />}
                      {st === 'processing' && <Loader2 size={14} className="text-[var(--nomu-primary)] animate-spin shrink-0" />}
                      {st === 'pending' && <Clock size={14} className="text-[var(--nomu-text-muted)] shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <span className="text-xs text-[var(--nomu-text)] truncate block">{doc.name}</span>
                        {errEntry && (
                          <span className="text-xs text-red-400 truncate block">{errEntry.error}</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Batch Completion Summary */}
          {!isBatchProcessing && (batchResults.length > 0 || batchErrors.length > 0) && (
            <div className="rounded-lg bg-[var(--nomu-surface)] p-3">
              <h4 className="text-xs font-medium text-[var(--nomu-text)] mb-2">Batch Complete</h4>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-green-400">
                  <CheckCircle2 size={12} className="inline mr-1" />
                  {batchResults.length} succeeded
                </span>
                <span className="text-red-400">
                  <XCircle size={12} className="inline mr-1" />
                  {batchErrors.length} failed
                </span>
                <span className="text-[var(--nomu-text-muted)]">
                  {batchResults.length + batchErrors.length} total
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Progress indicator */}
      {progress && (
        <div className="rounded-lg bg-[var(--nomu-surface)] p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[var(--nomu-text-muted)]">{progress.status}</span>
            <span className="text-xs text-[var(--nomu-primary)]">{progress.current}/{progress.total}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-[var(--nomu-border)]">
            <div
              className="h-1.5 rounded-full bg-[var(--nomu-primary)] transition-all duration-300"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Summary Error */}
      {summaryError && (
        <div className="flex items-center gap-2 rounded-lg bg-red-900/20 px-3 py-2 text-xs text-red-400">
          <XCircle size={14} />
          <span>{summaryError}</span>
        </div>
      )}

      {/* Summary Preview */}
      {summaryFields.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium text-[var(--nomu-text)]">Summary Results</h3>
          <div className="space-y-3">
            {summaryFields.map((field, idx) => {
              const isUnverified = field.content.startsWith('[Unverified]')
              const confidenceColor = field.confidence === 'high' ? 'bg-green-500' : field.confidence === 'medium' ? 'bg-yellow-500' : field.confidence === 'low' ? 'bg-red-500' : 'bg-[var(--nomu-text-muted)]'
              const confidenceLabel = field.confidence === 'high' ? 'Verified' : field.confidence === 'medium' ? 'Partially verified' : field.confidence === 'low' ? (isUnverified ? 'Unverified' : 'Not found in document') : ''

              return (
                <div key={idx} className="rounded-lg bg-[var(--nomu-surface)] p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-xs font-medium text-[var(--nomu-primary)]">{field.name}</h4>
                    {field.confidence && (
                      <span className="group relative">
                        <span className={`inline-block h-2 w-2 rounded-full ${confidenceColor}`} />
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block whitespace-nowrap rounded bg-[var(--nomu-bg)] border border-[var(--nomu-border)] px-2 py-1 text-[10px] text-[var(--nomu-text-muted)] shadow-lg z-10">
                          {confidenceLabel}{field.sourceReference ? ` | ${field.sourceReference}` : ' | No source found in document'}
                        </span>
                      </span>
                    )}
                    {isUnverified && <AlertTriangle size={12} className="text-red-400" />}
                  </div>
                  <p className={`text-sm whitespace-pre-wrap ${isUnverified ? 'text-[var(--nomu-text-muted)] line-through' : 'text-[var(--nomu-text)]'}`}>
                    {isUnverified ? field.content.replace('[Unverified] ', '') : field.content}
                  </p>
                  {field.sourceReference && (
                    <p className="mt-1 text-[10px] text-[var(--nomu-text-muted)]">
                      <Info size={10} className="inline mr-1" />
                      Source: {field.sourceReference}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Chunk Debug View */}
      {chunkSummariesData.length > 0 && (
        <div>
          <button
            onClick={() => setShowChunks(!showChunks)}
            className="flex items-center gap-2 text-xs text-[var(--nomu-text-muted)] hover:text-[var(--nomu-text)]"
          >
            <span>{showChunks ? '▼' : '▶'}</span>
            <span>Chunk Summaries ({chunkSummariesData.length} chunks)</span>
          </button>
          {showChunks && (
            <div className="mt-2 space-y-2">
              {chunkSummariesData.map((chunk, idx) => (
                <div key={idx} className="rounded-lg bg-[var(--nomu-surface)] p-3">
                  <h4 className="text-xs font-medium text-[var(--nomu-text-muted)] mb-1">Chunk {idx + 1}</h4>
                  <p className="text-xs text-[var(--nomu-text)] whitespace-pre-wrap max-h-32 overflow-y-auto">{chunk}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Evaluate Quality Button */}
      {summaryFields.length > 0 && (
        <Button
          variant="secondary"
          onClick={() => setShowEvalPanel(true)}
          leftIcon={<BarChart3 size={14} />}
          className="w-full"
        >
          Evaluate Quality
        </Button>
      )}

      {/* Evaluation Panel */}
      <EvaluationPanel isOpen={showEvalPanel} onClose={() => setShowEvalPanel(false)} />

      {/* Compliance Badge */}
      <div className="rounded-lg bg-green-900/20 border border-green-600/30 p-3">
        <div className="flex items-center gap-2 text-green-400">
          <Shield size={16} />
          <span className="text-sm font-medium">Privacy-First Processing</span>
        </div>
        <p className="mt-1 text-xs text-[var(--nomu-text-muted)]">
          All document processing runs locally via Ollama. No data leaves your infrastructure.
        </p>
      </div>

      {/* Save */}
      <Button variant="primary" onClick={handleSave} leftIcon={<Save size={14} />} className="w-full">
        Save Configuration
      </Button>
    </div>
  )
}
