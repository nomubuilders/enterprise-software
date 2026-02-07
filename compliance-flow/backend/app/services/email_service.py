"""Email inbox service for IMAP and POP3 connections."""

import asyncio
import imaplib
import poplib
import email
from email.header import decode_header
from email.utils import parseaddr
from typing import Any, Optional


def _decode_header_value(value: Optional[str]) -> str:
    """Decode an email header value to a plain string."""
    if not value:
        return ""
    decoded_parts = decode_header(value)
    result = []
    for part, charset in decoded_parts:
        if isinstance(part, bytes):
            result.append(part.decode(charset or "utf-8", errors="replace"))
        else:
            result.append(part)
    return "".join(result)


def _parse_email_message(msg: email.message.Message, uid: str) -> dict:
    """Parse an email.message.Message into a dict."""
    subject = _decode_header_value(msg.get("Subject"))
    sender = _decode_header_value(msg.get("From"))
    to = _decode_header_value(msg.get("To"))
    date = msg.get("Date", "")

    body_text: Optional[str] = None
    body_html: Optional[str] = None
    has_attachments = False

    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            content_disposition = str(part.get("Content-Disposition", ""))

            if "attachment" in content_disposition:
                has_attachments = True
                continue

            if content_type == "text/plain" and body_text is None:
                payload = part.get_payload(decode=True)
                if payload:
                    charset = part.get_content_charset() or "utf-8"
                    body_text = payload.decode(charset, errors="replace")
            elif content_type == "text/html" and body_html is None:
                payload = part.get_payload(decode=True)
                if payload:
                    charset = part.get_content_charset() or "utf-8"
                    body_html = payload.decode(charset, errors="replace")
    else:
        content_type = msg.get_content_type()
        payload = msg.get_payload(decode=True)
        if payload:
            charset = msg.get_content_charset() or "utf-8"
            decoded = payload.decode(charset, errors="replace")
            if content_type == "text/html":
                body_html = decoded
            else:
                body_text = decoded

    return {
        "uid": uid,
        "subject": subject,
        "sender": sender,
        "to": to,
        "date": date,
        "body_text": body_text,
        "body_html": body_html,
        "has_attachments": has_attachments,
    }


class EmailService:
    """Service for connecting to and fetching from email inboxes."""

    async def test_connection(self, config: dict) -> dict:
        """Test IMAP or POP3 connection."""
        protocol = config.get("protocol", "imap").lower()

        if protocol == "imap":
            return await self._test_imap(config)
        elif protocol == "pop3":
            return await self._test_pop3(config)
        else:
            return {"success": False, "message": f"Unsupported protocol: {protocol}", "error": f"Unsupported protocol: {protocol}"}

    async def fetch_emails(self, config: dict, filters: dict) -> list:
        """Fetch emails using IMAP or POP3 with filters."""
        protocol = config.get("protocol", "imap").lower()

        if protocol == "imap":
            return await self._fetch_imap(config, filters)
        elif protocol == "pop3":
            return await self._fetch_pop3(config, filters)
        else:
            raise ValueError(f"Unsupported protocol: {protocol}")

    async def list_folders(self, config: dict) -> list:
        """List available folders. Only supported for IMAP."""
        protocol = config.get("protocol", "imap").lower()

        if protocol == "imap":
            return await self._list_folders_imap(config)
        elif protocol == "pop3":
            # POP3 only supports INBOX
            return [{"name": "INBOX", "flags": []}]
        else:
            raise ValueError(f"Unsupported protocol: {protocol}")

    # --- IMAP methods ---

    async def _test_imap(self, config: dict) -> dict:
        """Test IMAP connection in a thread pool."""
        def _connect():
            try:
                if config.get("ssl", True):
                    conn = imaplib.IMAP4_SSL(config["host"], config.get("port", 993))
                else:
                    conn = imaplib.IMAP4(config["host"], config.get("port", 143))

                conn.login(config["email"], config["password"])
                conn.logout()
                return {"success": True, "message": "IMAP connection successful"}
            except imaplib.IMAP4.error as e:
                return {"success": False, "message": "IMAP authentication failed", "error": str(e)}
            except Exception as e:
                return {"success": False, "message": "IMAP connection failed", "error": str(e)}

        return await asyncio.get_event_loop().run_in_executor(None, _connect)

    async def _fetch_imap(self, config: dict, filters: dict) -> list:
        """Fetch emails via IMAP in a thread pool."""
        def _fetch():
            try:
                if config.get("ssl", True):
                    conn = imaplib.IMAP4_SSL(config["host"], config.get("port", 993))
                else:
                    conn = imaplib.IMAP4(config["host"], config.get("port", 143))

                conn.login(config["email"], config["password"])

                folder = filters.get("folder", "INBOX")
                conn.select(folder, readonly=True)

                # Build IMAP search criteria
                criteria = []
                if filters.get("filter_unread"):
                    criteria.append("UNSEEN")
                if filters.get("filter_from"):
                    criteria.append(f'FROM "{filters["filter_from"]}"')
                if filters.get("filter_since"):
                    criteria.append(f'SINCE "{filters["filter_since"]}"')

                search_query = " ".join(criteria) if criteria else "ALL"
                status, data = conn.uid("search", None, search_query)

                if status != "OK" or not data[0]:
                    conn.logout()
                    return []

                uids = data[0].split()
                limit = filters.get("limit", 50)
                # Take the most recent emails (last N UIDs)
                uids = uids[-limit:]

                emails = []
                for uid in uids:
                    uid_str = uid.decode("utf-8") if isinstance(uid, bytes) else str(uid)
                    status, msg_data = conn.uid("fetch", uid, "(RFC822)")
                    if status != "OK" or not msg_data or not msg_data[0]:
                        continue
                    raw_email = msg_data[0][1]
                    msg = email.message_from_bytes(raw_email)
                    emails.append(_parse_email_message(msg, uid_str))

                conn.logout()
                return emails

            except Exception as e:
                raise RuntimeError(f"IMAP fetch failed: {str(e)}")

        return await asyncio.get_event_loop().run_in_executor(None, _fetch)

    async def _list_folders_imap(self, config: dict) -> list:
        """List IMAP folders in a thread pool."""
        def _list():
            try:
                if config.get("ssl", True):
                    conn = imaplib.IMAP4_SSL(config["host"], config.get("port", 993))
                else:
                    conn = imaplib.IMAP4(config["host"], config.get("port", 143))

                conn.login(config["email"], config["password"])

                status, folder_data = conn.list()
                folders = []

                if status == "OK" and folder_data:
                    for item in folder_data:
                        if item is None:
                            continue
                        decoded = item.decode("utf-8") if isinstance(item, bytes) else str(item)
                        # Parse IMAP LIST response: (flags) delimiter name
                        # e.g. '(\\HasNoChildren) "/" "INBOX"'
                        flags_part = ""
                        name_part = decoded
                        if decoded.startswith("("):
                            close_paren = decoded.index(")")
                            flags_part = decoded[1:close_paren]
                            # Extract name after delimiter
                            rest = decoded[close_paren + 1:].strip()
                            # Skip the delimiter portion (e.g. "/" or ".")
                            parts = rest.split(" ", 1)
                            if len(parts) > 1:
                                name_part = parts[1].strip().strip('"')
                            else:
                                name_part = parts[0].strip().strip('"')

                        flags = [f.strip() for f in flags_part.split("\\") if f.strip()]
                        folders.append({"name": name_part, "flags": flags})

                conn.logout()
                return folders

            except Exception as e:
                raise RuntimeError(f"IMAP list folders failed: {str(e)}")

        return await asyncio.get_event_loop().run_in_executor(None, _list)

    # --- POP3 methods ---

    async def _test_pop3(self, config: dict) -> dict:
        """Test POP3 connection in a thread pool."""
        def _connect():
            try:
                if config.get("ssl", True):
                    conn = poplib.POP3_SSL(config["host"], config.get("port", 995))
                else:
                    conn = poplib.POP3(config["host"], config.get("port", 110))

                conn.user(config["email"])
                conn.pass_(config["password"])
                conn.quit()
                return {"success": True, "message": "POP3 connection successful"}
            except poplib.error_proto as e:
                return {"success": False, "message": "POP3 authentication failed", "error": str(e)}
            except Exception as e:
                return {"success": False, "message": "POP3 connection failed", "error": str(e)}

        return await asyncio.get_event_loop().run_in_executor(None, _connect)

    async def _fetch_pop3(self, config: dict, filters: dict) -> list:
        """Fetch emails via POP3 in a thread pool."""
        def _fetch():
            try:
                if config.get("ssl", True):
                    conn = poplib.POP3_SSL(config["host"], config.get("port", 995))
                else:
                    conn = poplib.POP3(config["host"], config.get("port", 110))

                conn.user(config["email"])
                conn.pass_(config["password"])

                num_messages = len(conn.list()[1])
                limit = filters.get("limit", 50)
                start = max(1, num_messages - limit + 1)

                emails = []
                filter_from = filters.get("filter_from")
                filter_unread = filters.get("filter_unread", False)

                for i in range(num_messages, start - 1, -1):
                    try:
                        response, lines, octets = conn.retr(i)
                        raw_email = b"\r\n".join(lines)
                        msg = email.message_from_bytes(raw_email)
                        parsed = _parse_email_message(msg, str(i))

                        # Apply client-side filters for POP3
                        if filter_from and filter_from.lower() not in (parsed.get("sender") or "").lower():
                            continue

                        emails.append(parsed)

                        if len(emails) >= limit:
                            break
                    except Exception:
                        continue

                conn.quit()
                return emails

            except Exception as e:
                raise RuntimeError(f"POP3 fetch failed: {str(e)}")

        return await asyncio.get_event_loop().run_in_executor(None, _fetch)
