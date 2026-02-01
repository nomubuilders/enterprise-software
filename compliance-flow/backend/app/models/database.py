"""Database models and schemas for ComplianceFlow."""

from typing import Any, Dict, List, Optional
from enum import Enum
from pydantic import BaseModel, Field, validator


class DatabaseType(str, Enum):
    """Supported database types."""
    POSTGRESQL = "postgresql"
    MYSQL = "mysql"
    MONGODB = "mongodb"


class DatabaseConfig(BaseModel):
    """Configuration for database connections."""

    type: DatabaseType = Field(..., description="Database type")
    host: str = Field(..., description="Database host address")
    port: int = Field(..., description="Database port")
    database: str = Field(..., description="Database/schema name")
    username: str = Field(..., description="Database username")
    password: str = Field(..., description="Database password")
    ssl: bool = Field(default=False, description="Use SSL/TLS connection")
    ssl_verify: bool = Field(default=True, description="Verify SSL certificate")
    connection_timeout: int = Field(
        default=30, ge=1, le=300, description="Connection timeout in seconds"
    )
    query_timeout: int = Field(
        default=60, ge=1, le=3600, description="Query timeout in seconds"
    )
    pool_size: int = Field(
        default=10, ge=1, le=100, description="Connection pool size"
    )
    max_overflow: int = Field(
        default=20, ge=0, le=200, description="Maximum overflow connections"
    )

    @validator("port")
    def validate_port(cls, v: int) -> int:
        """Validate port number."""
        if v < 1 or v > 65535:
            raise ValueError("Port must be between 1 and 65535")
        return v

    def get_connection_string(self) -> str:
        """Generate connection string for SQLAlchemy databases."""
        if self.type == DatabaseType.POSTGRESQL:
            ssl_mode = "require" if self.ssl else "disable"
            return (
                f"postgresql+asyncpg://{self.username}:{self.password}@"
                f"{self.host}:{self.port}/{self.database}"
                f"?ssl={ssl_mode}"
            )
        elif self.type == DatabaseType.MYSQL:
            ssl_param = "True" if self.ssl else "False"
            return (
                f"mysql+aiomysql://{self.username}:{self.password}@"
                f"{self.host}:{self.port}/{self.database}"
                f"?ssl={ssl_param}"
            )
        else:
            raise ValueError(f"Unsupported database type: {self.type}")


class ConnectionTestResult(BaseModel):
    """Result of a connection test."""

    success: bool = Field(..., description="Whether connection test succeeded")
    message: str = Field(..., description="Test result message")
    database_version: Optional[str] = Field(
        default=None, description="Database version if successful"
    )
    latency_ms: Optional[float] = Field(
        default=None, description="Connection latency in milliseconds"
    )
    error: Optional[str] = Field(default=None, description="Error message if failed")


class ColumnInfo(BaseModel):
    """Information about a database column."""

    name: str = Field(..., description="Column name")
    type: str = Field(..., description="Column data type")
    nullable: bool = Field(..., description="Whether column allows NULL")
    primary_key: bool = Field(default=False, description="Whether column is primary key")
    default: Optional[str] = Field(default=None, description="Default value")
    comment: Optional[str] = Field(default=None, description="Column comment")


class TableInfo(BaseModel):
    """Information about a database table or collection."""

    name: str = Field(..., description="Table/collection name")
    type: str = Field(..., description="Object type (table, view, collection)")
    row_count: Optional[int] = Field(
        default=None, description="Number of rows/documents"
    )
    size_bytes: Optional[int] = Field(
        default=None, description="Table/collection size in bytes"
    )
    columns: List[ColumnInfo] = Field(
        default_factory=list, description="Column information"
    )
    indexes: List[str] = Field(
        default_factory=list, description="Index names"
    )
    created_at: Optional[str] = Field(
        default=None, description="Creation timestamp"
    )
    updated_at: Optional[str] = Field(
        default=None, description="Last updated timestamp"
    )


class QueryResult(BaseModel):
    """Result of a query execution."""

    success: bool = Field(..., description="Whether query executed successfully")
    message: str = Field(..., description="Result message")
    rows: List[Dict[str, Any]] = Field(
        default_factory=list, description="Query result rows"
    )
    row_count: int = Field(default=0, description="Number of rows returned")
    columns: List[str] = Field(
        default_factory=list, description="Column names"
    )
    execution_time_ms: Optional[float] = Field(
        default=None, description="Query execution time in milliseconds"
    )
    error: Optional[str] = Field(default=None, description="Error message if failed")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Query executed successfully",
                "rows": [
                    {"id": 1, "name": "Example"},
                    {"id": 2, "name": "Data"}
                ],
                "row_count": 2,
                "columns": ["id", "name"],
                "execution_time_ms": 125.5,
                "error": None
            }
        }


class DatabaseListResult(BaseModel):
    """Result of listing databases."""

    success: bool = Field(..., description="Whether operation succeeded")
    databases: List[str] = Field(
        default_factory=list, description="List of database names"
    )
    message: str = Field(..., description="Operation message")
    error: Optional[str] = Field(default=None, description="Error message if failed")


class TableListResult(BaseModel):
    """Result of listing tables/collections."""

    success: bool = Field(..., description="Whether operation succeeded")
    tables: List[TableInfo] = Field(
        default_factory=list, description="List of table information"
    )
    message: str = Field(..., description="Operation message")
    error: Optional[str] = Field(default=None, description="Error message if failed")


class SampleDataResult(BaseModel):
    """Result of getting sample data."""

    success: bool = Field(..., description="Whether operation succeeded")
    table_name: str = Field(..., description="Table/collection name")
    sample_data: List[Dict[str, Any]] = Field(
        default_factory=list, description="Sample data rows"
    )
    sample_size: int = Field(default=0, description="Number of sample rows")
    total_count: Optional[int] = Field(
        default=None, description="Total number of rows/documents"
    )
    message: str = Field(..., description="Operation message")
    error: Optional[str] = Field(default=None, description="Error message if failed")


class ConnectionPoolStats(BaseModel):
    """Statistics about connection pool."""

    pool_size: int = Field(..., description="Current pool size")
    checked_out: int = Field(..., description="Connections checked out")
    available: int = Field(..., description="Available connections")
    max_size: int = Field(..., description="Maximum pool size")
    overflow: int = Field(..., description="Overflow connections")
