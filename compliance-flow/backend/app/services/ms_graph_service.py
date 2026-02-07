"""
Microsoft Graph Service for ComplianceFlow.

Monitors Microsoft Teams communications for DORA compliance,
scanning for ICT incident keywords and tracking the 4-hour
reporting window.
"""

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import aiohttp

logger = logging.getLogger(__name__)

# Default DORA ICT incident keywords
DEFAULT_KEYWORDS = [
    "outage", "incident", "breach", "failure", "downtime",
    "disruption", "vulnerability", "cyberattack", "ransomware",
    "data loss", "service degradation", "system failure",
]


class MSGraphService:
    """Handles Microsoft Graph API interactions for Teams DORA monitoring."""

    def __init__(self, access_token: str, tenant_id: str = ""):
        self.access_token = access_token
        self.tenant_id = tenant_id
        self.base_url = "https://graph.microsoft.com/v1.0"
        self.headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }

    async def get_team_channels(self, team_id: str) -> List[Dict[str, Any]]:
        """List channels in a team."""
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{self.base_url}/teams/{team_id}/channels",
                headers=self.headers,
            ) as resp:
                if resp.status != 200:
                    raise ValueError(f"Graph API error: {resp.status}")
                data = await resp.json()
                return data.get("value", [])

    async def get_channel_messages(
        self,
        team_id: str,
        channel_id: str,
        top: int = 50,
    ) -> List[Dict[str, Any]]:
        """Fetch messages from a Teams channel."""
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{self.base_url}/teams/{team_id}/channels/{channel_id}/messages",
                headers=self.headers,
                params={"$top": top},
            ) as resp:
                if resp.status != 200:
                    raise ValueError(f"Graph API error: {resp.status}")
                data = await resp.json()
                return data.get("value", [])

    async def scan_for_incidents(
        self,
        team_id: str,
        channel_id: str,
        keywords: Optional[List[str]] = None,
        alert_window_minutes: int = 240,
    ) -> Dict[str, Any]:
        """
        Scan channel messages for DORA ICT incident indicators.

        Args:
            team_id: Microsoft Teams team ID
            channel_id: Channel ID within the team
            keywords: ICT incident keywords to search for
            alert_window_minutes: DORA reporting window (default 4 hours)

        Returns:
            Dict with incidents found, scan stats, and DORA status
        """
        scan_keywords = keywords or DEFAULT_KEYWORDS
        messages = await self.get_channel_messages(team_id, channel_id)

        incidents: List[Dict[str, Any]] = []
        cutoff = datetime.utcnow() - timedelta(minutes=alert_window_minutes)

        for msg in messages:
            body = (msg.get("body", {}).get("content", "") or "").lower()
            matched = [kw for kw in scan_keywords if kw.lower() in body]
            if matched:
                created = msg.get("createdDateTime", "")
                incidents.append({
                    "message_id": msg.get("id"),
                    "matched_keywords": matched,
                    "timestamp": created,
                    "sender": msg.get("from", {}).get("user", {}).get("displayName", "unknown"),
                    "content_preview": body[:200],
                    "within_alert_window": bool(created and created > cutoff.isoformat()),
                })

        alerts_in_window = sum(1 for i in incidents if i.get("within_alert_window"))

        return {
            "ict_incidents": incidents,
            "total_scanned": len(messages),
            "incidents_found": len(incidents),
            "alerts_in_window": alerts_in_window,
            "alert_window_minutes": alert_window_minutes,
            "dora_status": "alert" if alerts_in_window > 0 else "clear",
        }
