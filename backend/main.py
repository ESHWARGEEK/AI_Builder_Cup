"""
EKA FastAPI Application Entry Point.

- CORS with strict origin allowlist
- Model Armor middleware for prompt injection defense
- OpenTelemetry tracing
- SSE endpoint for real-time streaming
- Graceful startup/shutdown of GCP clients
"""
from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from opentelemetry import trace
from opentelemetry.exporter.cloud_trace import CloudTraceSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

from api.routers import chat, documents, invoices, audit, health, compliance, proxy
from config import get_settings
from db.alloydb import init_alloydb, close_alloydb
from db.firestore import init_firestore
from middleware.model_armor import ModelArmorMiddleware
from middleware.request_id import RequestIDMiddleware

logger = structlog.get_logger(__name__)
settings = get_settings()


def configure_telemetry() -> None:
    """Configure OpenTelemetry with Cloud Trace exporter."""
    provider = TracerProvider()
    exporter = CloudTraceSpanExporter(project_id=settings.gcp_project_id)
    provider.add_span_processor(BatchSpanProcessor(exporter))
    trace.set_tracer_provider(provider)


def configure_logging() -> None:
    """Configure structured JSON logging via structlog."""
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(logging, settings.log_level.upper(), logging.INFO)
        ),
        logger_factory=structlog.PrintLoggerFactory(),
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle manager."""
    configure_logging()
    logger.info("eka.startup", environment=settings.environment)

    if settings.environment == "production":
        configure_telemetry()

    # Initialize persistent GCP clients
    await init_alloydb()
    init_firestore()

    logger.info("eka.startup.complete", service="EKA Backend")
    yield

    # Graceful shutdown
    await close_alloydb()
    logger.info("eka.shutdown.complete")


def create_app() -> FastAPI:
    """Application factory."""
    app = FastAPI(
        title="Enterprise Knowledge Assistant API",
        description="AP/Finance workflow automation with AAL-3 governance",
        version="1.0.0",
        docs_url="/api/docs" if settings.environment != "production" else None,
        redoc_url="/api/redoc" if settings.environment != "production" else None,
        openapi_url="/api/openapi.json" if settings.environment != "production" else None,
        lifespan=lifespan,
    )

    # ── Middleware (order matters — outermost = last executed) ────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
        expose_headers=["X-Request-ID", "X-Trace-ID"],
    )
    app.add_middleware(GZipMiddleware, minimum_size=1024)
    app.add_middleware(RequestIDMiddleware)

    if settings.model_armor_enabled:
        app.add_middleware(ModelArmorMiddleware)

    # ── Routers ───────────────────────────────────────────────────────────────
    app.include_router(health.router, prefix="/api/v1", tags=["Health"])
    app.include_router(chat.router, prefix="/api/v1", tags=["Chat / RAG"])
    app.include_router(documents.router, prefix="/api/v1", tags=["Documents"])
    app.include_router(invoices.router, prefix="/api/v1", tags=["Invoices"])
    app.include_router(audit.router, prefix="/api/v1", tags=["Audit"])
    app.include_router(compliance.router, prefix="/api/v1", tags=["Compliance"])
    app.include_router(proxy.router, prefix="/api/v1", tags=["Workspace Proxy"])

    # ── OpenTelemetry instrumentation ─────────────────────────────────────────
    FastAPIInstrumentor.instrument_app(app)

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=settings.api_port,
        log_level=settings.log_level.lower(),
        reload=settings.environment == "development",
        access_log=True,
    )
