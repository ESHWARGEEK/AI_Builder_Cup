"""AlloyDB async connection pool using Cloud SQL Python Connector."""
from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
from typing import AsyncIterator, Optional

import structlog
from google.cloud.sql.connector import AsyncConnector, IPTypes
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy import text

from config import get_settings

logger = structlog.get_logger(__name__)
settings = get_settings()

_connector: Optional[AsyncConnector] = None
_engine = None
_session_factory: Optional[async_sessionmaker] = None


async def _get_conn():
    """Create a new AlloyDB connection via Cloud SQL connector."""
    global _connector
    if _connector is None:
        _connector = AsyncConnector()

    conn = await _connector.connect(
        settings.alloydb_connection_name,
        "asyncpg",
        user=settings.alloydb_user,
        password=settings.alloydb_password.get_secret_value(),
        db=settings.alloydb_database,
        ip_type=IPTypes.PRIVATE,
    )
    return conn


async def init_alloydb() -> None:
    """Initialize AlloyDB connection pool."""
    global _engine, _session_factory

    logger.info("alloydb.init", connection=settings.alloydb_connection_name)

    _engine = create_async_engine(
        "postgresql+asyncpg://",
        async_creator=_get_conn,
        pool_size=settings.alloydb_pool_size,
        max_overflow=5,
        pool_pre_ping=True,
        echo=settings.environment == "development",
    )

    _session_factory = async_sessionmaker(
        bind=_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )

    # Verify connection
    async with _engine.connect() as conn:
        await conn.execute(text("SELECT 1"))

    logger.info("alloydb.init.complete")


async def close_alloydb() -> None:
    """Gracefully close AlloyDB connection pool."""
    global _engine, _connector
    if _engine:
        await _engine.dispose()
    if _connector:
        await _connector.close()
    logger.info("alloydb.closed")


@asynccontextmanager
async def get_alloydb_session() -> AsyncIterator[AsyncSession]:
    """Async context manager yielding an AlloyDB session."""
    if _session_factory is None:
        raise RuntimeError("AlloyDB not initialized. Call init_alloydb() first.")

    async with _session_factory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
