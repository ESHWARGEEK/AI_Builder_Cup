"""Firestore client singleton."""
from __future__ import annotations

from typing import Optional

import structlog
from google.cloud import firestore

from config import get_settings

logger = structlog.get_logger(__name__)
settings = get_settings()

_db: Optional[firestore.Client] = None


def init_firestore() -> None:
    """Initialize Firestore client."""
    global _db
    _db = firestore.Client(project=settings.gcp_project_id)
    logger.info("firestore.init.complete", project=settings.gcp_project_id)


def get_firestore_client() -> firestore.Client:
    """Return Firestore client, initializing if needed."""
    global _db
    if _db is None:
        _db = firestore.Client(project=settings.gcp_project_id)
    return _db
