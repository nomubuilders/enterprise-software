import { api } from './api'
import { useDocumentStore } from '../store/documentStore'
import type { ExtractionTemplate, SummaryField, DocumentSummary } from '../types/document'

/**
 * Build a structured summarization prompt from template fields using XML-tagged format.
 * Follows Claude's legal summarization guide pattern.
 */
export function buildSummarizationPrompt(text: string, template: ExtractionTemplate): string {
  const fieldInstructions = template.fields
    .map((f) => `- <${sanitizeTag(f.name)}>: ${f.description}. ${f.instructions}`)
    .join('\n')

  return `Summarize the following ${template.documentType} document. Focus on these key aspects:

${fieldInstructions}

Provide the summary with bullet points nested within XML tags for each section. Use this exact format:

${template.fields.map((f) => `<${sanitizeTag(f.name)}>
- Key detail: [extracted value]
</${sanitizeTag(f.name)}>`).join('\n\n')}

If information for a section is not found in the document, note as "Not specified in this document."

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
 * Uses regex to extract content between matching XML tags.
 * Falls back to storing raw output if XML parsing fails.
 */
export function parseSummaryOutput(output: string, template: ExtractionTemplate): SummaryField[] {
  const fields: SummaryField[] = []

  for (const field of template.fields) {
    const tag = sanitizeTag(field.name)
    const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i')
    const match = output.match(regex)

    fields.push({
      name: field.name,
      content: match ? match[1].trim() : 'Not specified in this document.',
    })
  }

  // If no fields matched at all, return raw output as single field
  if (fields.every((f) => f.content === 'Not specified in this document.')) {
    return [{ name: 'Summary', content: output.trim() }]
  }

  return fields
}

/**
 * Orchestrate document summarization:
 * 1. Get document text from store
 * 2. Get template from store
 * 3. Build prompt
 * 4. Call LLM via API
 * 5. Parse output
 * 6. Store summary
 */
export async function summarizeDocument(
  documentId: string,
  templateId: string,
  model: string = 'llama3.2'
): Promise<DocumentSummary> {
  const store = useDocumentStore.getState()

  const document = store.documents.find((d) => d.id === documentId)
  if (!document) throw new Error(`Document not found: ${documentId}`)

  const template = store.templates.find((t) => t.id === templateId)
  if (!template) throw new Error(`Template not found: ${templateId}`)

  // Update document status
  store.updateDocument(documentId, { status: 'summarizing' })

  try {
    const prompt = buildSummarizationPrompt(document.extractedText, template)

    const result = await api.generate({
      model,
      prompt,
      system: template.systemPrompt,
      temperature: 0.2, // Low temperature for legal precision
      max_tokens: 4096,
    })

    const fields = parseSummaryOutput(result.response, template)

    const summary: DocumentSummary = {
      id: `summary-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      documentId,
      templateId,
      fields,
      rawOutput: result.response,
      createdAt: new Date().toISOString(),
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
