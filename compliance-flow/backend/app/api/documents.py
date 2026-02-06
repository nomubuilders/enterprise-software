"""Document processing API routes."""

from fastapi import APIRouter, UploadFile, File, HTTPException

from app.services.document_service import parse_document

router = APIRouter(prefix="/documents")

MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB


@router.post("/parse")
async def parse_document_endpoint(file: UploadFile = File(...)):
    """Parse a document (PDF, DOCX, TXT) and extract text."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    content = await file.read()

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB"
        )

    result = parse_document(content, file.filename)

    if not result["success"]:
        raise HTTPException(status_code=422, detail=result.get("error", "Failed to parse document"))

    return result
