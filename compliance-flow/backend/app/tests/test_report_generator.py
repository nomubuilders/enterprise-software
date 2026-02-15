"""
Tests for report_generator.py — Checkpoint 1: Content Generation.

TDD: These tests are written BEFORE the implementation.
Tests cover: build_report_prompt (pure function) and generate_report_content (async with fallback).
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from typing import Dict, Any


# ---------------------------------------------------------------------------
# Tests for build_report_prompt (pure function)
# ---------------------------------------------------------------------------


class TestBuildReportPrompt:
    """Tests for the pure function that constructs LLM prompts."""

    def test_basic(self) -> None:
        """Prompt contains framework name, title, and input data keys."""
        from app.services.report_generator import build_report_prompt

        result: str = build_report_prompt(
            input_data={"status": "pass", "score": 95},
            frameworks=["SOC2"],
            report_title="Test Report",
            include_evidence=True,
        )
        assert isinstance(result, str)
        assert "SOC2" in result
        assert "Test Report" in result
        assert "status" in result

    def test_empty_data(self) -> None:
        """Empty inputs produce a valid prompt string without crashing."""
        from app.services.report_generator import build_report_prompt

        result: str = build_report_prompt(
            input_data={},
            frameworks=[],
            report_title="",
            include_evidence=False,
        )
        assert isinstance(result, str)
        assert len(result) > 0

    def test_evidence_flag_included(self) -> None:
        """When include_evidence=True, prompt contains evidence instruction."""
        from app.services.report_generator import build_report_prompt

        result: str = build_report_prompt(
            input_data={"finding": "gap"},
            frameworks=["GDPR"],
            report_title="Evidence Test",
            include_evidence=True,
        )
        assert "evidence" in result.lower()

    def test_evidence_flag_excluded(self) -> None:
        """When include_evidence=False, prompt does NOT contain evidence instruction."""
        from app.services.report_generator import build_report_prompt

        result: str = build_report_prompt(
            input_data={"finding": "gap"},
            frameworks=["GDPR"],
            report_title="No Evidence Test",
            include_evidence=False,
        )
        # Check that evidence-include instructions are absent
        lines = result.split("\n")
        instruction_lines = [
            l for l in lines
            if "include" in l.lower() and "evidence" in l.lower()
        ]
        assert len(instruction_lines) == 0

    def test_multiple_frameworks(self) -> None:
        """Multiple frameworks all appear in the prompt."""
        from app.services.report_generator import build_report_prompt

        result: str = build_report_prompt(
            input_data={"data": "test"},
            frameworks=["SOC2", "GDPR", "HIPAA"],
            report_title="Multi-Framework",
            include_evidence=True,
        )
        assert "SOC2" in result
        assert "GDPR" in result
        assert "HIPAA" in result

    def test_large_input_truncated(self) -> None:
        """Very large input data doesn't produce an excessively long prompt."""
        from app.services.report_generator import build_report_prompt

        large_data: Dict[str, Any] = {f"key_{i}": "x" * 1000 for i in range(100)}
        result: str = build_report_prompt(
            input_data=large_data,
            frameworks=["SOC2"],
            report_title="Large Input",
            include_evidence=True,
        )
        assert len(result) < 20000


# ---------------------------------------------------------------------------
# Tests for generate_report_content (async, with Ollama dependency)
# ---------------------------------------------------------------------------


class TestGenerateReportContent:
    """Tests for the async function that calls Ollama and returns markdown."""

    @pytest.mark.asyncio
    async def test_ollama_down_returns_fallback(self) -> None:
        """When Ollama is unavailable, returns structured fallback markdown instead of raising."""
        from app.services.report_generator import generate_report_content

        with patch("app.services.report_generator.OllamaService") as MockOllama:
            instance = MockOllama.return_value
            instance.generate = AsyncMock(
                side_effect=ConnectionError("Ollama not running")
            )

            result: str = await generate_report_content(
                input_data={"status": "pass"},
                frameworks=["SOC2"],
                report_title="Fallback Test",
                include_evidence=True,
                model="llama3.2:3b",
            )

        assert isinstance(result, str)
        assert len(result) > 0
        assert "Fallback Test" in result or "SOC2" in result

    @pytest.mark.asyncio
    async def test_ollama_success_returns_response(self) -> None:
        """When Ollama responds, returns the LLM-generated markdown."""
        from app.services.report_generator import generate_report_content

        mock_response = MagicMock()
        mock_response.response = "# Compliance Report\n\nAll checks passed."

        with patch("app.services.report_generator.OllamaService") as MockOllama:
            instance = MockOllama.return_value
            instance.generate = AsyncMock(return_value=mock_response)

            result: str = await generate_report_content(
                input_data={"status": "pass"},
                frameworks=["SOC2"],
                report_title="AI Report",
                include_evidence=True,
                model="llama3.2:3b",
            )

        assert result == "# Compliance Report\n\nAll checks passed."

    @pytest.mark.asyncio
    async def test_ollama_empty_response_returns_fallback(self) -> None:
        """When Ollama returns an empty response, falls back to structured markdown."""
        from app.services.report_generator import generate_report_content

        mock_response = MagicMock()
        mock_response.response = ""

        with patch("app.services.report_generator.OllamaService") as MockOllama:
            instance = MockOllama.return_value
            instance.generate = AsyncMock(return_value=mock_response)

            result: str = await generate_report_content(
                input_data={"score": 85},
                frameworks=["GDPR"],
                report_title="Empty Response Test",
                include_evidence=False,
                model="llama3.2:3b",
            )

        assert isinstance(result, str)
        assert len(result) > 0
