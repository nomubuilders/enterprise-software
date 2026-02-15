"""
Report Generation API Endpoint.

Provides the POST /api/v1/outputs/report/generate endpoint for generating
compliance reports in multiple formats (MD, PDF, DOCX, XLSX).
"""

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.report_generator import generate_report, SUPPORTED_FORMATS

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/outputs", tags=["outputs"])


# ============================================================================
# Request / Response Models
# ============================================================================


class ReportGenerateRequest(BaseModel):
    """Request body for report generation."""

    input_data: Dict[str, Any] = Field(
        default_factory=dict,
        description="Upstream workflow data to include in the report",
    )
    format: str = Field(
        default="pdf",
        description=f"Output format: {', '.join(SUPPORTED_FORMATS)}",
    )
    frameworks: List[str] = Field(
        default_factory=list,
        description="Compliance frameworks to assess (e.g., SOC2, GDPR)",
    )
    title: str = Field(
        default="Compliance Report",
        description="Report title",
    )
    include_evidence: bool = Field(
        default=True,
        description="Include evidence references in the report",
    )
    model: str = Field(
        default="llama3.2:3b",
        description="Ollama model to use for content generation",
    )
    report_prompt: Optional[str] = Field(
        default="",
        description="Optional custom prompt to guide AI interpretation",
    )


class ReportGenerateResponse(BaseModel):
    """Response from report generation."""

    success: bool
    file_content: str = Field(description="Base64-encoded file content")
    filename: str
    mime_type: str
    format: str
    error: Optional[str] = None


# ============================================================================
# Endpoint
# ============================================================================


@router.post("/report/generate", response_model=ReportGenerateResponse)
async def generate_report_endpoint(
    request: ReportGenerateRequest,
) -> ReportGenerateResponse:
    """Generate a compliance report in the requested format.

    Orchestrates AI content generation and format conversion.
    Returns base64-encoded file content for client-side download.
    """
    try:
        result: Dict[str, Any] = await generate_report(
            input_data=request.input_data,
            report_format=request.format,
            frameworks=request.frameworks,
            report_title=request.title,
            include_evidence=request.include_evidence,
            model=request.model,
            report_prompt=request.report_prompt or "",
        )
        return ReportGenerateResponse(
            success=True,
            file_content=result["file_content"],
            filename=result["filename"],
            mime_type=result["mime_type"],
            format=result["format"],
        )
    except Exception as e:
        logger.error(f"Report generation failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Report generation failed: {str(e)}",
        )
