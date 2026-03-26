"""Spreadsheet parsing, export, and transformation endpoints."""

import os

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Any

from app.services.spreadsheet_service import SpreadsheetService

router = APIRouter(prefix="/spreadsheet")

spreadsheet_service = SpreadsheetService()

_ALLOWED_WORKSPACE = os.environ.get('COMPLIANCE_WORKSPACE_DIR', '/tmp/compliance-data')


def _validate_file_path(path: str) -> str:
    """Ensure path is within the allowed workspace directory."""
    resolved = os.path.realpath(path)
    allowed = os.path.realpath(_ALLOWED_WORKSPACE)
    if not resolved.startswith(allowed + os.sep) and resolved != allowed:
        raise ValueError(f"File path must be within {_ALLOWED_WORKSPACE}")
    return resolved


class ParseRequest(BaseModel):
    file_path: str
    sheet_name: Optional[str] = None


class ParseResponse(BaseModel):
    success: bool
    columns: list[str] = []
    preview_rows: list[dict[str, Any]] = []
    total_rows: int = 0
    error: Optional[str] = None


class ExportRequest(BaseModel):
    data: list[dict[str, Any]]
    format: str  # csv, xlsx
    output_path: str


class ExportResponse(BaseModel):
    success: bool
    output_path: Optional[str] = None
    row_count: int = 0
    error: Optional[str] = None


class TransformOperation(BaseModel):
    type: str  # filter, sort, aggregate
    column: str
    value: Optional[Any] = None
    direction: Optional[str] = "asc"


class TransformRequest(BaseModel):
    data: list[dict[str, Any]]
    operations: list[TransformOperation]


class TransformResponse(BaseModel):
    success: bool
    data: list[dict[str, Any]] = []
    row_count: int = 0
    error: Optional[str] = None


@router.post("/parse", response_model=ParseResponse)
async def parse_spreadsheet(request: ParseRequest):
    """Parse a spreadsheet file and return columns with preview rows."""
    try:
        _validate_file_path(request.file_path)
        result = await spreadsheet_service.parse_file(
            file_path=request.file_path,
            sheet_name=request.sheet_name,
        )

        return ParseResponse(
            success=True,
            columns=result.get("columns", []),
            preview_rows=result.get("preview_rows", []),
            total_rows=result.get("total_rows", 0),
        )
    except FileNotFoundError as e:
        return ParseResponse(
            success=False,
            error=f"File not found: {str(e)}",
        )
    except Exception as e:
        return ParseResponse(
            success=False,
            error=str(e),
        )


@router.post("/export", response_model=ExportResponse)
async def export_spreadsheet(request: ExportRequest):
    """Export data to a spreadsheet format."""
    try:
        _validate_file_path(request.output_path)
        output_path = await spreadsheet_service.export_data(
            data=request.data,
            format=request.format,
            output_path=request.output_path,
        )

        return ExportResponse(
            success=True,
            output_path=output_path,
            row_count=len(request.data),
        )
    except ValueError as e:
        return ExportResponse(
            success=False,
            error=f"Invalid format: {str(e)}",
        )
    except Exception as e:
        return ExportResponse(
            success=False,
            error=str(e),
        )


@router.post("/transform", response_model=TransformResponse)
async def transform_spreadsheet(request: TransformRequest):
    """Apply transformations to spreadsheet data."""
    try:
        operations = [
            {
                "type": op.type,
                "column": op.column,
                "value": op.value,
                "direction": op.direction,
            }
            for op in request.operations
        ]

        result = await spreadsheet_service.transform(
            data=request.data,
            operations=operations,
        )

        return TransformResponse(
            success=True,
            data=result,
            row_count=len(result),
        )
    except Exception as e:
        return TransformResponse(
            success=False,
            error=str(e),
        )
