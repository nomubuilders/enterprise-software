"""Web search service for ComplianceFlow."""

import httpx
from typing import Any, Optional


class WebSearchService:
    """Service for executing web searches against SearXNG and other engines."""

    def __init__(self, timeout: float = 15.0):
        self.timeout = timeout

    async def search(
        self,
        query: str,
        engine_url: str,
        max_results: int = 10,
        categories: list[str] | None = None,
        language: str = "en",
        safe_search: bool = True,
    ) -> list[dict[str, Any]]:
        """Execute a web search query against a SearXNG instance.

        Args:
            query: The search query string.
            engine_url: Base URL of the SearXNG instance.
            max_results: Maximum number of results to return.
            categories: List of search categories (e.g., "general", "news", "science").
            language: Language code for results.
            safe_search: Whether to enable safe search filtering.

        Returns:
            List of search result dicts with title, url, snippet, engine, category.
        """
        url = f"{engine_url.rstrip('/')}/search"

        params: dict[str, Any] = {
            "q": query,
            "format": "json",
            "language": language,
            "safesearch": "1" if safe_search else "0",
        }

        if categories:
            params["categories"] = ",".join(categories)

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()

        raw_results = data.get("results", [])
        results: list[dict[str, Any]] = []

        for item in raw_results[:max_results]:
            results.append({
                "title": item.get("title", ""),
                "url": item.get("url", ""),
                "snippet": item.get("content", ""),
                "engine": item.get("engine", ""),
                "category": item.get("category", ""),
            })

        return results

    async def test_connection(self, engine_url: str) -> dict[str, Any]:
        """Test connection to a search engine instance.

        Args:
            engine_url: Base URL of the SearXNG instance.

        Returns:
            Dict with success status and message.
        """
        try:
            url = f"{engine_url.rstrip('/')}/search"
            params = {"q": "test", "format": "json"}

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, params=params)
                response.raise_for_status()

                # Verify we got valid JSON with expected structure
                data = response.json()
                if "results" in data:
                    return {
                        "success": True,
                        "message": f"Connected to SearXNG at {engine_url}",
                    }
                else:
                    return {
                        "success": False,
                        "message": "Unexpected response format",
                        "error": "Response missing 'results' field",
                    }

        except httpx.ConnectError:
            return {
                "success": False,
                "message": "Could not connect to search engine",
                "error": f"Connection refused at {engine_url}",
            }
        except httpx.TimeoutException:
            return {
                "success": False,
                "message": "Connection timed out",
                "error": f"Timeout connecting to {engine_url}",
            }
        except Exception as e:
            return {
                "success": False,
                "message": "Connection test failed",
                "error": str(e),
            }
