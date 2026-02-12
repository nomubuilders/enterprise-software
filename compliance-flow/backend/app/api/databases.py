"""Database connection and query endpoints."""

import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Any
from loguru import logger
from app.services.database import DatabaseConnectorService, DatabaseConnectorFactory
from app.models.database import DatabaseConfig, DatabaseType

router = APIRouter(prefix="/databases")

# Docker service names for each DB type
_DOCKER_SERVICE_MAP = {
    'postgresql': 'postgres',
    'mongodb': 'mongo',
}

# Default internal ports for Docker services (container-side, not host-mapped)
_DEFAULT_INTERNAL_PORTS = {
    'postgresql': 5432,
    'mongodb': 27017,
    'mysql': 3306,
}


def _resolve_db_candidates(host: str, port: int, db_type: str) -> list[tuple[str, int]]:
    """When host is localhost inside Docker, return candidate (host, port) pairs.
    
    Docker maps host:5433 → container:5432, so when we're INSIDE Docker
    we must use the internal port (5432) for service names, but keep
    the original port for host.docker.internal (which goes via the host mapping).
    """
    if host not in ('localhost', '127.0.0.1') or not os.path.exists('/.dockerenv'):
        return [(host, port)]
    
    candidates: list[tuple[str, int]] = []
    service = _DOCKER_SERVICE_MAP.get(db_type)
    internal_port = _DEFAULT_INTERNAL_PORTS.get(db_type, port)
    
    if service:
        # Docker service: use internal port (e.g. postgres:5432)
        candidates.append((service, internal_port))
    # host.docker.internal: use original port (goes through host mapping)
    candidates.append(('host.docker.internal', port))
    return candidates


async def _connect_with_fallback(
    db_type_str: str, host: str, port: int, database: str,
    username: str, password: str, ssl: bool,
):
    """Try each candidate (host, port) in order, return the first working connector."""
    db_type = DatabaseType(db_type_str)
    candidates = _resolve_db_candidates(host, port, db_type_str)
    last_error = None
    for h, p in candidates:
        config = DatabaseConfig(
            type=db_type, host=h, port=p,
            database=database, username=username, password=password, ssl=ssl,
        )
        connector = DatabaseConnectorFactory.create(config)
        try:
            await connector.initialize()
            logger.debug(f"DB connected via host={h}:{p}")
            return connector
        except Exception as e:
            last_error = e
            logger.debug(f"DB connection failed for {h}:{p}: {e}")
            try:
                await connector.close()
            except Exception:
                pass
    raise last_error or Exception(f"Could not connect on any candidate: {candidates}")


class TestConnectionRequest(BaseModel):
    type: str  # postgresql, mysql, mongodb
    host: str
    port: int
    database: str
    username: str
    password: str
    ssl: bool = False


class TestConnectionResponse(BaseModel):
    success: bool
    message: str
    version: Optional[str] = None
    latency_ms: Optional[float] = None
    error: Optional[str] = None


class QueryRequest(BaseModel):
    type: str
    host: str
    port: int
    database: str
    username: str
    password: str
    ssl: bool = False
    query: str
    limit: int = 100


class QueryResponse(BaseModel):
    success: bool
    rows: list[dict[str, Any]] = []
    row_count: int = 0
    columns: list[str] = []
    execution_time_ms: Optional[float] = None
    error: Optional[str] = None


@router.post("/test", response_model=TestConnectionResponse)
async def test_connection(request: TestConnectionRequest):
    """Test database connection with provided credentials."""
    try:
        connector = await _connect_with_fallback(
            request.type, request.host, request.port, request.database,
            request.username, request.password, request.ssl,
        )
        try:
            result = await connector.test_connection()
            return TestConnectionResponse(
                success=result.success,
                message="Connection successful" if result.success else "Connection failed",
                version=result.database_version,
                latency_ms=result.latency_ms,
                error=result.error,
            )
        finally:
            await connector.close()

    except ValueError as e:
        return TestConnectionResponse(
            success=False,
            message="Invalid database type",
            error=str(e),
        )
    except Exception as e:
        return TestConnectionResponse(
            success=False,
            message="Connection failed",
            error=str(e),
        )


@router.post("/tables")
async def list_tables(request: TestConnectionRequest):
    """List all tables/collections in the database."""
    try:
        connector = await _connect_with_fallback(
            request.type, request.host, request.port, request.database,
            request.username, request.password, request.ssl,
        )
        try:
            result = await connector.list_tables()
            return {
                "success": True,
                "tables": [
                    {
                        "name": t.name,
                        "type": t.type,
                        "row_count": t.row_count,
                        "columns": [
                            {"name": c.name, "type": c.type, "nullable": c.nullable}
                            for c in (t.columns or [])
                        ],
                    }
                    for t in (result.tables or [])
                ],
            }
        finally:
            await connector.close()

    except Exception as e:
        return {"success": False, "tables": [], "error": str(e)}


@router.post("/query", response_model=QueryResponse)
async def execute_query(request: QueryRequest):
    """Execute a SELECT query on the database."""
    try:
        connector = await _connect_with_fallback(
            request.type, request.host, request.port, request.database,
            request.username, request.password, request.ssl,
        )
        try:
            result = await connector.execute_query(request.query, limit=request.limit)
            return QueryResponse(
                success=True,
                rows=result.rows or [],
                row_count=result.row_count,
                columns=result.columns or [],
                execution_time_ms=result.execution_time_ms,
            )
        finally:
            await connector.close()

    except Exception as e:
        return QueryResponse(
            success=False,
            error=str(e),
        )


@router.post("/sample")
async def get_sample_data(request: TestConnectionRequest, table: str, limit: int = 100):
    """Get sample data from a table/collection."""
    try:
        connector = await _connect_with_fallback(
            request.type, request.host, request.port, request.database,
            request.username, request.password, request.ssl,
        )
        try:
            result = await connector.get_sample_data(table, limit)
            return {
                "success": True,
                "table": table,
                "rows": result.sample_data or [],
                "total_count": result.total_count,
                "sample_size": result.sample_size,
            }
        finally:
            await connector.close()

    except Exception as e:
        return {"success": False, "table": table, "rows": [], "error": str(e)}
