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


@router.post("/embed")
async def embed_text(request: dict):
    """Generate embeddings for text using Ollama."""
    import httpx

    text = request.get("text", "")
    model = request.get("model", "nomic-embed-text")

    if not text:
        raise HTTPException(status_code=400, detail="Text is required")

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "http://localhost:11434/api/embeddings",
                json={"model": model, "prompt": text}
            )
            response.raise_for_status()
            data = response.json()
            return {
                "success": True,
                "embedding": data.get("embedding", []),
                "model": model
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Embedding failed: {str(e)}")


@router.post("/evaluate")
async def evaluate_summary(request: dict):
    """Evaluate a generated summary against a reference summary."""
    from app.services.evaluation_service import calculate_rouge, calculate_bleu

    generated = request.get("generated_summary", "")
    reference = request.get("reference_summary", "")

    if not generated or not reference:
        raise HTTPException(status_code=400, detail="Both generated_summary and reference_summary are required")

    rouge_scores = calculate_rouge(generated, reference)
    bleu_score = calculate_bleu(generated, reference)

    return {
        "success": True,
        "rouge_1": rouge_scores["rouge_1"],
        "rouge_2": rouge_scores["rouge_2"],
        "rouge_l": rouge_scores["rouge_l"],
        "bleu": bleu_score,
    }


@router.post("/grade")
async def grade_summary(request: dict):
    """Grade a generated summary using LLM-as-judge."""
    from app.services.evaluation_service import llm_grade_summary

    document_text = request.get("document_text", "")
    generated_summary = request.get("generated_summary", "")
    template_fields = request.get("template_fields", [])

    if not document_text or not generated_summary:
        raise HTTPException(status_code=400, detail="Both document_text and generated_summary are required")

    result = await llm_grade_summary(document_text, generated_summary, template_fields)

    return {
        "success": True,
        **result,
    }
