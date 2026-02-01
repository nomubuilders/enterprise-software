"""Database connection and query endpoints."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Any
from app.services.database import DatabaseConnectorService, DatabaseConnectorFactory
from app.models.database import DatabaseConfig, DatabaseType

router = APIRouter(prefix="/databases")


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
        # Map string type to enum
        db_type = DatabaseType(request.type)

        config = DatabaseConfig(
            type=db_type,
            host=request.host,
            port=request.port,
            database=request.database,
            username=request.username,
            password=request.password,
            ssl=request.ssl,
        )

        # Create connector and test
        connector = DatabaseConnectorFactory.create(config)
        try:
            await connector.initialize()
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
        db_type = DatabaseType(request.type)
        config = DatabaseConfig(
            type=db_type,
            host=request.host,
            port=request.port,
            database=request.database,
            username=request.username,
            password=request.password,
            ssl=request.ssl,
        )

        connector = DatabaseConnectorFactory.create(config)
        try:
            await connector.initialize()
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
        db_type = DatabaseType(request.type)
        config = DatabaseConfig(
            type=db_type,
            host=request.host,
            port=request.port,
            database=request.database,
            username=request.username,
            password=request.password,
            ssl=request.ssl,
        )

        connector = DatabaseConnectorFactory.create(config)
        try:
            await connector.initialize()
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
        db_type = DatabaseType(request.type)
        config = DatabaseConfig(
            type=db_type,
            host=request.host,
            port=request.port,
            database=request.database,
            username=request.username,
            password=request.password,
            ssl=request.ssl,
        )

        connector = DatabaseConnectorFactory.create(config)
        try:
            await connector.initialize()
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
