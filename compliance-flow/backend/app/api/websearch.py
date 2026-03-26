"""Web search endpoints for ComplianceFlow."""

import ipaddress
import socket
from urllib.parse import urlparse

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Any


def _validate_url_not_ssrf(url: str) -> None:
    """Reject URLs that target internal/private networks."""
    parsed = urlparse(url)
    if parsed.scheme not in ('http', 'https'):
        raise ValueError(f"URL scheme must be http or https, got: {parsed.scheme}")
    hostname = parsed.hostname
    if not hostname:
        raise ValueError("URL must have a hostname")
    blocked = {'localhost', '127.0.0.1', '0.0.0.0', '169.254.169.254', 'metadata.google.internal'}
    if hostname in blocked or hostname.endswith('.internal') or hostname.endswith('.local'):
        raise ValueError(f"URL targets blocked host: {hostname}")
    try:
        for info in socket.getaddrinfo(hostname, None):
            ip = ipaddress.ip_address(info[4][0])
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
                raise ValueError(f"URL resolves to private/reserved IP: {ip}")
    except socket.gaierror:
        pass

router = APIRouter(prefix="/websearch")


class SearchRequest(BaseModel):
    engine: str = "searxng"  # searxng, duckduckgo
    engine_url: str
    query: str
    max_results: int = 10
    categories: list[str] = []
    language: str = "en"
    safe_search: bool = True


class SearchResult(BaseModel):
    title: str
    url: str
    snippet: str
    engine: str = ""
    category: str = ""


class SearchResponse(BaseModel):
    success: bool
    results: list[SearchResult] = []
    result_count: int = 0
    query: str = ""
    error: Optional[str] = None


class TestConnectionRequest(BaseModel):
    engine: str = "searxng"
    engine_url: str


class TestConnectionResponse(BaseModel):
    success: bool
    message: str
    engine: Optional[str] = None
    error: Optional[str] = None


class EngineInfo(BaseModel):
    id: str
    name: str
    description: str
    default_url: str


@router.post("/search", response_model=SearchResponse)
async def search(request: SearchRequest):
    """Execute a web search query and return results."""
    try:
        _validate_url_not_ssrf(request.engine_url)

        from app.services.websearch_service import WebSearchService

        service = WebSearchService()
        results = await service.search(
            query=request.query,
            engine_url=request.engine_url,
            max_results=request.max_results,
            categories=request.categories,
            language=request.language,
            safe_search=request.safe_search,
        )

        return SearchResponse(
            success=True,
            results=[
                SearchResult(
                    title=r.get("title", ""),
                    url=r.get("url", ""),
                    snippet=r.get("snippet", ""),
                    engine=r.get("engine", ""),
                    category=r.get("category", ""),
                )
                for r in results
            ],
            result_count=len(results),
            query=request.query,
        )
    except Exception as e:
        return SearchResponse(
            success=False,
            query=request.query,
            error=str(e),
        )


@router.post("/test", response_model=TestConnectionResponse)
async def test_connection(request: TestConnectionRequest):
    """Test connection to a search engine instance."""
    try:
        _validate_url_not_ssrf(request.engine_url)

        from app.services.websearch_service import WebSearchService

        service = WebSearchService()
        result = await service.test_connection(request.engine_url)

        return TestConnectionResponse(
            success=result["success"],
            message=result.get("message", ""),
            engine=request.engine,
            error=result.get("error"),
        )
    except Exception as e:
        return TestConnectionResponse(
            success=False,
            message="Connection test failed",
            engine=request.engine,
            error=str(e),
        )


@router.get("/engines")
async def list_engines():
    """List supported search engines."""
    return {
        "engines": [
            {
                "id": "searxng",
                "name": "SearXNG",
                "description": "Privacy-respecting, self-hosted metasearch engine",
                "default_url": "http://localhost:8888",
            },
            {
                "id": "duckduckgo",
                "name": "DuckDuckGo",
                "description": "Privacy-focused search engine",
                "default_url": "https://api.duckduckgo.com",
            },
        ]
    }
