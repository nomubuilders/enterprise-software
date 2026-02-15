"""
Tests for report_generator.py — Checkpoint 3: Orchestrator.
Tests for report.py — Checkpoint 3: API endpoint.

TDD: Tests for the orchestrator and API endpoint.
"""

import base64
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from typing import Dict, Any


# ---------------------------------------------------------------------------
# Tests for generate_report (orchestrator)
# ---------------------------------------------------------------------------


class TestGenerateReport:
    """Tests for the async orchestrator function."""

    @pytest.mark.asyncio
    async def test_orchestrator_pdf(self) -> None:
        """PDF format returns dict with correct mime_type and valid base64."""
        from app.services.report_generator import generate_report

        with patch("app.services.report_generator.OllamaService") as MockOllama:
            instance = MockOllama.return_value
            mock_resp = MagicMock()
            mock_resp.response = "# Test Report\n\nAll checks passed."
            instance.generate = AsyncMock(return_value=mock_resp)

            result: Dict[str, Any] = await generate_report(
                input_data={"status": "pass"},
                report_format="pdf",
                frameworks=["SOC2"],
                report_title="Test",
                include_evidence=True,
            )

        assert result["success"] is True
        assert result["mime_type"] == "application/pdf"
        assert result["format"] == "pdf"
        assert result["filename"].endswith(".pdf")
        # Verify base64 decodes to valid PDF
        decoded: bytes = base64.b64decode(result["file_content"])
        assert decoded[:5] == b"%PDF-"

    @pytest.mark.asyncio
    async def test_orchestrator_docx(self) -> None:
        """DOCX format returns correct mime_type."""
        from app.services.report_generator import generate_report

        with patch("app.services.report_generator.OllamaService") as MockOllama:
            instance = MockOllama.return_value
            mock_resp = MagicMock()
            mock_resp.response = "Report content."
            instance.generate = AsyncMock(return_value=mock_resp)

            result: Dict[str, Any] = await generate_report(
                input_data={},
                report_format="docx",
                frameworks=[],
                report_title="DOCX Test",
                include_evidence=False,
            )

        assert result["mime_type"] == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        assert result["format"] == "docx"

    @pytest.mark.asyncio
    async def test_orchestrator_xlsx(self) -> None:
        """XLSX format returns correct mime_type."""
        from app.services.report_generator import generate_report

        with patch("app.services.report_generator.OllamaService") as MockOllama:
            instance = MockOllama.return_value
            mock_resp = MagicMock()
            mock_resp.response = "Summary content."
            instance.generate = AsyncMock(return_value=mock_resp)

            result = await generate_report(
                input_data={"key": "val"},
                report_format="xlsx",
                frameworks=["GDPR"],
                report_title="XLSX Test",
                include_evidence=True,
            )

        assert result["mime_type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        assert result["format"] == "xlsx"

    @pytest.mark.asyncio
    async def test_orchestrator_md(self) -> None:
        """Markdown format returns text/markdown mime_type."""
        from app.services.report_generator import generate_report

        with patch("app.services.report_generator.OllamaService") as MockOllama:
            instance = MockOllama.return_value
            mock_resp = MagicMock()
            mock_resp.response = "# Content"
            instance.generate = AsyncMock(return_value=mock_resp)

            result = await generate_report(
                input_data={},
                report_format="md",
                frameworks=[],
                report_title="MD Test",
                include_evidence=False,
            )

        assert result["mime_type"] == "text/markdown"
        assert result["format"] == "md"

    @pytest.mark.asyncio
    async def test_orchestrator_invalid_format(self) -> None:
        """Invalid format falls back to markdown instead of crashing."""
        from app.services.report_generator import generate_report

        with patch("app.services.report_generator.OllamaService") as MockOllama:
            instance = MockOllama.return_value
            mock_resp = MagicMock()
            mock_resp.response = "Fallback content."
            instance.generate = AsyncMock(return_value=mock_resp)

            result = await generate_report(
                input_data={},
                report_format="pptx",
                frameworks=[],
                report_title="Invalid Format",
                include_evidence=False,
            )

        assert result["format"] == "md"
        assert result["mime_type"] == "text/markdown"
        assert result["success"] is True


# ---------------------------------------------------------------------------
# Tests for API endpoint
# ---------------------------------------------------------------------------


class TestReportEndpoint:
    """Tests for the FastAPI report generation endpoint."""

    @pytest.mark.asyncio
    async def test_endpoint_200(self) -> None:
        """Valid POST returns 200 with expected response fields."""
        from httpx import AsyncClient, ASGITransport
        from app.main import app

        with patch("app.services.report_generator.OllamaService") as MockOllama:
            instance = MockOllama.return_value
            mock_resp = MagicMock()
            mock_resp.response = "# Report\n\nGenerated content."
            instance.generate = AsyncMock(return_value=mock_resp)

            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.post(
                    "/api/v1/outputs/report/generate",
                    json={
                        "input_data": {"test": "data"},
                        "format": "md",
                        "frameworks": ["SOC2"],
                        "title": "Test Report",
                    },
                )

        assert response.status_code == 200
        body = response.json()
        assert body["success"] is True
        assert "file_content" in body
        assert body["format"] == "md"

    @pytest.mark.asyncio
    async def test_endpoint_default_format(self) -> None:
        """Request without format defaults to PDF."""
        from httpx import AsyncClient, ASGITransport
        from app.main import app

        with patch("app.services.report_generator.OllamaService") as MockOllama:
            instance = MockOllama.return_value
            mock_resp = MagicMock()
            mock_resp.response = "Report content."
            instance.generate = AsyncMock(return_value=mock_resp)

            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.post(
                    "/api/v1/outputs/report/generate",
                    json={},
                )

        assert response.status_code == 200
        body = response.json()
        assert body["format"] == "pdf"
