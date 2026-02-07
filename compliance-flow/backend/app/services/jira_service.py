"""
Jira Compliance Service for ComplianceFlow.

Monitors Jira tickets, tracks resolution times, generates compliance
summaries, and provides performance analysis via JQL queries.
Uses the new POST /rest/api/3/search/jql endpoint.
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

import aiohttp

logger = logging.getLogger(__name__)


class JiraComplianceService:
    """Handles Jira REST API v3 interactions for compliance monitoring."""

    def __init__(self, jira_url: str, auth_header: str):
        """
        Initialize Jira service.

        Args:
            jira_url: Base Jira URL (e.g., https://company.atlassian.net)
            auth_header: Authorization header value (Bearer token or Basic auth)
        """
        self.jira_url = jira_url.rstrip("/")
        self.headers = {
            "Authorization": auth_header,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    async def search_issues(
        self,
        jql: str,
        max_results: int = 50,
        fields: Optional[List[str]] = None,
        expand: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Search issues using JQL via the new POST endpoint.

        Args:
            jql: JQL query string
            max_results: Maximum results to return
            fields: Fields to include in response
            expand: Expansions (e.g., changelog)
        """
        payload: Dict[str, Any] = {
            "jql": jql,
            "maxResults": max_results,
            "fields": fields or ["summary", "status", "created", "resolutiondate", "assignee", "priority"],
        }
        if expand:
            payload["expand"] = expand

        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.jira_url}/rest/api/3/search/jql",
                headers=self.headers,
                json=payload,
            ) as resp:
                if resp.status != 200:
                    error = await resp.text()
                    raise ValueError(f"Jira API error ({resp.status}): {error}")
                return await resp.json()

    async def get_issue_changelog(self, issue_key: str) -> List[Dict[str, Any]]:
        """Get full changelog for an issue (paginated)."""
        changelogs: List[Dict[str, Any]] = []
        start_at = 0

        async with aiohttp.ClientSession() as session:
            while True:
                async with session.get(
                    f"{self.jira_url}/rest/api/latest/issue/{issue_key}/changelog",
                    headers=self.headers,
                    params={"startAt": start_at, "maxResults": 100},
                ) as resp:
                    if resp.status != 200:
                        break
                    data = await resp.json()
                    values = data.get("values", [])
                    changelogs.extend(values)
                    if start_at + len(values) >= data.get("total", 0):
                        break
                    start_at += len(values)

        return changelogs

    async def analyze_resolution_time(self, jql: str) -> Dict[str, Any]:
        """Analyze average resolution time for issues matching JQL."""
        result = await self.search_issues(
            jql, max_results=100,
            fields=["summary", "status", "created", "resolutiondate"],
        )
        issues = result.get("issues", [])

        resolved = []
        for issue in issues:
            fields = issue.get("fields", {})
            created = fields.get("created")
            resolved_date = fields.get("resolutiondate")
            if created and resolved_date:
                try:
                    c = datetime.fromisoformat(created.replace("Z", "+00:00"))
                    r = datetime.fromisoformat(resolved_date.replace("Z", "+00:00"))
                    hours = (r - c).total_seconds() / 3600
                    resolved.append({
                        "key": issue.get("key"),
                        "summary": fields.get("summary", ""),
                        "resolution_hours": round(hours, 1),
                    })
                except (ValueError, TypeError):
                    pass

        avg_hours = sum(r["resolution_hours"] for r in resolved) / len(resolved) if resolved else 0

        return {
            "analysis_type": "resolution_time",
            "total_issues": len(issues),
            "resolved_issues": len(resolved),
            "average_resolution_hours": round(avg_hours, 1),
            "issues": resolved[:20],
            "query": jql,
        }

    async def analyze_sla_compliance(self, jql: str, sla_hours: float = 72) -> Dict[str, Any]:
        """Check SLA compliance for issues matching JQL."""
        resolution = await self.analyze_resolution_time(jql)
        issues = resolution.get("issues", [])

        within_sla = [i for i in issues if i["resolution_hours"] <= sla_hours]
        breached = [i for i in issues if i["resolution_hours"] > sla_hours]

        compliance_rate = len(within_sla) / len(issues) * 100 if issues else 100

        return {
            "analysis_type": "sla_compliance",
            "sla_target_hours": sla_hours,
            "total_resolved": len(issues),
            "within_sla": len(within_sla),
            "breached_sla": len(breached),
            "compliance_rate": round(compliance_rate, 1),
            "breached_issues": breached[:10],
            "query": jql,
        }

    async def generate_audit_trail(self, jql: str) -> Dict[str, Any]:
        """Generate audit trail with changelogs for issues matching JQL."""
        result = await self.search_issues(jql, max_results=20)
        issues = result.get("issues", [])

        audit_entries = []
        for issue in issues:
            key = issue.get("key", "")
            changelog = await self.get_issue_changelog(key)
            audit_entries.append({
                "issue_key": key,
                "summary": issue.get("fields", {}).get("summary", ""),
                "changelog_entries": len(changelog),
                "changes": changelog[:10],
            })

        return {
            "analysis_type": "audit_trail",
            "total_issues": len(issues),
            "audit_entries": audit_entries,
            "query": jql,
        }
