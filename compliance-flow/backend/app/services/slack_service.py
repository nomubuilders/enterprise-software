"""
Slack Compliance Service for ComplianceFlow.

Scans Slack channels for messages and files, detects PII using
the existing Presidio engine, and applies compliance policies.
"""

import logging
from typing import Any, Dict, List, Optional

import aiohttp

logger = logging.getLogger(__name__)


class SlackComplianceService:
    """Handles Slack workspace scanning for compliance monitoring."""

    def __init__(self, token: str, workspace_url: str = ""):
        self.token = token
        self.workspace_url = workspace_url
        self.base_url = "https://slack.com/api"
        self.headers = {"Authorization": f"Bearer {token}"}

    async def list_channels(self) -> List[Dict[str, Any]]:
        """List all accessible channels in the workspace."""
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{self.base_url}/conversations.list",
                headers=self.headers,
                params={"types": "public_channel,private_channel", "limit": 200},
            ) as resp:
                data = await resp.json()
                if not data.get("ok"):
                    raise ValueError(f"Slack API error: {data.get('error', 'unknown')}")
                return data.get("channels", [])

    async def fetch_messages(
        self,
        channel_id: str,
        limit: int = 100,
        oldest: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Fetch message history from a channel."""
        params: Dict[str, Any] = {"channel": channel_id, "limit": min(limit, 200)}
        if oldest:
            params["oldest"] = oldest

        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{self.base_url}/conversations.history",
                headers=self.headers,
                params=params,
            ) as resp:
                data = await resp.json()
                if not data.get("ok"):
                    raise ValueError(f"Slack API error: {data.get('error', 'unknown')}")
                return data.get("messages", [])

    async def list_files(self, channel_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """List files shared in the workspace or a specific channel."""
        params: Dict[str, Any] = {"count": 100}
        if channel_id:
            params["channel"] = channel_id

        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{self.base_url}/files.list",
                headers=self.headers,
                params=params,
            ) as resp:
                data = await resp.json()
                if not data.get("ok"):
                    raise ValueError(f"Slack API error: {data.get('error', 'unknown')}")
                return data.get("files", [])

    async def scan_channel(
        self,
        channel_id: str,
        max_messages: int = 1000,
        extract_docs: bool = False,
    ) -> Dict[str, Any]:
        """
        Scan a channel for messages and optionally extract documents.

        Returns:
            Dict with messages, documents, and total count
        """
        messages = await self.fetch_messages(channel_id, limit=max_messages)
        documents = []

        if extract_docs:
            files = await self.list_files(channel_id)
            documents = [
                {
                    "id": f["id"],
                    "name": f.get("name", ""),
                    "filetype": f.get("filetype", ""),
                    "size": f.get("size", 0),
                    "url": f.get("url_private", ""),
                }
                for f in files
            ]

        return {
            "messages": messages,
            "documents": documents,
            "total_messages": len(messages),
            "total_documents": len(documents),
        }
