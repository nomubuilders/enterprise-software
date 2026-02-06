export interface TemplateField {
  name: string
  description: string
  instructions: string
}

export interface ExtractionTemplate {
  id: string
  name: string
  description: string
  documentType: string
  systemPrompt: string
  fields: TemplateField[]
}

export interface DocumentMeta {
  id: string
  name: string
  fileType: 'pdf' | 'docx' | 'txt'
  fileSize: number
  pageCount: number
  extractedText: string
  uploadedAt: string
  status: 'uploaded' | 'parsing' | 'parsed' | 'summarizing' | 'complete' | 'error'
  error?: string
}

export interface SummaryField {
  name: string
  content: string
}

export interface DocumentSummary {
  id: string
  documentId: string
  templateId: string
  fields: SummaryField[]
  rawOutput: string
  createdAt: string
  chunkSummaries?: string[]
}

export interface EvaluationResult {
  id: string
  documentId: string
  summaryId: string
  rouge1: number
  rouge2: number
  rougeL: number
  bleu: number
  embeddingSimilarity?: number
  llmGrade?: {
    accuracy: number
    completeness: number
    legalPrecision: number
    conciseness: number
  }
  referenceSummary: string
  evaluatedAt: string
  passesThreshold: boolean
}

export interface SearchEntry {
  documentId: string
  documentName: string
  summaryText: string
  embedding: number[]
  indexedAt: string
}

export interface DocumentConfig {
  mode: 'summarize' | 'search' | 'batch'
  templateId: string | null
  chunkSize: number
  chunkOverlap: number
  systemPromptOverride?: string
  documents: string[]  // document IDs
}
