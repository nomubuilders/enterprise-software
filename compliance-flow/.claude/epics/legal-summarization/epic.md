---
name: legal-summarization
status: completed
created: 2026-02-06T08:16:40Z
progress: 100%
updated: 2026-02-08T07:46:36Z
prd: .claude/prds/legal-summarization.md
github: https://github.com/nomubuilders/enterprise-software/issues/23
---

# Epic: Legal Summarization

## Overview

Add legal document summarization capabilities to ComplianceFlow via a new Document Node and supporting backend services. Users upload PDFs/DOCX/TXT files, configure extraction templates, and run structured summarization through local Ollama LLMs. Long documents are automatically chunked and meta-summarized. A document search mode enables RAG-style queries across collections. An evaluation panel scores summary quality with ROUGE/BLEU metrics and LLM-based grading.

Everything runs on-premises via existing Ollama integration — zero external API calls.

## Architecture Decisions

1. **Frontend PDF parsing with pdf.js + mammoth.js** — Keeps document processing entirely in-browser. No new backend dependency for parsing. Backend only needed for LLM calls (already exists via Ollama service).

2. **Single `documentNode` type with modes** — Rather than separate Document + DocumentSearch nodes, use one node type with a mode toggle (`summarize` | `search` | `batch`). Reduces sidebar clutter and reuses config panel infrastructure.

3. **Reuse existing LLM service for summarization** — The `api.generate()` endpoint already handles Ollama calls. Summarization constructs prompts client-side using templates and sends them through the existing generate/chat API. No new backend summarization endpoint needed.

4. **New `documentStore.ts`** for templates, document metadata, search index, and evaluation results. Follows existing Zustand persist pattern (`create<State>()(persist(...))`).

5. **New backend `/api/v1/documents/` routes** only for operations that must be server-side: batch file upload handling, evaluation metric calculation (ROUGE/BLEU in Python), and embedding generation for search indexing.

6. **In-memory vector store** — Summaries stored as embeddings in the Zustand store for document search. Cosine similarity computed client-side for collections under 1,000 docs. For larger collections, the backend computes rankings.

7. **XML-tagged output parsing** — Following the Claude guide pattern, prompts instruct the LLM to output sections within XML tags (`<parties>...</parties>`). Frontend parses these into structured fields. Fallback to raw text if XML parsing fails.

## Technical Approach

### Frontend Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `DocumentNode.tsx` | `src/components/nodes/` | Canvas node with file status indicator, wraps BaseNode |
| `DocumentNodeConfig` | Inside `NodeConfigPanel.tsx` | Config panel: upload zone, template selector, mode toggle, chunk settings |
| `TemplateEditorModal.tsx` | `src/components/modals/` | Create/edit extraction templates with field definitions |
| `EvaluationPanel.tsx` | `src/components/panels/` | Quality dashboard: per-doc scores, aggregate metrics, threshold alerts |
| `DocumentUploadZone.tsx` | `src/components/common/` | Reusable drag-and-drop file upload component |

**State**: New `documentStore.ts` with:
- `templates: ExtractionTemplate[]` — persisted extraction templates + 6 defaults
- `documents: DocumentMeta[]` — uploaded doc metadata (name, size, page count, extracted text hash)
- `summaries: DocumentSummary[]` — generated summaries per document
- `searchIndex: SearchEntry[]` — embeddings + summary text for RAG search
- `evaluationResults: EvaluationResult[]` — quality scores per document

### Backend Services

| File | Purpose |
|------|---------|
| `app/api/documents.py` | Routes: `/parse` (file upload + text extraction), `/evaluate` (ROUGE/BLEU scoring), `/embed` (Ollama embeddings for search) |
| `app/services/document_service.py` | PDF/DOCX parsing with PyPDF2 + python-docx, text cleaning, metadata extraction |
| `app/services/evaluation_service.py` | ROUGE/BLEU calculation using rouge-score and nltk |

**Key insight**: Summarization itself does NOT need a backend endpoint — the frontend constructs prompts from templates and calls the existing `/llm/generate` endpoint. Backend only handles file parsing (binary files can't be processed in-browser reliably for all formats) and evaluation metrics (Python libraries are more mature).

### Workflow Integration

The Document Node integrates into `workflowStore.ts`'s `runWorkflow()`:
- Adds a `documentNode` case that reads `workflowData.documentText` (extracted text) and `workflowData.documentSummary` (structured summary)
- Downstream LLM nodes receive document text as context
- Downstream PII Filter nodes can filter summary content
- Downstream Output nodes export summaries to chat/email/spreadsheet

### Chunking Strategy (Meta-summarization)

1. Frontend checks if document text exceeds configurable threshold (default: 20,000 chars)
2. If yes, splits into overlapping chunks (500-char overlap at sentence boundaries)
3. Each chunk sent to `/llm/generate` with the same extraction template
4. Chunk summaries aggregated and sent as a final meta-summarization prompt
5. Individual chunk summaries stored for debugging/inspection

## Implementation Strategy

### Phase 1: Foundation (Tasks 1-3)
Types, store, backend parsing service, document upload UI

### Phase 2: Core Summarization (Tasks 4-6)
Document Node, structured summarization with templates, meta-summarization

### Phase 3: Advanced Features (Tasks 7-9)
Batch processing, RAG search, evaluation dashboard

### Phase 4: Integration (Task 10)
Workflow execution integration, output node compatibility, end-to-end testing

### Risk Mitigation
- **PDF parsing quality**: Use PyPDF2 on backend for reliability; fallback error messages for malformed PDFs
- **LLM output parsing**: XML tag parsing with graceful fallback to raw text
- **Large document memory**: Stream chunks rather than loading entire document; cap at configurable limit
- **Ollama model quality**: Low temperature (0.1-0.3) for legal summarization; system prompts tuned for precision

## Task Breakdown

- [ ] **Task 1: Types and document store** — Define TypeScript interfaces (`DocumentConfig`, `ExtractionTemplate`, `DocumentSummary`, `EvaluationResult`, `SearchEntry`) in `src/types/document.ts`. Create `documentStore.ts` with Zustand persist pattern. Include 6 default extraction templates (NDA, Lease, Service Agreement, Employment Contract, Court Filing, Regulatory Report).

- [ ] **Task 2: Backend document parsing service** — Add `document_service.py` with PyPDF2 + python-docx for text extraction and cleaning. Add `documents.py` API routes: `POST /parse` (multipart file upload, returns extracted text + metadata). Add dependencies to `requirements.txt`.

- [ ] **Task 3: Document upload UI component** — Create `DocumentUploadZone.tsx` (drag-and-drop + file picker, supports PDF/DOCX/TXT, shows file info and status). Reusable across Document Node config and batch upload.

- [ ] **Task 4: Document Node and canvas integration** — Create `DocumentNode.tsx` wrapping BaseNode with FileText icon. Register in `nodes/index.ts`. Add to Sidebar under new "Documents" category. Add `DocumentNodeConfig` section in `NodeConfigPanel.tsx` with upload zone, template selector, mode toggle, and chunk size settings.

- [ ] **Task 5: Structured summarization engine** — Build prompt construction from extraction templates (XML-tagged format per Claude guide). Add XML output parser to extract structured fields. Integrate with existing `/llm/generate` API. Display parsed summary sections in config panel preview.

- [ ] **Task 6: Meta-summarization (chunking)** — Implement text chunking with sentence-boundary awareness and configurable overlap. Auto-detect when document exceeds context window. Chain chunk summarization → meta-summarization via sequential `/llm/generate` calls. Show per-chunk summaries in expandable debug view.

- [ ] **Task 7: Batch processing** — Extend Document Node to accept multiple files. Add batch progress tracking UI (processed/total, per-doc status). Sequential processing with error isolation (failed docs don't block batch). Aggregate results for downstream nodes.

- [ ] **Task 8: Summary-indexed document search (RAG)** — Add `/embed` backend endpoint using Ollama embeddings API. Store document summaries + embeddings in documentStore. Add search mode to Document Node config with query input. Compute cosine similarity for ranking. Display results in chat panel with document name, relevance score, and excerpt.

- [ ] **Task 9: Evaluation dashboard** — Add backend `/evaluate` endpoint with ROUGE-1/2/L and BLEU scoring (rouge-score + nltk). Add `EvaluationPanel.tsx` with per-document scores table, aggregate metrics, quality threshold configuration, and pass/fail indicators. Add LLM-based grading option via Ollama (scores summary against rubric).

- [ ] **Task 10: Workflow execution integration and testing** — Add `documentNode` case to `workflowStore.ts` `runWorkflow()`. Wire document text/summary into `workflowData` for downstream nodes. Ensure Output Node handles document summaries (spreadsheet: one row per doc, columns per field; chat: formatted sections; email: summary as body). End-to-end testing of full pipeline.

## Dependencies

### External Libraries (New)
- **Frontend**: `pdfjs-dist` (PDF rendering/extraction in browser as fallback)
- **Backend**: `PyPDF2`, `python-docx`, `rouge-score`, `nltk`

### Internal Dependencies
- Existing Ollama service (`/llm/generate`, `/llm/chat`)
- Existing Output Node (chat, email, spreadsheet, Telegram)
- Existing PII Filter Node
- BaseNode component pattern
- Zustand persist pattern
- NodeConfigPanel extensibility

## Success Criteria (Technical)

| Criterion | Target |
|-----------|--------|
| PDF text extraction | Handles 1-1000 page text-based PDFs without crash |
| DOCX text extraction | Preserves headings, paragraphs, and table text |
| Template-based summarization | 6 default templates produce structured output |
| XML parsing reliability | >95% of LLM outputs parsed into structured fields |
| Meta-summarization | Documents >20K chars chunked and combined seamlessly |
| Batch processing | 100 docs processed with per-doc progress and error handling |
| Search relevance | Top-3 results contain target doc >80% of time |
| ROUGE scoring | Automated scoring completes <5s per document pair |
| Workflow integration | Document → LLM → PII → Output pipeline works end-to-end |
| Zero external calls | Network audit shows 0 external requests during processing |

## Estimated Effort

- **Total tasks**: 10
- **Parallel streams**: Tasks 1-3 (foundation) can run in parallel; Tasks 4-6 sequential; Tasks 7-9 can partially parallelize; Task 10 requires all prior tasks
- **Critical path**: Task 1 → Task 4 → Task 5 → Task 6 → Task 10
- **Backend work**: Tasks 2, 8, 9 (Python services)
- **Frontend work**: Tasks 1, 3, 4, 5, 6, 7, 10
- **Highest risk**: Task 5 (LLM output quality depends on Ollama model) and Task 8 (embedding quality for search)

## Tasks Created
- [ ] #24 - Types and document store (parallel: true)
- [ ] #26 - Backend document parsing service (parallel: true)
- [ ] #30 - Document upload UI component (parallel: true)
- [ ] #32 - Document Node and canvas integration (parallel: false, depends: #24, #30)
- [ ] #28 - Structured summarization engine (parallel: false, depends: #24, #32)
- [ ] #31 - Meta-summarization and chunking (parallel: false, depends: #28)
- [ ] #33 - Batch processing (parallel: true, depends: #28, #31)
- [ ] #25 - Summary-indexed document search / RAG (parallel: true, depends: #24, #28)
- [ ] #27 - Evaluation dashboard (parallel: true, depends: #24, #28)
- [ ] #29 - Workflow execution integration and testing (parallel: false, depends: #32, #28, #31, #33)

Total tasks: 10
Parallel tasks: 6 (#24, #26, #30, #33, #25, #27)
Sequential tasks: 4 (#32, #28, #31, #29)
Estimated total effort: 52-70 hours
