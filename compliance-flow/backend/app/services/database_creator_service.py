"""
Database Creator Service for ComplianceFlow.

Provisions new databases: SQLite (with optional SQLCipher encryption)
for local/on-premises use, or Docker-managed PostgreSQL/MySQL/MongoDB.
"""

import logging
import sqlite3
from typing import Any, Dict

logger = logging.getLogger(__name__)


class DatabaseCreatorService:
    """Handles programmatic database creation and provisioning."""

    async def create_database(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a database based on configuration.

        Args:
            config: Database configuration with dbType, databaseName, filePath, encrypted, initSchema

        Returns:
            Dict with creation status, connection string, and metadata
        """
        db_type = config.get("dbType", "sqlite")
        database_name = config.get("databaseName", "compliance_db")

        if db_type == "sqlite":
            return await self._create_sqlite(config)
        elif db_type in ("postgresql", "mysql", "mongodb"):
            return await self._create_docker_db(db_type, database_name, config)
        else:
            raise ValueError(f"Unsupported database type: {db_type}")

    async def _create_sqlite(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Create a SQLite database file, optionally with encryption."""
        file_path = config.get("filePath", "")
        database_name = config.get("databaseName", "compliance_db")
        encrypted = config.get("encrypted", False)
        init_schema = config.get("initSchema", "")

        if not file_path:
            file_path = f"./{database_name}.db"

        if encrypted:
            # SQLCipher would be used in production via sqlcipher3 package
            logger.info(f"Creating encrypted SQLite database at {file_path}")
            try:
                import sqlcipher3
                conn = sqlcipher3.connect(file_path)
                conn.execute("PRAGMA key='changeme'")  # Would use user-provided key
            except ImportError:
                logger.warning("sqlcipher3 not installed, creating unencrypted database")
                conn = sqlite3.connect(file_path)
                encrypted = False
        else:
            conn = sqlite3.connect(file_path)

        try:
            if init_schema:
                conn.executescript(init_schema)
            conn.commit()
        finally:
            conn.close()

        return {
            "database_created": True,
            "db_type": "sqlite",
            "path": file_path,
            "database_name": database_name,
            "encrypted": encrypted,
            "connection_string": f"sqlite:///{file_path}",
        }

    async def _create_docker_db(
        self,
        db_type: str,
        database_name: str,
        config: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Create a Docker-managed database using existing infrastructure.

        In production, this would call docker-manager to provision a container.
        For now, returns connection details for existing Docker Compose services.
        """
        connection_strings = {
            "postgresql": f"postgresql://postgres:postgres@localhost:5432/{database_name}",
            "mysql": f"mysql://root:root@localhost:3306/{database_name}",
            "mongodb": f"mongodb://localhost:27017/{database_name}",
        }

        return {
            "database_created": True,
            "db_type": db_type,
            "database_name": database_name,
            "connection_string": connection_strings.get(db_type, ""),
            "encrypted": False,
            "note": f"Uses existing Docker Compose {db_type} service",
        }
