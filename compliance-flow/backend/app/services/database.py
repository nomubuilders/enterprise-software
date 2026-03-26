"""Database connector services for ComplianceFlow."""

import asyncio
import re
import time
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional, AsyncGenerator, Union

_VALID_IDENTIFIER = re.compile(r'^[a-zA-Z_][a-zA-Z0-9_]*$')

from sqlalchemy import text, inspect, MetaData, Table
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
)
from sqlalchemy.pool import NullPool, AsyncAdaptedQueuePool

# Try to import motor for MongoDB support (optional)
try:
    import motor.motor_asyncio
    MOTOR_AVAILABLE = True
except (ImportError, AttributeError) as e:
    MOTOR_AVAILABLE = False
    motor = None

from app.models.database import (
    DatabaseConfig,
    DatabaseType,
    ConnectionTestResult,
    TableInfo,
    ColumnInfo,
    QueryResult,
    DatabaseListResult,
    TableListResult,
    SampleDataResult,
    ConnectionPoolStats,
)


class PostgreSQLConnector:
    """PostgreSQL database connector with async support."""

    def __init__(self, config: DatabaseConfig):
        """Initialize PostgreSQL connector."""
        if config.type != DatabaseType.POSTGRESQL:
            raise ValueError("Config type must be POSTGRESQL")

        self.config = config
        self.engine: Optional[AsyncEngine] = None
        self.session_maker: Optional[async_sessionmaker] = None
        self._metadata: Optional[MetaData] = None

    async def initialize(self) -> None:
        """Initialize database engine and session factory."""
        try:
            self.engine = create_async_engine(
                self.config.get_connection_string(),
                echo=False,
                poolclass=AsyncAdaptedQueuePool,
                pool_size=self.config.pool_size,
                max_overflow=self.config.max_overflow,
                connect_args={
                    "timeout": self.config.connection_timeout,
                    "command_timeout": self.config.query_timeout,
                    "ssl": "require" if self.config.ssl else None,
                },
            )
            self.session_maker = async_sessionmaker(
                self.engine, class_=AsyncSession, expire_on_commit=False
            )
        except Exception as e:
            raise RuntimeError(f"Failed to initialize PostgreSQL engine: {str(e)}")

    async def close(self) -> None:
        """Close database connection."""
        if self.engine:
            await self.engine.dispose()
            self.engine = None
            self.session_maker = None

    async def test_connection(self) -> ConnectionTestResult:
        """Test database connection."""
        start_time = time.time()
        try:
            if not self.engine:
                await self.initialize()

            async with self.engine.connect() as connection:
                result = await connection.execute(text("SELECT version()"))
                version = result.scalar()

            latency_ms = (time.time() - start_time) * 1000
            return ConnectionTestResult(
                success=True,
                message="PostgreSQL connection successful",
                database_version=version,
                latency_ms=latency_ms,
            )
        except Exception as e:
            return ConnectionTestResult(
                success=False,
                message="PostgreSQL connection failed",
                error=str(e),
            )

    async def list_databases(self) -> DatabaseListResult:
        """List all databases."""
        try:
            if not self.session_maker:
                await self.initialize()

            async with self.session_maker() as session:
                result = await session.execute(
                    text("SELECT datname FROM pg_database WHERE datistemplate = false")
                )
                databases = [row[0] for row in result.fetchall()]

            return DatabaseListResult(
                success=True,
                databases=databases,
                message=f"Found {len(databases)} databases",
            )
        except Exception as e:
            return DatabaseListResult(
                success=False,
                databases=[],
                message="Failed to list databases",
                error=str(e),
            )

    async def list_tables(self) -> TableListResult:
        """List all tables with schema information."""
        try:
            if not self.session_maker:
                await self.initialize()

            tables_info = []

            async with self.session_maker() as session:
                # Get table list
                result = await session.execute(
                    text("""
                        SELECT table_name FROM information_schema.tables
                        WHERE table_schema = 'public'
                    """)
                )
                table_names = [row[0] for row in result.fetchall()]

                # Get detailed info for each table
                for table_name in table_names:
                    table_info = await self._get_table_info(session, table_name)
                    if table_info:
                        tables_info.append(table_info)

            return TableListResult(
                success=True,
                tables=tables_info,
                message=f"Found {len(tables_info)} tables",
            )
        except Exception as e:
            return TableListResult(
                success=False,
                tables=[],
                message="Failed to list tables",
                error=str(e),
            )

    @staticmethod
    def _validate_identifier(name: str) -> str:
        """Validate a SQL identifier to prevent injection."""
        if not _VALID_IDENTIFIER.match(name):
            raise ValueError(f"Invalid SQL identifier: {name}")
        return name

    async def _get_table_info(self, session: AsyncSession, table_name: str) -> Optional[TableInfo]:
        """Get detailed information about a specific table."""
        try:
            self._validate_identifier(table_name)

            # Get column information
            columns_result = await session.execute(
                text("""
                    SELECT
                        column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = :table_name
                    ORDER BY ordinal_position
                """).bindparams(table_name=table_name)
            )

            columns = []
            for row in columns_result.fetchall():
                col_name, data_type, is_nullable, default = row
                columns.append(
                    ColumnInfo(
                        name=col_name,
                        type=data_type,
                        nullable=is_nullable == "YES",
                        default=default,
                    )
                )

            # Get primary keys
            pk_result = await session.execute(
                text("""
                    SELECT a.attname
                    FROM pg_index i
                    JOIN pg_attribute a ON a.attrelid = i.indrelid
                    AND a.attnum = ANY(i.indkey)
                    JOIN pg_class t ON t.oid = i.indrelid
                    WHERE t.relname = :table_name AND i.indisprimary
                """).bindparams(table_name=table_name)
            )
            pk_columns = {row[0] for row in pk_result.fetchall()}

            for col in columns:
                if col.name in pk_columns:
                    col.primary_key = True

            # Get row count (identifier validated above, safe for quoting)
            count_result = await session.execute(text(f'SELECT COUNT(*) FROM public."{table_name}"'))
            row_count = count_result.scalar()

            # Get indexes
            indexes_result = await session.execute(
                text("""
                    SELECT indexname FROM pg_indexes
                    WHERE tablename = :table_name
                """).bindparams(table_name=table_name)
            )
            indexes = [row[0] for row in indexes_result.fetchall()]

            return TableInfo(
                name=table_name,
                type="table",
                row_count=row_count,
                columns=columns,
                indexes=indexes,
            )
        except Exception:
            return None

    async def execute_query(self, query: str, limit: int = 1000) -> QueryResult:
        """Execute a SELECT query safely."""
        # Strip trailing semicolon (LLMs always add one) then strip comments
        query = query.strip().rstrip(';').strip()
        cleaned = re.sub(r'/\*.*?\*/', '', query, flags=re.DOTALL)
        cleaned = re.sub(r'--.*$', '', cleaned, flags=re.MULTILINE)
        cleaned_upper = cleaned.strip().upper()

        # Reject non-SELECT queries
        if not cleaned_upper.startswith("SELECT"):
            return QueryResult(
                success=False,
                message="Only SELECT queries are allowed",
                error="Query must start with SELECT",
            )

        # Reject statement stacking (semicolons after stripping trailing one)
        if ';' in cleaned:
            return QueryResult(
                success=False,
                message="Multiple statements are not allowed",
                error="Query must not contain semicolons",
            )

        start_time = time.time()
        try:
            if not self.session_maker:
                await self.initialize()

            # Add LIMIT if not present
            if "LIMIT" not in cleaned_upper:
                query += f" LIMIT {limit}"

            async with self.session_maker() as session:
                result = await session.execute(text(query))
                rows = result.fetchall()
                columns = list(result.keys())

                # Convert rows to dictionaries
                rows_data = [
                    {col: value for col, value in zip(columns, row)}
                    for row in rows
                ]

            execution_time = (time.time() - start_time) * 1000
            return QueryResult(
                success=True,
                message=f"Query executed successfully",
                rows=rows_data,
                row_count=len(rows_data),
                columns=columns,
                execution_time_ms=execution_time,
            )
        except Exception as e:
            return QueryResult(
                success=False,
                message="Query execution failed",
                error=str(e),
            )

    async def get_sample_data(
        self, table_name: str, sample_size: int = 100
    ) -> SampleDataResult:
        """Get sample data from a table."""
        try:
            self._validate_identifier(table_name)
            sample_size = min(max(int(sample_size), 1), 10000)

            if not self.session_maker:
                await self.initialize()

            async with self.session_maker() as session:
                # Get total count (identifier validated above)
                count_result = await session.execute(
                    text(f'SELECT COUNT(*) FROM public."{table_name}"')
                )
                total_count = count_result.scalar()

                # Get sample data (identifier validated, sample_size is int)
                query = f'SELECT * FROM public."{table_name}" LIMIT {sample_size}'
                result = await session.execute(text(query))
                rows = result.fetchall()
                columns = list(result.keys())

                sample_data = [
                    {col: value for col, value in zip(columns, row)}
                    for row in rows
                ]

            return SampleDataResult(
                success=True,
                table_name=table_name,
                sample_data=sample_data,
                sample_size=len(sample_data),
                total_count=total_count,
                message=f"Retrieved {len(sample_data)} sample rows",
            )
        except Exception as e:
            return SampleDataResult(
                success=False,
                table_name=table_name,
                message="Failed to get sample data",
                error=str(e),
            )

    async def get_pool_stats(self) -> ConnectionPoolStats:
        """Get connection pool statistics."""
        try:
            if not self.engine:
                return ConnectionPoolStats(
                    pool_size=0,
                    checked_out=0,
                    available=0,
                    max_size=self.config.pool_size,
                    overflow=0,
                )

            pool = self.engine.pool
            pool_size = pool.size() if hasattr(pool, "size") else 0
            checked_out = pool.checkedout() if hasattr(pool, "checkedout") else 0

            return ConnectionPoolStats(
                pool_size=pool_size,
                checked_out=checked_out,
                available=pool_size - checked_out,
                max_size=self.config.pool_size,
                overflow=self.config.max_overflow,
            )
        except Exception:
            return ConnectionPoolStats(
                pool_size=0,
                checked_out=0,
                available=0,
                max_size=self.config.pool_size,
                overflow=self.config.max_overflow,
            )


class MySQLConnector:
    """MySQL database connector with async support."""

    def __init__(self, config: DatabaseConfig):
        """Initialize MySQL connector."""
        if config.type != DatabaseType.MYSQL:
            raise ValueError("Config type must be MYSQL")

        self.config = config
        self.engine: Optional[AsyncEngine] = None
        self.session_maker: Optional[async_sessionmaker] = None

    async def initialize(self) -> None:
        """Initialize database engine and session factory."""
        try:
            self.engine = create_async_engine(
                self.config.get_connection_string(),
                echo=False,
                poolclass=AsyncAdaptedQueuePool,
                pool_size=self.config.pool_size,
                max_overflow=self.config.max_overflow,
                connect_args={
                    "connect_timeout": self.config.connection_timeout,
                },
            )
            self.session_maker = async_sessionmaker(
                self.engine, class_=AsyncSession, expire_on_commit=False
            )
        except Exception as e:
            raise RuntimeError(f"Failed to initialize MySQL engine: {str(e)}")

    async def close(self) -> None:
        """Close database connection."""
        if self.engine:
            await self.engine.dispose()
            self.engine = None
            self.session_maker = None

    async def test_connection(self) -> ConnectionTestResult:
        """Test database connection."""
        start_time = time.time()
        try:
            if not self.engine:
                await self.initialize()

            async with self.engine.connect() as connection:
                result = await connection.execute(text("SELECT VERSION()"))
                version = result.scalar()

            latency_ms = (time.time() - start_time) * 1000
            return ConnectionTestResult(
                success=True,
                message="MySQL connection successful",
                database_version=version,
                latency_ms=latency_ms,
            )
        except Exception as e:
            return ConnectionTestResult(
                success=False,
                message="MySQL connection failed",
                error=str(e),
            )

    async def list_databases(self) -> DatabaseListResult:
        """List all databases."""
        try:
            if not self.session_maker:
                await self.initialize()

            async with self.session_maker() as session:
                result = await session.execute(text("SHOW DATABASES"))
                databases = [row[0] for row in result.fetchall()]

            return DatabaseListResult(
                success=True,
                databases=databases,
                message=f"Found {len(databases)} databases",
            )
        except Exception as e:
            return DatabaseListResult(
                success=False,
                databases=[],
                message="Failed to list databases",
                error=str(e),
            )

    async def list_tables(self) -> TableListResult:
        """List all tables with schema information."""
        try:
            if not self.session_maker:
                await self.initialize()

            tables_info = []

            async with self.session_maker() as session:
                # Get table list
                db_name = PostgreSQLConnector._validate_identifier(self.config.database)
                result = await session.execute(
                    text(f"SHOW TABLES FROM `{db_name}`")
                )
                table_names = [row[0] for row in result.fetchall()]

                # Get detailed info for each table
                for table_name in table_names:
                    table_info = await self._get_table_info(session, table_name)
                    if table_info:
                        tables_info.append(table_info)

            return TableListResult(
                success=True,
                tables=tables_info,
                message=f"Found {len(tables_info)} tables",
            )
        except Exception as e:
            return TableListResult(
                success=False,
                tables=[],
                message="Failed to list tables",
                error=str(e),
            )

    async def _get_table_info(self, session: AsyncSession, table_name: str) -> Optional[TableInfo]:
        """Get detailed information about a specific table."""
        try:
            PostgreSQLConnector._validate_identifier(table_name)
            db_name = PostgreSQLConnector._validate_identifier(self.config.database)

            # Get column information
            columns_result = await session.execute(
                text(f"DESCRIBE `{db_name}`.`{table_name}`")
            )

            columns = []
            for row in columns_result.fetchall():
                col_name, col_type, nullable, key, default, extra = row
                columns.append(
                    ColumnInfo(
                        name=col_name,
                        type=col_type,
                        nullable=nullable == "YES",
                        primary_key=key == "PRI",
                        default=default,
                    )
                )

            # Get row count and table size
            count_result = await session.execute(
                text(f"SELECT COUNT(*) FROM `{db_name}`.`{table_name}`")
            )
            row_count = count_result.scalar()

            # Get indexes
            indexes_result = await session.execute(
                text(f"SHOW INDEXES FROM `{db_name}`.`{table_name}`")
            )
            indexes = list(set(row[2] for row in indexes_result.fetchall()))

            return TableInfo(
                name=table_name,
                type="table",
                row_count=row_count,
                columns=columns,
                indexes=indexes,
            )
        except Exception:
            return None

    async def execute_query(self, query: str, limit: int = 1000) -> QueryResult:
        """Execute a SELECT query safely."""
        # Strip trailing semicolon (LLMs always add one) then strip comments
        query = query.strip().rstrip(';').strip()
        cleaned = re.sub(r'/\*.*?\*/', '', query, flags=re.DOTALL)
        cleaned = re.sub(r'--.*$', '', cleaned, flags=re.MULTILINE)
        cleaned_upper = cleaned.strip().upper()

        if not cleaned_upper.startswith("SELECT"):
            return QueryResult(
                success=False,
                message="Only SELECT queries are allowed",
                error="Query must start with SELECT",
            )

        # Reject statement stacking (semicolons after stripping trailing one)
        if ';' in cleaned:
            return QueryResult(
                success=False,
                message="Multiple statements are not allowed",
                error="Query must not contain semicolons",
            )

        start_time = time.time()
        try:
            if not self.session_maker:
                await self.initialize()

            # Add LIMIT if not present
            if "LIMIT" not in cleaned_upper:
                query += f" LIMIT {limit}"

            async with self.session_maker() as session:
                result = await session.execute(text(query))
                rows = result.fetchall()
                columns = list(result.keys())

                rows_data = [
                    {col: value for col, value in zip(columns, row)}
                    for row in rows
                ]

            execution_time = (time.time() - start_time) * 1000
            return QueryResult(
                success=True,
                message="Query executed successfully",
                rows=rows_data,
                row_count=len(rows_data),
                columns=columns,
                execution_time_ms=execution_time,
            )
        except Exception as e:
            return QueryResult(
                success=False,
                message="Query execution failed",
                error=str(e),
            )

    async def get_sample_data(
        self, table_name: str, sample_size: int = 100
    ) -> SampleDataResult:
        """Get sample data from a table."""
        try:
            PostgreSQLConnector._validate_identifier(table_name)
            db_name = PostgreSQLConnector._validate_identifier(self.config.database)
            sample_size = min(max(int(sample_size), 1), 10000)

            if not self.session_maker:
                await self.initialize()

            async with self.session_maker() as session:
                # Get total count
                count_result = await session.execute(
                    text(f"SELECT COUNT(*) FROM `{db_name}`.`{table_name}`")
                )
                total_count = count_result.scalar()

                # Get sample data
                query = f"SELECT * FROM `{db_name}`.`{table_name}` LIMIT {sample_size}"
                result = await session.execute(text(query))
                rows = result.fetchall()
                columns = list(result.keys())

                sample_data = [
                    {col: value for col, value in zip(columns, row)}
                    for row in rows
                ]

            return SampleDataResult(
                success=True,
                table_name=table_name,
                sample_data=sample_data,
                sample_size=len(sample_data),
                total_count=total_count,
                message=f"Retrieved {len(sample_data)} sample rows",
            )
        except Exception as e:
            return SampleDataResult(
                success=False,
                table_name=table_name,
                message="Failed to get sample data",
                error=str(e),
            )

    async def get_pool_stats(self) -> ConnectionPoolStats:
        """Get connection pool statistics."""
        try:
            if not self.engine:
                return ConnectionPoolStats(
                    pool_size=0,
                    checked_out=0,
                    available=0,
                    max_size=self.config.pool_size,
                    overflow=0,
                )

            pool = self.engine.pool
            pool_size = pool.size() if hasattr(pool, "size") else 0
            checked_out = pool.checkedout() if hasattr(pool, "checkedout") else 0

            return ConnectionPoolStats(
                pool_size=pool_size,
                checked_out=checked_out,
                available=pool_size - checked_out,
                max_size=self.config.pool_size,
                overflow=self.config.max_overflow,
            )
        except Exception:
            return ConnectionPoolStats(
                pool_size=0,
                checked_out=0,
                available=0,
                max_size=self.config.pool_size,
                overflow=self.config.max_overflow,
            )


class MongoDBConnector:
    """MongoDB database connector with async support."""

    def __init__(self, config: DatabaseConfig):
        """Initialize MongoDB connector."""
        if not MOTOR_AVAILABLE:
            raise RuntimeError("MongoDB support not available - motor library failed to load")
        if config.type != DatabaseType.MONGODB:
            raise ValueError("Config type must be MONGODB")

        self.config = config
        self.client: Optional[Any] = None  # motor.motor_asyncio.AsyncClient
        self.db: Optional[Any] = None  # motor.motor_asyncio.AsyncDatabase

    async def initialize(self) -> None:
        """Initialize MongoDB client and database."""
        if not MOTOR_AVAILABLE:
            raise RuntimeError("MongoDB support not available")
        try:
            self.client = motor.motor_asyncio.AsyncIOMotorClient(
                self.config.host,
                self.config.port,
                serverSelectionTimeoutMS=self.config.connection_timeout * 1000,
            )
            self.db = self.client[self.config.database]
        except Exception as e:
            raise RuntimeError(f"Failed to initialize MongoDB client: {str(e)}")

    async def close(self) -> None:
        """Close MongoDB connection."""
        if self.client:
            self.client.close()
            self.client = None
            self.db = None

    async def test_connection(self) -> ConnectionTestResult:
        """Test database connection."""
        start_time = time.time()
        try:
            if not self.client:
                await self.initialize()

            # Test connection with ping
            await self.client.admin.command("ping")

            # Get server info
            server_info = await self.client.server_info()
            version = server_info.get("version", "unknown")

            latency_ms = (time.time() - start_time) * 1000
            return ConnectionTestResult(
                success=True,
                message="MongoDB connection successful",
                database_version=version,
                latency_ms=latency_ms,
            )
        except Exception as e:
            return ConnectionTestResult(
                success=False,
                message="MongoDB connection failed",
                error=str(e),
            )

    async def list_databases(self) -> DatabaseListResult:
        """List all databases."""
        try:
            if not self.client:
                await self.initialize()

            database_names = await self.client.list_database_names()

            return DatabaseListResult(
                success=True,
                databases=database_names,
                message=f"Found {len(database_names)} databases",
            )
        except Exception as e:
            return DatabaseListResult(
                success=False,
                databases=[],
                message="Failed to list databases",
                error=str(e),
            )

    async def list_tables(self) -> TableListResult:
        """List all collections with information."""
        try:
            if not self.db:
                await self.initialize()

            tables_info = []
            collection_names = await self.db.list_collection_names()

            for collection_name in collection_names:
                table_info = await self._get_collection_info(collection_name)
                if table_info:
                    tables_info.append(table_info)

            return TableListResult(
                success=True,
                tables=tables_info,
                message=f"Found {len(tables_info)} collections",
            )
        except Exception as e:
            return TableListResult(
                success=False,
                tables=[],
                message="Failed to list collections",
                error=str(e),
            )

    async def _get_collection_info(self, collection_name: str) -> Optional[TableInfo]:
        """Get detailed information about a specific collection."""
        try:
            collection = self.db[collection_name]

            # Get document count
            row_count = await collection.count_documents({})

            # Get collection statistics
            stats = await self.db.command("collStats", collection_name)
            size_bytes = stats.get("size", 0)

            # Get indexes
            indexes = await collection.list_indexes()
            index_names = [idx.get("name", "") for idx in await indexes.to_list(None)]

            # Get sample documents to infer schema
            sample_docs = await collection.find().limit(1).to_list(1)
            columns = []
            if sample_docs:
                sample_doc = sample_docs[0]
                for key in sample_doc.keys():
                    if key != "_id":
                        value_type = type(sample_doc[key]).__name__
                        columns.append(
                            ColumnInfo(
                                name=key,
                                type=value_type,
                                nullable=True,
                            )
                        )

            return TableInfo(
                name=collection_name,
                type="collection",
                row_count=row_count,
                size_bytes=size_bytes,
                columns=columns,
                indexes=index_names,
            )
        except Exception:
            return None

    async def execute_query(self, query: str, limit: int = 1000) -> QueryResult:
        """Execute a MongoDB aggregation query safely."""
        start_time = time.time()
        try:
            if not self.db:
                await self.initialize()

            # For MongoDB, we expect a JSON-like query format
            # This is a simplified implementation - real production would use proper parsing
            import json

            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                return QueryResult(
                    success=False,
                    message="Invalid JSON query",
                    error="Query must be valid JSON format",
                )

            # Ensure aggregation pipeline doesn't have unbounded results
            if isinstance(query_dict, list):
                pipeline = query_dict
            else:
                return QueryResult(
                    success=False,
                    message="Query must be an aggregation pipeline array",
                    error="Query format error",
                )

            # Add limit stage if not present
            has_limit = any("$limit" in stage for stage in pipeline)
            if not has_limit:
                pipeline.append({"$limit": limit})

            # Get collection name from context or use a default
            # This is a simplified approach
            collection_names = await self.db.list_collection_names()
            if not collection_names:
                return QueryResult(
                    success=False,
                    message="No collections found",
                    error="Database appears to be empty",
                )

            collection = self.db[collection_names[0]]
            rows = await collection.aggregate(pipeline).to_list(limit)

            # Convert ObjectId to string for JSON serialization
            rows_data = []
            for row in rows:
                row_dict = {}
                for key, value in row.items():
                    if str(type(value).__name__) == "ObjectId":
                        row_dict[key] = str(value)
                    else:
                        row_dict[key] = value
                rows_data.append(row_dict)

            columns = list(rows_data[0].keys()) if rows_data else []
            execution_time = (time.time() - start_time) * 1000

            return QueryResult(
                success=True,
                message="Query executed successfully",
                rows=rows_data,
                row_count=len(rows_data),
                columns=columns,
                execution_time_ms=execution_time,
            )
        except Exception as e:
            return QueryResult(
                success=False,
                message="Query execution failed",
                error=str(e),
            )

    async def get_sample_data(
        self, table_name: str, sample_size: int = 100
    ) -> SampleDataResult:
        """Get sample data from a collection."""
        try:
            if not self.db:
                await self.initialize()

            collection = self.db[table_name]

            # Get total count
            total_count = await collection.count_documents({})

            # Get sample data
            sample_docs = await collection.find().limit(sample_size).to_list(sample_size)

            # Convert ObjectId to string
            sample_data = []
            for doc in sample_docs:
                doc_dict = {}
                for key, value in doc.items():
                    if str(type(value).__name__) == "ObjectId":
                        doc_dict[key] = str(value)
                    else:
                        doc_dict[key] = value
                sample_data.append(doc_dict)

            return SampleDataResult(
                success=True,
                table_name=table_name,
                sample_data=sample_data,
                sample_size=len(sample_data),
                total_count=total_count,
                message=f"Retrieved {len(sample_data)} sample documents",
            )
        except Exception as e:
            return SampleDataResult(
                success=False,
                table_name=table_name,
                message="Failed to get sample data",
                error=str(e),
            )

    async def get_pool_stats(self) -> ConnectionPoolStats:
        """Get connection pool statistics (MongoDB driver specific)."""
        try:
            if not self.client:
                return ConnectionPoolStats(
                    pool_size=0,
                    checked_out=0,
                    available=0,
                    max_size=self.config.pool_size,
                    overflow=0,
                )

            # Motor/PyMongo doesn't expose pool stats directly
            # Return basic configuration info
            return ConnectionPoolStats(
                pool_size=self.config.pool_size,
                checked_out=0,
                available=self.config.pool_size,
                max_size=self.config.pool_size,
                overflow=0,
            )
        except Exception:
            return ConnectionPoolStats(
                pool_size=0,
                checked_out=0,
                available=0,
                max_size=self.config.pool_size,
                overflow=0,
            )


class DatabaseConnectorFactory:
    """Factory for creating appropriate database connectors."""

    _connectors: Dict[DatabaseType, type] = {
        DatabaseType.POSTGRESQL: PostgreSQLConnector,
        DatabaseType.MYSQL: MySQLConnector,
        DatabaseType.MONGODB: MongoDBConnector,
    }

    @classmethod
    def create(
        cls, config: DatabaseConfig
    ) -> Union[PostgreSQLConnector, MySQLConnector, MongoDBConnector]:
        """Create a connector based on configuration."""
        connector_class = cls._connectors.get(config.type)
        if not connector_class:
            raise ValueError(f"Unsupported database type: {config.type}")

        return connector_class(config)

    @classmethod
    def register_connector(cls, db_type: DatabaseType, connector_class: type) -> None:
        """Register a custom connector."""
        cls._connectors[db_type] = connector_class


class DatabaseConnectorService:
    """High-level service for database operations."""

    def __init__(self, config: DatabaseConfig):
        """Initialize the database connector service."""
        self.config = config
        self.connector = DatabaseConnectorFactory.create(config)

    async def __aenter__(self):
        """Async context manager entry."""
        await self.connector.initialize()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.connector.close()

    @asynccontextmanager
    async def get_connector(self):
        """Get a connector context manager."""
        try:
            if not hasattr(self.connector, "engine") or self.connector.engine is None:
                if not hasattr(self.connector, "client") or self.connector.client is None:
                    await self.connector.initialize()
            yield self.connector
        except Exception as e:
            raise RuntimeError(f"Failed to get connector: {str(e)}")
        finally:
            # Don't close here - let caller manage lifetime
            pass

    async def test_connection(self) -> ConnectionTestResult:
        """Test the database connection."""
        return await self.connector.test_connection()

    async def list_databases(self) -> DatabaseListResult:
        """List all databases."""
        async with self.get_connector() as connector:
            return await connector.list_databases()

    async def list_tables(self) -> TableListResult:
        """List all tables/collections."""
        async with self.get_connector() as connector:
            return await connector.list_tables()

    async def execute_query(self, query: str, limit: int = 1000) -> QueryResult:
        """Execute a SELECT query."""
        async with self.get_connector() as connector:
            return await connector.execute_query(query, limit)

    async def get_sample_data(
        self, table_name: str, sample_size: int = 100
    ) -> SampleDataResult:
        """Get sample data from a table/collection."""
        async with self.get_connector() as connector:
            return await connector.get_sample_data(table_name, sample_size)

    async def get_pool_stats(self) -> ConnectionPoolStats:
        """Get connection pool statistics."""
        async with self.get_connector() as connector:
            return await connector.get_pool_stats()

    async def close(self) -> None:
        """Close the connection."""
        await self.connector.close()
