import { api, API_BASE_URL } from './api'
import { useDocumentStore } from '../store/documentStore'
import type { ExtractionTemplate, SummaryField, DocumentSummary } from '../types/document'

/** All known document types mapped to their template IDs. */
const DOCUMENT_TYPE_MAP: Record<string, string> = {
  'NDA': 'template-nda',
  'Non-Disclosure Agreement': 'template-nda',
  'Lease': 'template-lease',
  'Sublease': 'template-lease',
  'Service Agreement': 'template-service-agreement',
  'Employment Contract': 'template-employment',
  'Court Filing': 'template-court-filing',
  'Regulatory Report': 'template-regulatory-report',
  'Software License': 'template-software-license',
  'Software License Agreement': 'template-software-license',
  'Terms of Service': 'template-tos',
  'Partnership Agreement': 'template-partnership',
}

/**
 * Build a structured summarization prompt from template fields using XML-tagged format.
 * Includes anti-hallucination instructions, section citation requirements, and chain-of-thought.
 */
export function buildSummarizationPrompt(text: string, template: ExtractionTemplate): string {
  const fieldInstructions = template.fields
    .map((f) => `- <${sanitizeTag(f.name)}>: ${f.description}. ${f.instructions}`)
    .join('\n')

  return `CRITICAL INSTRUCTIONS — READ CAREFULLY:
- ONLY extract information that is EXPLICITLY stated in the document. If a field is not addressed, you MUST write "Not specified in this document." Do NOT infer, assume, or fabricate information.
- For each field, first identify the relevant clause or section in the document, then extract the information.
- Include a source citation using the document's own numbering, e.g. (Source: Section 3) or (Source: Clause 4.2) or (Source: Page 2, Paragraph 1). Use whatever format matches the document.
- If the document has no numbered sections, use (Source: [brief location, e.g. "opening paragraph"]).

Summarize the following ${template.documentType} document. Focus on these key aspects:

${fieldInstructions}

Provide the summary with bullet points nested within XML tags for each section. Use this exact format:

${template.fields.map((f) => `<${sanitizeTag(f.name)}>
- Key detail: [extracted value] (Source: [as numbered in document])
</${sanitizeTag(f.name)}>`).join('\n\n')}

EXAMPLE of correct "Not specified" usage:
<example_field>
- Injunctive relief: Not specified in this document.
- Marking requirements: Not specified in this document.
</example_field>

Here is the document to summarize:

<document>
${text}
</document>`
}

/**
 * Convert field names to valid XML tag names (lowercase, underscores for spaces, remove special chars)
 */
function sanitizeTag(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s_]/g, '')
    .replace(/\s+/g, '_')
    .replace(/^_+|_+$/g, '')
}

/**
 * Parse XML-tagged LLM output into structured SummaryField[]
 * Extracts content between matching XML tags and parses sourceReference from (Source: ...) patterns.
 * Falls back to storing raw output if XML parsing fails.
 */
export function parseSummaryOutput(output: string, template: ExtractionTemplate): SummaryField[] {
  const fields: SummaryField[] = []

  for (const field of template.fields) {
    const tag = sanitizeTag(field.name)
    const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i')
    const match = output.match(regex)

    const content = match ? match[1].trim() : 'Not specified in this document.'

    // Extract source references from content
    const sourceMatches = content.match(/\(Source:\s*([^)]+)\)/g)
    const NOT_A_SOURCE = /^(not specified|n\/a|unknown|none|not found|not applicable|not stated)/i
    const sourceReference = sourceMatches
      ? sourceMatches
        .map((s) => s.replace(/\(Source:\s*/, '').replace(/\)$/, ''))
        .filter((s) => !NOT_A_SOURCE.test(s.trim()))
        .join('; ') || undefined
      : undefined

    fields.push({
      name: field.name,
      content,
      sourceReference,
    })
  }

  // If no fields matched at all, return raw output as single field
  if (fields.every((f) => f.content === 'Not specified in this document.')) {
    return [{ name: 'Summary', content: output.trim() }]
  }

  return fields
}

interface TextChunk {
  text: string
  startIndex: number
  endIndex: number
}

/**
 * Split text into chunks at sentence boundaries.
 * Falls back to paragraph splitting if sentence chunks are too large.
 */
export function chunkText(text: string, chunkSize: number = 20000, overlap: number = 500): TextChunk[] {
  if (text.length <= chunkSize) {
    return [{ text, startIndex: 0, endIndex: text.length }]
  }

  const chunks: TextChunk[] = []
  // Split at sentence boundaries: period/exclamation/question followed by whitespace
  const sentences = text.match(/[^.!?]*[.!?]+[\s]*/g) || [text]

  let currentChunk = ''
  let chunkStart = 0
  let currentIndex = 0

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > chunkSize && currentChunk.length > 0) {
      chunks.push({
        text: currentChunk.trim(),
        startIndex: chunkStart,
        endIndex: currentIndex,
      })
      // Start next chunk with overlap
      const overlapText = currentChunk.slice(-overlap)
      chunkStart = currentIndex - overlapText.length
      currentChunk = overlapText
    }
    currentChunk += sentence
    currentIndex += sentence.length
  }

  // Add remaining text
  if (currentChunk.trim().length > 0) {
    chunks.push({
      text: currentChunk.trim(),
      startIndex: chunkStart,
      endIndex: currentIndex,
    })
  }

  return chunks
}

/**
 * Build a meta-summarization prompt that combines chunk summaries into a final coherent summary.
 * Carries forward anti-hallucination instructions and preserves source references.
 */
function buildMetaSummaryPrompt(chunkSummaries: string[], template: ExtractionTemplate): string {
  const fieldNames = template.fields.map((f) => f.name).join(', ')

  return `You are looking at chunked summaries of a ${template.documentType} document.
Combine the following ${chunkSummaries.length} chunk summaries into a single coherent overall summary.

CRITICAL INSTRUCTIONS:
- ONLY include information that appears in the chunk summaries below. Do NOT add information that wasn't in any chunk summary.
- If chunk summaries disagree on a detail, note the discrepancy rather than picking one.
- Preserve all (Source: ...) citations from the chunk summaries in the final output.
- If a field has "Not specified in this document." in all chunks, keep it as "Not specified in this document."

Focus on these key sections: ${fieldNames}

Use the same XML-tagged format:
${template.fields.map((f) => `<${sanitizeTag(f.name)}>
- Combined key detail: [value] (Source: [as numbered in document])
</${sanitizeTag(f.name)}>`).join('\n\n')}

Here are the individual chunk summaries:

${chunkSummaries.map((s, i) => `--- Chunk ${i + 1} ---\n${s}`).join('\n\n')}`
}

/**
 * Detect the document type by sending the first ~3000 chars to the LLM.
 * Returns the detected type, whether it matches the selected template, and a suggested template ID.
 */
export async function detectDocumentType(
  text: string,
  selectedTemplateId: string,
  model: string = 'llama3.2:3b'
): Promise<{ detectedType: string; matchesTemplate: boolean; suggestedTemplateId: string | null }> {
  const store = useDocumentStore.getState()
  const selectedTemplate = store.templates.find((t) => t.id === selectedTemplateId)

  const snippet = text.slice(0, 3000)
  const prompt = `Classify this legal document into one of the following types: NDA, Lease, Service Agreement, Software License, Employment Contract, Court Filing, Regulatory Report, Terms of Service, Partnership Agreement, Other.

Return ONLY the type name, nothing else.

<document>
${snippet}
</document>`

  const result = await api.generate({
    model,
    prompt,
    system: 'You are a legal document classifier. Respond with only the document type name.',
    temperature: 0.1,
    max_tokens: 50,
  })

  const detectedType = result.response.trim().replace(/[."']/g, '')
  const suggestedTemplateId = DOCUMENT_TYPE_MAP[detectedType] ?? null
  const matchesTemplate = selectedTemplate
    ? suggestedTemplateId === selectedTemplateId || detectedType.toLowerCase().includes(selectedTemplate.documentType.toLowerCase())
    : false

  return { detectedType, matchesTemplate, suggestedTemplateId }
}

/**
 * Verify extracted fields against the source document.
 * Runs a second LLM call to check each field for support in the original text.
 * Marks unverified fields with [Unverified] prefix and sets confidence levels.
 */
export async function verifyExtraction(
  fields: SummaryField[],
  documentText: string,
  model: string = 'llama3.2:3b'
): Promise<SummaryField[]> {
  const fieldSummary = fields
    .map((f) => `- ${f.name}: ${f.content}`)
    .join('\n')

  const prompt = `You are verifying extracted information against a source document.

For each field below, determine if the extracted information is supported by the document.
Respond with one line per field in this exact format:
FIELD_NAME: VERIFIED | quote from document
or
FIELD_NAME: UNVERIFIED | reason

Fields to verify:
${fieldSummary}

<document>
${documentText.slice(0, 15000)}
</document>`

  const result = await api.generate({
    model,
    prompt,
    system: 'You are a legal document verification specialist. Be strict — only mark VERIFIED if the document explicitly contains the claimed information.',
    temperature: 0.1,
    max_tokens: 4096,
  })

  const verificationLines = result.response.split('\n').filter((l) => l.trim())
  const verificationMap = new Map<string, boolean>()

  for (const line of verificationLines) {
    const verifiedMatch = line.match(/^(.+?):\s*VERIFIED/i)
    const unverifiedMatch = line.match(/^(.+?):\s*UNVERIFIED/i)
    if (verifiedMatch) {
      verificationMap.set(verifiedMatch[1].trim().toLowerCase(), true)
    } else if (unverifiedMatch) {
      verificationMap.set(unverifiedMatch[1].trim().toLowerCase(), false)
    }
  }

  return fields.map((field) => {
    // Skip fields that are already "Not specified"
    if (field.content.includes('Not specified in this document.')) {
      return { ...field, confidence: 'low' as const }
    }

    const isVerified = verificationMap.get(field.name.toLowerCase())

    if (isVerified === true) {
      return { ...field, confidence: 'high' as const }
    } else if (isVerified === false) {
      return {
        ...field,
        content: `[Unverified] ${field.content}`,
        sourceReference: undefined,
        confidence: 'low' as const,
      }
    }

    // If verification didn't cover this field, mark as medium
    return { ...field, confidence: 'medium' as const }
  })
}

/**
 * Orchestrate document summarization:
 * 1. Get document text from store
 * 2. Get template from store
 * 3. Build prompt
 * 4. Call LLM via API
 * 5. Parse output
 * 6. Run verification pass
 * 7. Store summary
 */
export async function summarizeDocument(
  documentId: string,
  templateId: string,
  model: string = 'llama3.2:3b',
  chunkSize: number = 20000,
  onProgress?: (current: number, total: number, status: string) => void
): Promise<DocumentSummary> {
  const store = useDocumentStore.getState()

  const document = store.documents.find((d) => d.id === documentId)
  if (!document) throw new Error(`Document not found: ${documentId}`)

  const template = store.templates.find((t) => t.id === templateId)
  if (!template) throw new Error(`Template not found: ${templateId}`)

  store.updateDocument(documentId, { status: 'summarizing' })

  try {
    const chunks = chunkText(document.extractedText, chunkSize)
    let fields: SummaryField[]
    let rawOutput: string
    const chunkSummaries: string[] = []

    // +1 for verification pass in total steps
    if (chunks.length === 1) {
      const total = 2 // extraction + verification
      // Single chunk — direct summarization
      onProgress?.(1, total, 'Extracting document information...')
      const prompt = buildSummarizationPrompt(document.extractedText, template)
      const result = await api.generate({
        model,
        prompt,
        system: template.systemPrompt,
        temperature: 0.1,
        max_tokens: 4096,
      })
      fields = parseSummaryOutput(result.response, template)
      rawOutput = result.response

      // Verification pass
      onProgress?.(2, total, 'Verifying extracted information...')
      fields = await verifyExtraction(fields, document.extractedText, model)
    } else {
      // Multi-chunk — summarize each, then meta-summarize, then verify
      const total = chunks.length + 2 // chunks + meta-summary + verification

      for (let i = 0; i < chunks.length; i++) {
        onProgress?.(i + 1, total, `Extracting chunk ${i + 1}/${chunks.length}...`)
        const prompt = buildSummarizationPrompt(chunks[i].text, template)
        const result = await api.generate({
          model,
          prompt,
          system: template.systemPrompt,
          temperature: 0.1,
          max_tokens: 4096,
        })
        chunkSummaries.push(result.response)
      }

      // Meta-summarization
      onProgress?.(chunks.length + 1, total, 'Combining chunk summaries...')
      const metaPrompt = buildMetaSummaryPrompt(chunkSummaries, template)
      const metaResult = await api.generate({
        model,
        prompt: metaPrompt,
        system: template.systemPrompt,
        temperature: 0.1,
        max_tokens: 4096,
      })

      fields = parseSummaryOutput(metaResult.response, template)
      rawOutput = metaResult.response

      // Verification pass
      onProgress?.(chunks.length + 2, total, 'Verifying extracted information...')
      fields = await verifyExtraction(fields, document.extractedText, model)
    }

    const summary: DocumentSummary = {
      id: `summary-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      documentId,
      templateId,
      fields,
      rawOutput,
      createdAt: new Date().toISOString(),
      chunkSummaries: chunkSummaries.length > 0 ? chunkSummaries : undefined,
    }

    store.addSummary(summary)
    store.updateDocument(documentId, { status: 'complete' })

    return summary
  } catch (error) {
    store.updateDocument(documentId, {
      status: 'error',
      error: error instanceof Error ? error.message : 'Summarization failed',
    })
    throw error
  }
}

/**
 * Batch-process multiple documents sequentially with progress tracking and error isolation.
 * Failed documents are logged and skipped so the batch continues.
 * Supports cancellation via a mutable cancel flag.
 */
export async function summarizeBatch(
  documentIds: string[],
  templateId: string,
  model: string = 'llama3.2:3b',
  chunkSize: number = 20000,
  onProgress?: (completed: number, total: number, documentId: string, status: string) => void,
  cancelRef?: { current: boolean }
): Promise<{ results: DocumentSummary[]; errors: Array<{ documentId: string; error: string }> }> {
  const results: DocumentSummary[] = []
  const errors: Array<{ documentId: string; error: string }> = []
  const total = documentIds.length

  for (let i = 0; i < documentIds.length; i++) {
    if (cancelRef?.current) break

    const docId = documentIds[i]
    onProgress?.(i, total, docId, 'processing')

    try {
      const summary = await summarizeDocument(docId, templateId, model, chunkSize)
      results.push(summary)
    } catch (err) {
      errors.push({
        documentId: docId,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }

    onProgress?.(i + 1, total, docId, 'done')
  }

  return { results, errors }
}

/**
 * Generate an embedding vector for text via backend.
 */
export async function embedText(text: string): Promise<number[]> {
  const response = await fetch(`${API_BASE_URL}/documents/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!response.ok) throw new Error('Embedding failed')
  const data = await response.json()
  return data.embedding
}

/**
 * Compute cosine similarity between two vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}

/**
 * Index a document's summary for search by generating its embedding.
 */
export async function indexDocumentForSearch(documentId: string): Promise<void> {
  const store = useDocumentStore.getState()
  const doc = store.documents.find((d) => d.id === documentId)
  if (!doc) return

  const summary = store.getSummaryForDocument(documentId)
  if (!summary) return

  const summaryText = summary.fields.map((f) => `${f.name}: ${f.content}`).join('\n')
  const embedding = await embedText(summaryText)

  store.addSearchEntry({
    documentId,
    documentName: doc.name,
    summaryText,
    embedding,
    indexedAt: new Date().toISOString(),
  })
}

/**
 * Search indexed documents by natural language query.
 * Returns results ranked by cosine similarity.
 */
export async function searchDocuments(query: string): Promise<Array<{
  documentId: string
  documentName: string
  summaryText: string
  score: number
}>> {
  const store = useDocumentStore.getState()
  const queryEmbedding = await embedText(query)

  const results = store.searchIndex.map((entry) => ({
    documentId: entry.documentId,
    documentName: entry.documentName,
    summaryText: entry.summaryText,
    score: cosineSimilarity(queryEmbedding, entry.embedding),
  }))

  return results.sort((a, b) => b.score - a.score).slice(0, 10)
}
