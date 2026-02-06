---
name: legal-summarization
description: Legal document summarization pipeline with upload, structured extraction, meta-summarization, RAG search, and evaluation
status: backlog
created: 2026-02-06T08:14:38Z
---

# PRD: Legal Summarization

## Executive Summary

Add a comprehensive legal document summarization pipeline to ComplianceFlow. Users will upload legal documents (PDFs, DOCX, TXT), extract text, run structured summarization through local Ollama LLMs, handle long documents via meta-summarization (chunking), search across document collections using summary-indexed RAG, and evaluate summary quality with automated metrics. The entire pipeline runs on-premises via the existing Ollama integration, maintaining ComplianceFlow's air-gapped, privacy-first philosophy.

This feature transforms ComplianceFlow from a general workflow builder into a purpose-built tool for legal compliance teams who need to process contracts, litigation materials, and regulatory filings at scale without sending sensitive data to external APIs.

## Problem Statement

Legal teams at privacy-sensitive organizations face a critical bottleneck: they must review, summarize, and search large volumes of legal documents (contracts, court filings, compliance reports) but cannot use cloud-based AI services due to data residency, attorney-client privilege, and regulatory requirements. Manual review is slow, expensive, and inconsistent. Existing AI summarization tools require sending documents to external APIs, violating the on-premises requirement that ComplianceFlow was built to serve.

### Why Now
- Local LLMs (via Ollama) have reached sufficient quality for structured legal summarization
- ComplianceFlow already has the LLM infrastructure, PII filtering, and air-gapped container execution
- Enterprise legal teams are actively seeking on-premises AI solutions for document processing
- The workflow canvas architecture makes it natural to add document processing as a new node type

## User Stories

### Persona: Compliance Officer (Sarah)
Sarah manages regulatory compliance for a healthcare organization. She needs to review hundreds of vendor contracts annually to ensure HIPAA compliance.

**Story 1: Single Document Summarization**
> As a compliance officer, I want to upload a vendor contract PDF and get a structured summary extracting parties, terms, obligations, and compliance clauses so that I can quickly assess contract risk without reading the full 50-page document.

Acceptance Criteria:
- Upload PDF via drag-and-drop or file picker
- Text extracted automatically from PDF
- Summary follows a configurable template with sections (parties, terms, obligations, etc.)
- Summary output available in chat panel, email, or spreadsheet export
- PII filtering can be applied before or after summarization

**Story 2: Batch Document Processing**
> As a compliance officer, I want to upload a folder of 200 vendor contracts and get standardized summaries for each so that I can compare terms across vendors efficiently.

Acceptance Criteria:
- Upload multiple files at once
- Each document processed independently through the same summarization template
- Progress indicator showing documents processed vs. remaining
- Results exportable as a spreadsheet with one row per document
- Failed documents flagged with error details, not silently skipped

**Story 3: Long Document Handling**
> As a compliance officer, I want to summarize a 300-page regulatory filing that exceeds the LLM's context window so that I don't lose important details from later sections.

Acceptance Criteria:
- Documents automatically chunked when exceeding context window
- Each chunk summarized independently
- Chunk summaries combined into a coherent meta-summary
- Final summary is as comprehensive as if the entire document fit in context
- User can view individual chunk summaries if needed

### Persona: Legal Researcher (Marcus)
Marcus prepares case materials for a law firm's litigation team. He needs to search across thousands of case documents quickly.

**Story 4: Document Collection Search**
> As a legal researcher, I want to ask natural language questions across a collection of case documents and get relevant excerpts with citations so that I can find precedents and key arguments without manually searching each file.

Acceptance Criteria:
- Documents indexed with AI-generated summaries
- Natural language query returns ranked relevant documents
- Each result includes the document name, relevant excerpt, and page reference
- Results displayed in chat panel with clickable citations
- Search works entirely on-premises (no external vector DB)

**Story 5: Summary Quality Validation**
> As a legal researcher, I want to compare AI-generated summaries against expert-written reference summaries so that I can validate the system's accuracy before relying on it for case preparation.

Acceptance Criteria:
- Upload reference summaries alongside source documents
- Automated scoring using ROUGE, BLEU, and embedding similarity metrics
- LLM-based grading against configurable rubrics (accuracy, completeness, legal precision)
- Quality dashboard showing scores across documents
- Flag summaries that fall below configurable quality thresholds

### Persona: In-House Counsel (Priya)
Priya reviews contracts for a financial services firm with strict data sovereignty requirements.

**Story 6: Configurable Extraction Templates**
> As in-house counsel, I want to define custom extraction templates for different document types (NDA vs. lease vs. employment contract) so that summaries always capture the fields my team cares about.

Acceptance Criteria:
- Create, edit, and save extraction templates with named fields
- Templates assignable per document type or per workflow
- Default templates provided for common document types (NDA, lease, service agreement, employment contract)
- Template fields support descriptions/instructions to guide extraction
- Templates stored locally and shareable as JSON exports

## Requirements

### Functional Requirements

#### FR1: Document Node
- New "Legal Document" node type for the workflow canvas
- Drag-and-drop from sidebar under a new "Documents" category
- Node config panel with: file upload zone, document type selector, extraction template selector
- Supports PDF, DOCX, TXT, and plain text input
- Visual indicator showing document status (uploaded, parsing, parsed, summarizing, complete, error)
- Passes extracted text and metadata downstream to connected nodes

#### FR2: Document Parsing Service
- PDF text extraction using a library (pdf.js for frontend or a Python backend service)
- DOCX parsing for Word documents
- Text cleaning: whitespace normalization, page number removal, header/footer stripping
- Metadata extraction: page count, file size, detected document type
- Parsing runs locally (no external services)

#### FR3: Structured Summarization
- Configurable extraction templates with named sections and field descriptions
- Prompt construction using the template fields as extraction directives
- XML-tagged output format for reliable parsing (per Claude guide pattern)
- "Not specified" fallback for fields not found in the document
- System prompt configurable per template (e.g., "You are a legal analyst specializing in real estate law")

#### FR4: Meta-Summarization (Chunking)
- Automatic detection when document exceeds LLM context window
- Configurable chunk size (default 20,000 characters, adjustable)
- Each chunk summarized independently using the same template
- Chunk summaries combined into a final coherent meta-summary
- Individual chunk summaries viewable for debugging
- Overlap between chunks to prevent losing context at boundaries

#### FR5: Batch Processing
- Upload multiple documents to a single Document Node
- Sequential processing with progress tracking
- Per-document status and error handling
- Batch results aggregated for downstream nodes
- Configurable parallelism (1-4 concurrent summaries based on system resources)

#### FR6: Summary-Indexed Document Search (RAG)
- New "Document Search" node type or mode within Document Node
- Index documents by generating and storing summaries locally
- Natural language query interface in chat panel
- Summary-based ranking to identify relevant documents
- Return ranked results with document name, relevance score, and relevant excerpts
- Local vector storage (in-memory or SQLite-based, no external DB required)

#### FR7: Evaluation & Quality Metrics
- ROUGE score calculation (ROUGE-1, ROUGE-2, ROUGE-L) comparing generated vs. reference summaries
- BLEU score calculation for n-gram precision
- Embedding similarity using local Ollama embeddings
- LLM-based grading: use Ollama to score summaries against configurable rubrics
- Quality dashboard panel showing per-document and aggregate scores
- Configurable quality thresholds with visual pass/fail indicators

#### FR8: Extraction Templates
- Template editor UI for creating/editing extraction templates
- Default templates for: NDA, Lease/Sublease, Service Agreement, Employment Contract, Court Filing, Regulatory Report
- Template fields: name, description, extraction instructions
- Import/export templates as JSON
- Templates stored in Zustand store with localStorage persistence

#### FR9: Output Integration
- Summarization results flow to existing Output Node (chat, email, spreadsheet, Telegram)
- Spreadsheet export with one row per document, columns per template field
- Chat panel displays formatted summaries with section headers
- Email output includes formatted summary as body or attachment

### Non-Functional Requirements

#### NFR1: Performance
- PDF parsing under 5 seconds for documents up to 100 pages
- Single document summarization under 60 seconds (dependent on Ollama model speed)
- Batch processing of 100 documents within 2 hours
- Document search queries return results within 10 seconds for collections up to 1,000 documents

#### NFR2: Privacy & Security
- All processing runs locally - zero external API calls
- Documents never leave the user's machine
- PII filtering can be applied at any pipeline stage
- Docker container execution available for sandboxed document parsing
- No document content stored in browser localStorage (only metadata and summaries)

#### NFR3: Reliability
- Graceful handling of malformed PDFs (clear error message, skip to next in batch)
- Resume capability for interrupted batch processing
- Chunk boundary handling preserves sentence integrity
- No data loss on browser refresh (workflow state persisted, documents re-uploadable)

#### NFR4: Scalability
- Support documents from 1 page to 1,000+ pages
- Support document collections from 1 to 10,000 files
- Memory-efficient chunking (stream processing, not loading entire document into memory)
- Configurable resource limits for summarization (CPU, memory via Docker)

## Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Summarization accuracy | ROUGE-L > 0.35 against expert references | Automated ROUGE scoring |
| Processing throughput | 50+ documents/hour on standard hardware | Batch processing timer |
| User time savings | 80% reduction vs. manual review | User survey / task timing |
| Template coverage | 6+ default templates available | Template count |
| Document type support | PDF, DOCX, TXT all functional | Integration tests |
| Search relevance | Top-3 results contain correct document 90% of the time | Evaluation with test queries |
| Quality threshold alerts | 100% of below-threshold summaries flagged | Automated evaluation |
| Zero external calls | 0 network requests to external APIs during processing | Network audit |

## Constraints & Assumptions

### Constraints
- Must work entirely offline / on-premises (no Claude API, no external vector DBs)
- Summarization quality bounded by local Ollama model capabilities (smaller than Claude Opus)
- PDF parsing limited to text-based PDFs (scanned/image PDFs require OCR, which is out of scope for V1)
- Context window size varies by Ollama model (typically 4K-128K tokens)
- Browser memory limits constrain in-memory vector storage to ~10,000 documents

### Assumptions
- Users have Ollama installed and running with at least one capable model (e.g., llama3, mistral)
- Backend API server is available for file processing endpoints
- Documents are primarily English-language legal documents
- Users will provide reference summaries for evaluation (system does not generate references)
- Embedding model available in Ollama for vector similarity (e.g., nomic-embed-text)

## Out of Scope

- **OCR for scanned PDFs** - Only text-based PDFs supported in V1; image/scanned document OCR deferred
- **Claude API integration** - All processing uses local Ollama only; Claude API support may be added later
- **Multi-language support** - English documents only in V1
- **Real-time collaboration** - Single-user document processing; no shared annotations or reviews
- **Document editing** - Read-only processing; no ability to edit documents within ComplianceFlow
- **Court filing automation** - Summarization only; no automated filing or submission to legal systems
- **Fine-tuning** - No local model fine-tuning workflow; users select from available Ollama models
- **Handwriting recognition** - No support for handwritten legal documents
- **Audio/video transcription** - No processing of depositions or hearing recordings

## Dependencies

### Technical Dependencies
- **PDF parsing library**: pdf.js (browser-side) or PyPDF/pdfplumber (backend Python service)
- **DOCX parsing library**: mammoth.js (browser-side) or python-docx (backend)
- **Ollama**: Local LLM runtime with a capable model installed
- **Ollama embeddings**: Embedding model (e.g., nomic-embed-text) for vector search
- **Vector similarity**: Local computation library (e.g., cosine similarity in JS/Python)
- **ROUGE/BLEU scoring**: rouge-score Python library or JavaScript implementation
- **Backend API**: New endpoints for document parsing, batch processing, and evaluation

### Internal Dependencies
- Existing LLM Node infrastructure (Ollama service integration)
- Existing PII Filter Node (for pre/post summarization filtering)
- Existing Output Node (for summary delivery via chat, email, spreadsheet)
- Existing Docker Container Node (optional sandboxed parsing)
- BaseNode component pattern for new Document Node
- Zustand store pattern for template and document state management

### Workflow Integration
- Document Node connects to LLM Node for summarization
- Document Node connects to PII Filter Node for redaction
- LLM Node output connects to Output Node for delivery
- Document Search mode integrates with Chat Interface Panel

## Technical Architecture Notes

### New Components
- `DocumentNode.tsx` - Workflow canvas node for document upload and config
- `DocumentSearchNode.tsx` - Optional separate node for RAG search (or mode within DocumentNode)
- `TemplateEditorPanel.tsx` - UI for creating/editing extraction templates
- `EvaluationDashboard.tsx` - Quality metrics display panel
- `DocumentUploadZone.tsx` - Reusable drag-and-drop file upload component

### New Store
- `documentStore.ts` - Templates, uploaded documents metadata, evaluation results, search index

### New Types
- `DocumentConfig` - Upload settings, document type, template selection
- `ExtractionTemplate` - Template name, fields with descriptions, system prompt
- `DocumentSummary` - Parsed summary with per-field results
- `EvaluationResult` - ROUGE, BLEU, embedding similarity, LLM grade scores
- `DocumentIndex` - Summary-indexed document metadata for RAG search

### New Backend Endpoints
- `POST /api/v1/documents/parse` - Upload and extract text from PDF/DOCX/TXT
- `POST /api/v1/documents/summarize` - Run summarization with template
- `POST /api/v1/documents/batch` - Batch process multiple documents
- `POST /api/v1/documents/search` - Query document collection
- `POST /api/v1/documents/evaluate` - Run quality metrics against references
- `GET /api/v1/documents/templates` - List available extraction templates

### Prompt Pattern (from Claude Guide)
```
Summarize the following {document_type}. Focus on these key aspects:
{template_fields_formatted}

Provide the summary in bullet points nested within the XML header for each section.
<{field_name}>
- Key detail: [extracted value]
</{field_name}>

If any information is not explicitly stated in the document, note it as "Not specified".

Document text:
{extracted_text}
```
