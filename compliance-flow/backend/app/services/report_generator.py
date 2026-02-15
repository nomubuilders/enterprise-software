"""
Report Generator Service for ComplianceFlow.

Generates compliance reports with AI-interpreted content in multiple formats
(Markdown, PDF, DOCX, XLSX). Uses OllamaService for content generation
with graceful fallback when Ollama is unavailable.

Architecture:
- Pure functions for prompt building and format conversion (no side effects)
- Async orchestrator for AI content generation (single side effect: Ollama call)
- All functions are fully typed with docstrings
"""

import json
import logging
from typing import Any, Dict, List

from app.services.ollama import OllamaService, CompletionRequest

logger = logging.getLogger(__name__)


# ============================================================================
# Constants
# ============================================================================

MAX_INPUT_CHARS: int = 12000  # Truncate input data to fit context window
DEFAULT_MODEL: str = "llama3.2:3b"


# ============================================================================
# Pure Functions — Content Generation
# ============================================================================


def _serialize_input_data(input_data: Dict[str, Any], max_chars: int = MAX_INPUT_CHARS) -> str:
    """Serialize input data to a truncated string representation.

    Pure function. Converts dict to formatted JSON, truncating if needed.

    Args:
        input_data: The upstream workflow data to serialize.
        max_chars: Maximum characters to include.

    Returns:
        A string representation of the data, truncated with notice if needed.
    """
    try:
        raw: str = json.dumps(input_data, indent=2, default=str)
    except (TypeError, ValueError):
        raw = str(input_data)

    if len(raw) > max_chars:
        return raw[:max_chars] + "\n\n... [Data truncated for context window]"
    return raw


def _build_fallback_markdown(
    input_data: Dict[str, Any],
    frameworks: List[str],
    report_title: str,
) -> str:
    """Build a structured markdown report directly from input data (no AI).

    Pure function. Used as fallback when Ollama is unavailable.

    Args:
        input_data: The upstream workflow data.
        frameworks: List of compliance framework names.
        report_title: Title for the report.

    Returns:
        A markdown string with structured sections.
    """
    title: str = report_title or "Compliance Report"
    fw_list: str = ", ".join(frameworks) if frameworks else "General"

    sections: List[str] = [
        f"# {title}",
        "",
        f"**Frameworks**: {fw_list}",
        "",
        "## Executive Summary",
        "",
        "This report was generated without AI interpretation (Ollama unavailable).",
        "The raw data from the compliance workflow is presented below.",
        "",
        "## Data Summary",
        "",
    ]

    if input_data:
        for key, value in input_data.items():
            # Skip internal keys
            if key.startswith("_"):
                continue
            display_value: str = str(value)[:500]
            sections.append(f"### {key}")
            sections.append("")
            sections.append(f"```\n{display_value}\n```")
            sections.append("")
    else:
        sections.append("No input data was provided to this compliance node.")
        sections.append("")

    return "\n".join(sections)


def build_report_prompt(
    input_data: Dict[str, Any],
    frameworks: List[str],
    report_title: str,
    include_evidence: bool,
) -> str:
    """Construct the LLM prompt from input data.

    Pure function. No side effects.

    Args:
        input_data: The upstream workflow data to interpret.
        frameworks: List of compliance framework names (e.g., ["SOC2", "GDPR"]).
        report_title: Title for the compliance report.
        include_evidence: Whether to include evidence references in the report.

    Returns:
        A structured prompt string for the LLM.
    """
    title: str = report_title or "Compliance Report"
    fw_list: str = ", ".join(frameworks) if frameworks else "General compliance"
    serialized_data: str = _serialize_input_data(input_data)

    prompt_parts: List[str] = [
        f"You are a compliance analyst. Generate a professional compliance report titled '{title}'.",
        f"",
        f"Frameworks to assess against: {fw_list}",
        f"",
        f"Analyze the following data from a compliance workflow and produce a well-structured "
        f"Markdown report with these sections:",
        f"1. Executive Summary — key findings in 2-3 paragraphs",
        f"2. Compliance Assessment — detailed analysis per framework",
        f"3. Findings — specific compliance gaps or confirmations",
        f"4. Recommendations — actionable items to improve compliance posture",
    ]

    if include_evidence:
        prompt_parts.append(
            "5. Evidence References — include specific data points from the input as evidence"
        )

    prompt_parts.extend([
        "",
        "Use proper Markdown formatting with headers, bullet points, and tables where appropriate.",
        "",
        "## Input Data",
        "",
        serialized_data,
    ])

    return "\n".join(prompt_parts)


# ============================================================================
# Async Functions — AI Content Generation
# ============================================================================


async def generate_report_content(
    input_data: Dict[str, Any],
    frameworks: List[str],
    report_title: str,
    include_evidence: bool,
    model: str = DEFAULT_MODEL,
) -> str:
    """Generate AI-interpreted compliance report content as Markdown.

    Calls OllamaService.generate() with the constructed prompt.
    Gracefully falls back to structured markdown if Ollama is unavailable.

    Args:
        input_data: The upstream workflow data to interpret.
        frameworks: List of compliance framework names.
        report_title: Title for the compliance report.
        include_evidence: Whether to include evidence references.
        model: Ollama model name to use.

    Returns:
        A Markdown string containing the report content.
    """
    prompt: str = build_report_prompt(
        input_data=input_data,
        frameworks=frameworks,
        report_title=report_title,
        include_evidence=include_evidence,
    )

    try:
        ollama = OllamaService()
        request = CompletionRequest(
            model=model,
            prompt=prompt,
            temperature=0.3,  # Low temperature for factual reporting
        )
        response = await ollama.generate(request)

        content: str = response.response.strip()
        if content:
            return content

        # Empty response — fall back
        logger.warning("Ollama returned empty response, using fallback")

    except Exception as e:
        logger.warning(f"Ollama unavailable ({type(e).__name__}: {e}), using fallback")

    # Fallback: generate structured markdown without AI
    return _build_fallback_markdown(
        input_data=input_data,
        frameworks=frameworks,
        report_title=report_title,
    )


# ============================================================================
# Orchestrator — Report Generation Pipeline
# ============================================================================

# Format → (generator, mime_type, extension)
FORMAT_REGISTRY: Dict[str, tuple] = {
    "md": ("text/markdown", ".md"),
    "pdf": ("application/pdf", ".pdf"),
    "docx": ("application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx"),
    "xlsx": ("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".xlsx"),
}

SUPPORTED_FORMATS: List[str] = list(FORMAT_REGISTRY.keys())


def _format_to_generator(report_format: str) -> str:
    """Normalize format string and validate.

    Pure function.

    Args:
        report_format: Requested format string (case-insensitive).

    Returns:
        Normalized format key from FORMAT_REGISTRY, defaulting to 'md'.
    """
    normalized: str = report_format.lower().strip()
    if normalized not in FORMAT_REGISTRY:
        logger.warning(f"Unsupported format '{report_format}', falling back to markdown")
        return "md"
    return normalized


async def generate_report(
    input_data: Dict[str, Any],
    report_format: str,
    frameworks: List[str],
    report_title: str,
    include_evidence: bool,
    model: str = DEFAULT_MODEL,
    report_prompt: str = "",
) -> Dict[str, Any]:
    """Orchestrate full report generation pipeline.

    Calls generate_report_content for AI content, then the appropriate format generator.
    Returns a dict with base64-encoded file content, filename, and MIME type.

    Args:
        input_data: The upstream workflow data to interpret.
        report_format: Desired output format (md, pdf, docx, xlsx).
        frameworks: List of compliance framework names.
        report_title: Title for the compliance report.
        include_evidence: Whether to include evidence references.
        model: Ollama model name to use.
        report_prompt: Optional user-provided custom prompt to guide AI interpretation.

    Returns:
        Dict with keys: file_content (base64), filename, mime_type, format, success.
    """
    import base64

    fmt: str = _format_to_generator(report_format)
    mime_type, extension = FORMAT_REGISTRY[fmt]
    title: str = report_title or "Compliance Report"

    # If user provided a custom prompt, prepend it to input_data
    effective_data: Dict[str, Any] = dict(input_data)
    if report_prompt:
        effective_data["_user_report_prompt"] = report_prompt

    # Step 1: Generate AI content
    content: str = await generate_report_content(
        input_data=effective_data,
        frameworks=frameworks,
        report_title=title,
        include_evidence=include_evidence,
        model=model,
    )

    # Step 2: Convert to requested format
    if fmt == "md":
        file_bytes: bytes = generate_markdown(content=content, title=title)
    elif fmt == "pdf":
        file_bytes = generate_pdf(content=content, title=title)
    elif fmt == "docx":
        file_bytes = generate_docx(content=content, title=title)
    elif fmt == "xlsx":
        file_bytes = generate_xlsx(content=content, title=title, input_data=input_data)
    else:
        file_bytes = generate_markdown(content=content, title=title)

    # Step 3: Encode and return
    safe_title: str = title.replace(" ", "_").replace("/", "-")[:50]
    filename: str = f"{safe_title}{extension}"

    return {
        "file_content": base64.b64encode(file_bytes).decode("utf-8"),
        "filename": filename,
        "mime_type": mime_type,
        "format": fmt,
        "success": True,
    }


# ============================================================================
# Pure Functions — Format Generators
# ============================================================================


def generate_markdown(content: str, title: str) -> bytes:
    """Wrap content with a title header and return as UTF-8 bytes.

    Pure function. No side effects.

    Args:
        content: Markdown content body.
        title: Report title (rendered as H1 header).

    Returns:
        UTF-8 encoded bytes of the complete markdown document.
    """
    title_str: str = title or "Compliance Report"
    full_doc: str = f"# {title_str}\n\n{content}"
    return full_doc.encode("utf-8")


def generate_pdf(content: str, title: str) -> bytes:
    """Convert markdown content to a styled PDF using reportlab.

    Pure function. No side effects.

    Args:
        content: Markdown content body.
        title: Report title.

    Returns:
        PDF file as bytes.
    """
    import io as _io
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer

    buffer = _io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=25 * mm,
        rightMargin=25 * mm,
        topMargin=25 * mm,
        bottomMargin=25 * mm,
    )

    styles = getSampleStyleSheet()
    # Custom styles for report sections
    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Title"],
        fontSize=20,
        spaceAfter=12,
    )
    heading_style = ParagraphStyle(
        "ReportHeading",
        parent=styles["Heading2"],
        fontSize=14,
        spaceBefore=12,
        spaceAfter=6,
    )
    body_style = styles["BodyText"]

    story: list = []
    title_str: str = title or "Compliance Report"
    story.append(Paragraph(title_str, title_style))
    story.append(Spacer(1, 6 * mm))

    # Parse markdown lines into styled paragraphs
    for line in content.split("\n"):
        stripped: str = line.strip()
        if not stripped:
            story.append(Spacer(1, 3 * mm))
            continue

        # Heading detection
        if stripped.startswith("## "):
            story.append(Paragraph(stripped[3:], heading_style))
        elif stripped.startswith("# "):
            story.append(Paragraph(stripped[2:], heading_style))
        elif stripped.startswith("- ") or stripped.startswith("* "):
            story.append(Paragraph(f"• {stripped[2:]}", body_style))
        else:
            # Escape XML-unsafe characters for reportlab
            safe_text: str = (
                stripped.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
            )
            story.append(Paragraph(safe_text, body_style))

    doc.build(story)
    return buffer.getvalue()


def generate_docx(content: str, title: str) -> bytes:
    """Convert markdown content to a styled DOCX using python-docx.

    Pure function. No side effects.

    Args:
        content: Markdown content body.
        title: Report title.

    Returns:
        DOCX file as bytes.
    """
    import io as _io
    from docx import Document
    from docx.shared import Pt

    doc = Document()
    title_str: str = title or "Compliance Report"
    doc.add_heading(title_str, level=0)

    # Parse markdown lines into styled document elements
    for line in content.split("\n"):
        stripped: str = line.strip()
        if not stripped:
            continue

        if stripped.startswith("### "):
            doc.add_heading(stripped[4:], level=3)
        elif stripped.startswith("## "):
            doc.add_heading(stripped[3:], level=2)
        elif stripped.startswith("# "):
            doc.add_heading(stripped[2:], level=1)
        elif stripped.startswith("- ") or stripped.startswith("* "):
            doc.add_paragraph(stripped[2:], style="List Bullet")
        elif stripped.startswith("```"):
            continue  # Skip code fence markers
        else:
            doc.add_paragraph(stripped)

    buffer = _io.BytesIO()
    doc.save(buffer)
    return buffer.getvalue()


def generate_xlsx(content: str, title: str, input_data: Dict[str, Any]) -> bytes:
    """Create a workbook with Summary and Data sheets.

    Pure function. No side effects.

    Args:
        content: AI-generated summary text for the Summary sheet.
        title: Report title.
        input_data: Raw upstream data for the Data sheet.

    Returns:
        XLSX file as bytes.
    """
    import io as _io
    from openpyxl import Workbook
    from openpyxl.styles import Font, Alignment

    wb = Workbook()

    # --- Summary sheet ---
    ws_summary = wb.active
    ws_summary.title = "Summary"

    title_str: str = title or "Compliance Report"
    ws_summary["A1"] = title_str
    ws_summary["A1"].font = Font(size=16, bold=True)

    # Write content line by line starting from row 3
    for row_idx, line in enumerate(content.split("\n"), start=3):
        ws_summary.cell(row=row_idx, column=1, value=line)
    ws_summary.column_dimensions["A"].width = 80

    # --- Data sheet ---
    ws_data = wb.create_sheet("Data")
    ws_data["A1"] = "Key"
    ws_data["B1"] = "Value"
    ws_data["A1"].font = Font(bold=True)
    ws_data["B1"].font = Font(bold=True)

    row_idx = 2
    for key, value in input_data.items():
        ws_data.cell(row=row_idx, column=1, value=str(key))
        ws_data.cell(row=row_idx, column=2, value=str(value)[:1000])
        row_idx += 1

    ws_data.column_dimensions["A"].width = 30
    ws_data.column_dimensions["B"].width = 60

    buffer = _io.BytesIO()
    wb.save(buffer)
    return buffer.getvalue()
