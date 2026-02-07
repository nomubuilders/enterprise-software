"""Email inbox connection and fetch endpoints."""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, Any

from app.services.email_service import EmailService

router = APIRouter(prefix="/email")

email_service = EmailService()


class EmailConnectionRequest(BaseModel):
    protocol: str = "imap"  # imap or pop3
    host: str
    port: int = 993
    email: str
    password: str
    ssl: bool = True


class EmailConnectionResponse(BaseModel):
    success: bool
    message: str
    error: Optional[str] = None


class FetchEmailsRequest(BaseModel):
    protocol: str = "imap"
    host: str
    port: int = 993
    email: str
    password: str
    ssl: bool = True
    folder: str = "INBOX"
    filter_unread: bool = False
    filter_from: Optional[str] = None
    filter_since: Optional[str] = None  # ISO date string e.g. "2024-01-15"
    limit: int = 50


class EmailMessage(BaseModel):
    uid: str
    subject: Optional[str] = None
    sender: Optional[str] = None
    to: Optional[str] = None
    date: Optional[str] = None
    body_text: Optional[str] = None
    body_html: Optional[str] = None
    has_attachments: bool = False


class FetchEmailsResponse(BaseModel):
    success: bool
    emails: list[EmailMessage] = []
    count: int = 0
    error: Optional[str] = None


class ListFoldersRequest(BaseModel):
    protocol: str = "imap"
    host: str
    port: int = 993
    email: str
    password: str
    ssl: bool = True


class FolderInfo(BaseModel):
    name: str
    flags: list[str] = []


class ListFoldersResponse(BaseModel):
    success: bool
    folders: list[FolderInfo] = []
    error: Optional[str] = None


@router.post("/test", response_model=EmailConnectionResponse)
async def test_connection(request: EmailConnectionRequest):
    """Test IMAP/POP3 email connection with provided credentials."""
    try:
        result = await email_service.test_connection({
            "protocol": request.protocol,
            "host": request.host,
            "port": request.port,
            "email": request.email,
            "password": request.password,
            "ssl": request.ssl,
        })
        return EmailConnectionResponse(
            success=result.get("success", False),
            message=result.get("message", ""),
            error=result.get("error"),
        )
    except Exception as e:
        return EmailConnectionResponse(
            success=False,
            message="Connection failed",
            error=str(e),
        )


@router.post("/fetch", response_model=FetchEmailsResponse)
async def fetch_emails(request: FetchEmailsRequest):
    """Fetch emails with optional filters."""
    try:
        config = {
            "protocol": request.protocol,
            "host": request.host,
            "port": request.port,
            "email": request.email,
            "password": request.password,
            "ssl": request.ssl,
        }
        filters = {
            "folder": request.folder,
            "filter_unread": request.filter_unread,
            "filter_from": request.filter_from,
            "filter_since": request.filter_since,
            "limit": request.limit,
        }

        emails = await email_service.fetch_emails(config, filters)
        email_messages = [
            EmailMessage(
                uid=em.get("uid", ""),
                subject=em.get("subject"),
                sender=em.get("sender"),
                to=em.get("to"),
                date=em.get("date"),
                body_text=em.get("body_text"),
                body_html=em.get("body_html"),
                has_attachments=em.get("has_attachments", False),
            )
            for em in emails
        ]
        return FetchEmailsResponse(
            success=True,
            emails=email_messages,
            count=len(email_messages),
        )
    except Exception as e:
        return FetchEmailsResponse(
            success=False,
            error=str(e),
        )


@router.post("/folders", response_model=ListFoldersResponse)
async def list_folders(request: ListFoldersRequest):
    """List available email folders/mailboxes."""
    try:
        folders = await email_service.list_folders({
            "protocol": request.protocol,
            "host": request.host,
            "port": request.port,
            "email": request.email,
            "password": request.password,
            "ssl": request.ssl,
        })
        folder_infos = [
            FolderInfo(name=f.get("name", ""), flags=f.get("flags", []))
            for f in folders
        ]
        return ListFoldersResponse(
            success=True,
            folders=folder_infos,
        )
    except Exception as e:
        return ListFoldersResponse(
            success=False,
            error=str(e),
        )
