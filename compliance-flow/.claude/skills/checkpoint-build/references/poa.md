# Plan of Action: Compliance Dashboard Document Generation

## Goal Statement

Enable the compliance dashboard node to generate real, downloadable documents (Markdown, PDF, DOCX, XLSX) with AI-interpreted content by adding a backend `ReportGeneratorService`, a FastAPI endpoint, and frontend integration — all running through Docker.

## Success Criteria

| # | Criterion | How to verify |
|---|-----------|---------------|
| 1 | `POST /api/v1/outputs/report/generate` returns valid base64-encoded files for each format | `curl` the endpoint with test payload, decode and open each file |
| 2 | PDF output contains styled AI-generated text, not raw markdown | Open the downloaded PDF — verify headers, paragraphs, proper formatting |
| 3 | DOCX output contains styled AI-generated text with title and sections | Open in Word/LibreOffice — verify heading styles and paragraph content |
| 4 | XLSX output has a Summary sheet (AI content) and a Data sheet (raw input) | Open in Excel — verify both sheets present with content |
| 5 | Markdown output returns raw `.md` content | Decode base64 — verify valid markdown |
| 6 | Backend `_execute_compliance_dashboard_node` calls `ReportGeneratorService` and returns file data | Run `node_test.py` for `complianceDashboardNode` — verify `file_content` in output |
| 7 | Frontend triggers browser download when compliance node executes | Run workflow in UI — file saves to Downloads |
| 8 | Graceful fallback when Ollama is unavailable | Stop Ollama, hit endpoint — verify structured error, no crash |
| 9 | All functions have type annotations and docstrings | Code review: grep for `def ` without `->` |
| 10 | No duplicated logic between generators | Code review: each format generator delegates to shared content generator |

## Checkpoints

### Checkpoint 1: ReportGeneratorService — Content Generation (Pure Function)

**Component**: Backend service — AI content generation  
**Files**:
- `[NEW] backend/app/services/report_generator.py`

**Functions to implement**:
```python
def build_report_prompt(input_data: Dict[str, Any], frameworks: List[str], report_title: str, include_evidence: bool) -> str
    """Pure function. Constructs the LLM prompt from input data. No side effects."""
    # Returns a structured prompt string

async def generate_report_content(input_data: Dict[str, Any], frameworks: List[str], report_title: str, include_evidence: bool, model: str = "llama3.2:3b") -> str
    """Calls OllamaService.generate() with the constructed prompt. Returns markdown string."""
    # Uses build_report_prompt() internally
    # Graceful fallback if Ollama unavailable: returns a structured markdown from input_data directly
```

**Test cases**:
| Test | Input | Expected |
|------|-------|----------|
| `test_build_report_prompt_basic` | `{"status": "pass"}`, frameworks=["SOC2"], title="Test" | Prompt contains "SOC2", "Test", "status" |
| `test_build_report_prompt_empty_data` | `{}`, frameworks=[], title="" | Valid prompt string (no crash) |
| `test_build_report_prompt_evidence_flag` | include_evidence=True vs False | Prompt includes/excludes evidence instruction |
| `test_generate_content_ollama_down` | Mock Ollama failure | Returns fallback markdown, no exception |

**Dependencies**: None (first checkpoint)

---

### Checkpoint 2: Format Generators (Pure Functions)

**Component**: Backend service — format conversion  
**Files**:
- `[MODIFY] backend/app/services/report_generator.py`

**Functions to implement**:
```python
def generate_markdown(content: str, title: str) -> bytes
    """Pure function. Wraps content with title header. Returns UTF-8 bytes."""

def generate_pdf(content: str, title: str) -> bytes
    """Pure function. Converts markdown content to styled PDF using reportlab. Returns PDF bytes."""

def generate_docx(content: str, title: str) -> bytes
    """Pure function. Converts markdown content to styled DOCX using python-docx. Returns DOCX bytes."""

def generate_xlsx(content: str, title: str, input_data: Dict[str, Any]) -> bytes
    """Pure function. Creates workbook with Summary + Data sheets. Returns XLSX bytes."""
```

**Test cases**:
| Test | Input | Expected |
|------|-------|----------|
| `test_generate_markdown` | content="# Hello", title="Report" | bytes starts with `# Report` |
| `test_generate_pdf_valid` | content="Test content", title="Test" | bytes starts with `%PDF` |
| `test_generate_pdf_empty` | content="", title="Empty" | Valid PDF (no crash) |
| `test_generate_docx_valid` | content="Test", title="Test" | bytes is valid ZIP (DOCX) |
| `test_generate_docx_has_title` | content="Body", title="My Title" | Extracted text contains "My Title" |
| `test_generate_xlsx_two_sheets` | content="Summary", data={"a":1} | Workbook has 2 sheets |
| `test_generate_xlsx_data_sheet` | data={"col":"val"} | Data sheet row contains "val" |

**Dependencies**: Checkpoint 1 (content to convert), `reportlab` in requirements.txt

---

### Checkpoint 3: Orchestrator + API Endpoint

**Component**: Backend API route and orchestrator function  
**Files**:
- `[MODIFY] backend/app/services/report_generator.py` (add orchestrator)
- `[NEW] backend/app/api/report.py` (API route)
- `[MODIFY] backend/app/main.py` (register router)
- `[MODIFY] backend/requirements.txt` (add `reportlab>=4.0.0`)

**Functions to implement**:
```python
# report_generator.py
async def generate_report(input_data: Dict[str, Any], report_format: str, frameworks: List[str], report_title: str, include_evidence: bool, model: str = "llama3.2:3b") -> Dict[str, Any]
    """Orchestrator. Calls generate_report_content, then the appropriate format generator.
    Returns {"file_content": base64_str, "filename": str, "mime_type": str, "success": True}"""

# report.py
class ReportGenerateRequest(BaseModel): ...
class ReportGenerateResponse(BaseModel): ...
async def generate_report_endpoint(request: ReportGenerateRequest) -> ReportGenerateResponse
```

**Test cases**:
| Test | Input | Expected |
|------|-------|----------|
| `test_orchestrator_pdf` | format="pdf", mock content | Returns dict with `file_content`, `mime_type`="application/pdf" |
| `test_orchestrator_docx` | format="docx" | `mime_type`="application/vnd.openxmlformats..." |
| `test_orchestrator_xlsx` | format="xlsx" | `mime_type`="application/vnd.openxmlformats..." |
| `test_orchestrator_md` | format="md" | `mime_type`="text/markdown" |
| `test_orchestrator_invalid_format` | format="pptx" | Falls back to markdown |
| `test_api_endpoint_200` | Valid POST body | HTTP 200, valid response |
| `test_api_endpoint_422` | Missing required fields | HTTP 422 |

**Dependencies**: Checkpoints 1, 2

---

### Checkpoint 4: Backend Executor Integration

**Component**: Backend executor — wire compliance node to report generator  
**Files**:
- `[MODIFY] backend/app/services/executor.py` (`_execute_compliance_dashboard_node`)

**Changes**:
- Import and call `generate_report()` from `report_generator.py`
- Return file data alongside existing report metadata
- Handle errors gracefully (if report generation fails, still return metadata)

**Test cases**:
| Test | Input | Expected |
|------|-------|----------|
| `test_executor_compliance_node_returns_file` | Node with reportFormat="pdf" | Output contains `file_content` |
| `test_executor_compliance_node_fallback` | Ollama down | Output still contains report metadata (no crash) |

**Dependencies**: Checkpoint 3

---

### Checkpoint 5: Frontend Integration

**Component**: Frontend — API client + workflowStore  
**Files**:
- `[MODIFY] frontend/src/services/api.ts` (add `generateReport()`)
- `[MODIFY] frontend/src/store/workflowStore.ts` (compliance node block)
- `[MODIFY] frontend/src/components/panels/configs/genericFieldDefinitions.ts` (add `reportPrompt` field)

**Changes**:
- `api.ts`: Add `generateReport(request)` method that calls `POST /api/v1/outputs/report/generate`
- `workflowStore.ts`: Update `complianceDashboardNode` block (line ~1142) to call `api.generateReport()`, decode base64, and trigger browser download (reuse spreadsheet download pattern)
- `genericFieldDefinitions.ts`: Add `reportPrompt` textarea field to `complianceDashboardNode`

**Test cases**:
| Test | Verification | Expected |
|------|-------------|----------|
| Manual: Run workflow with PDF format | File downloads | Valid PDF opens |
| Manual: Run workflow with DOCX format | File downloads | Valid DOCX opens |
| Manual: Run workflow with custom reportPrompt | AI output reflects prompt | Report content addresses the prompt |
| Manual: Run workflow with Ollama down | No crash | Error logged, workflow completes |

**Dependencies**: Checkpoint 4

---

### Checkpoint 6: End-to-End Verification

**Component**: Full stack validation  
**Files**: None (testing only)

**Steps**:
1. Rebuild Docker: `docker-compose build backend`
2. Start stack: `docker-compose up -d`
3. Hit endpoint directly: `curl -X POST http://localhost:8000/api/v1/outputs/report/generate -H 'Content-Type: application/json' -d '{"input_data":{"test":"data"},"format":"pdf","frameworks":["SOC2"],"title":"Test Report"}'`
4. Verify response has `file_content` (base64), decode and open PDF
5. Run frontend workflow end-to-end

**Dependencies**: Checkpoints 1–5

## Verification Plan

1. **Unit tests**: `python -m pytest backend/app/tests/test_report_generator.py -v`
2. **API test**: `curl` the endpoint for each format (pdf, docx, xlsx, md)
3. **Docker rebuild**: `docker-compose build backend && docker-compose up -d`
4. **Frontend E2E**: Create Trigger → Compliance Dashboard workflow, run it, verify download
5. **Error case**: Stop Ollama container, re-run — verify graceful fallback
