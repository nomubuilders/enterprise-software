"""
Shared OAuth 2.0 infrastructure for enterprise integration nodes.

Handles token management, refresh flows, and secure storage
for Slack, Microsoft Graph, Google, Dropbox, and Jira OAuth flows.
"""

import time
import logging
from typing import Any, Dict, Optional

import aiohttp

logger = logging.getLogger(__name__)

# In-memory token store (production should use encrypted persistent storage)
_token_store: Dict[str, Dict[str, Any]] = {}


async def get_oauth_token(
    provider: str,
    client_id: str,
    client_secret: str,
    token_url: str,
    refresh_token: Optional[str] = None,
    scopes: Optional[str] = None,
) -> str:
    """
    Get a valid OAuth access token, refreshing if needed.

    Args:
        provider: Provider key for token store (e.g., 'slack', 'google_drive')
        client_id: OAuth client ID
        client_secret: OAuth client secret
        token_url: Token endpoint URL
        refresh_token: Refresh token for token renewal
        scopes: OAuth scopes (space-separated)

    Returns:
        Valid access token string
    """
    stored = _token_store.get(provider)
    if stored and stored.get("expires_at", 0) > time.time() + 300:
        return stored["access_token"]

    if not refresh_token and stored:
        refresh_token = stored.get("refresh_token")

    if not refresh_token:
        raise ValueError(f"No refresh token available for {provider}. Re-authenticate required.")

    payload = {
        "grant_type": "refresh_token",
        "client_id": client_id,
        "client_secret": client_secret,
        "refresh_token": refresh_token,
    }
    if scopes:
        payload["scope"] = scopes

    async with aiohttp.ClientSession() as session:
        async with session.post(token_url, data=payload) as resp:
            if resp.status != 200:
                error_body = await resp.text()
                raise ValueError(f"OAuth token refresh failed for {provider}: {error_body}")
            data = await resp.json()

    _token_store[provider] = {
        "access_token": data["access_token"],
        "refresh_token": data.get("refresh_token", refresh_token),
        "expires_at": time.time() + data.get("expires_in", 3600),
    }

    logger.info(f"OAuth token refreshed for {provider}")
    return data["access_token"]


def store_token(provider: str, access_token: str, refresh_token: str, expires_in: int = 3600) -> None:
    """Store an OAuth token after initial authorization."""
    _token_store[provider] = {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "expires_at": time.time() + expires_in,
    }


def clear_token(provider: str) -> None:
    """Remove stored token for a provider."""
    _token_store.pop(provider, None)
