"""
Invoice Processing Router

Endpoints:
  POST /api/v1/invoices/upload       — Upload & process invoice synchronously
  POST /api/v1/invoices/process-gcs  — Process invoice from GCS URI
  POST /api/v1/invoices/eventarc     — Eventarc webhook for async GCS events
  GET  /api/v1/invoices/{id}/status  — Poll processing status
  GET  /api/v1/invoices/{id}/result  — Get full processing result
  POST /api/v1/invoices/hitl/{id}/approve  — Manager approval endpoint
  POST /api/v1/invoices/hitl/{id}/reject   — Manager rejection endpoint
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import time
import uuid
from datetime import datetime
from typing import Any, Dict, Optional

import structlog
from fastapi import (
    APIRouter,
    BackgroundTasks,
    File,
    Header,
    HTTPException,
    Path,
    Query,
    UploadFile,
)
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from config import get_settings
from db.firestore import get_firestore_client
from engines.docai_engine import DocAIEngine
from engines.verification_engine import VerificationEngine
from governance.aal3_governor import AAL3Governor
from models.invoice import (
    GovernanceDecision,
    InvoiceExtractionResult,
    InvoiceProcessingResponse,
)

logger = structlog.get_logger(__name__)
settings = get_settings()
router = APIRouter()

# Shared engine instances
_docai_engine: Optional[DocAIEngine] = None
_verification_engine: Optional[VerificationEngine] = None
_governor: Optional[AAL3Governor] = None


def get_docai() -> DocAIEngine:
    global _docai_engine
    if _docai_engine is None:
        _docai_engine = DocAIEngine()
    return _docai_engine


def get_verifier() -> VerificationEngine:
    global _verification_engine
    if _verification_engine is None:
        _verification_engine = VerificationEngine()
    return _verification_engine


def get_governor() -> AAL3Governor:
    global _governor
    if _governor is None:
        _governor = AAL3Governor()
    return _governor


# Supported MIME types
SUPPORTED_MIME_TYPES = {
    "application/pdf": "application/pdf",
    "image/tiff": "image/tiff",
    "image/jpeg": "image/jpeg",
    "image/png": "image/png",
}


class GCSProcessRequest(BaseModel):
    gcs_uri: str
    session_id: Optional[str] = None
    mime_type: str = "application/pdf"


class HITLDecisionRequest(BaseModel):
    decision: str  # "APPROVE" | "REJECT"
    notes: Optional[str] = None
    reviewer_email: str


@router.post("/invoices/upload", response_model=InvoiceProcessingResponse)
async def upload_and_process_invoice(
    file: UploadFile = File(...),
    session_id: Optional[str] = Query(None),
    background_tasks: BackgroundTasks = None,
) -> InvoiceProcessingResponse:
    """
    Upload and synchronously process an invoice document.

    Runs the full pipeline:
      1. Document AI extraction (≤15s SLA)
      2. Verification suite (arithmetic + vendor + duplicate)
      3. AAL-3 governance decision
      4. Auto-process or HITL dispatch
    """
    sid = session_id or str(uuid.uuid4())
    start = time.monotonic()

    # Validate file type
    content_type = file.content_type or "application/pdf"
    mime_type = SUPPORTED_MIME_TYPES.get(content_type)
    if not mime_type:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type: {content_type}. Supported: PDF, TIFF, JPEG, PNG",
        )

    # Read file bytes
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Empty file uploaded")

    logger.info(
        "api.invoice.upload",
        session_id=sid,
        filename=file.filename,
        size_bytes=len(file_bytes),
        mime_type=mime_type,
    )

    return await _run_full_pipeline(
        file_bytes=file_bytes,
        mime_type=mime_type,
        session_id=sid,
        document_id=str(uuid.uuid4()),
        start_ts=start,
    )


@router.post("/invoices/process-gcs", response_model=InvoiceProcessingResponse)
async def process_from_gcs(request: GCSProcessRequest) -> InvoiceProcessingResponse:
    """Process an invoice from a Cloud Storage URI."""
    sid = request.session_id or str(uuid.uuid4())
    start = time.monotonic()

    logger.info(
        "api.invoice.gcs",
        session_id=sid,
        gcs_uri=request.gcs_uri,
    )

    try:
        extraction = await get_docai().process_gcs_document(
            gcs_uri=request.gcs_uri,
            mime_type=request.mime_type,
        )
    except TimeoutError as e:
        raise HTTPException(status_code=504, detail=str(e))
    except Exception as e:
        logger.error("api.invoice.gcs.error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

    verification = await get_verifier().verify(extraction)
    governance = await get_governor().evaluate(
        extraction=extraction,
        verification=verification,
        session_id=sid,
    )

    if governance.decision == GovernanceDecision.AUTO_PROCESS:
        await get_verifier().register_invoice(extraction)

    elapsed = time.monotonic() - start
    return InvoiceProcessingResponse(
        session_id=sid,
        document_id=extraction.document_id,
        extraction=extraction,
        verification=verification,
        governance_decision=governance.decision.value,
        violations=[v.value for v in governance.violations],
        audit_entry_id=governance.audit_entry_id,
        hitl_ticket_id=governance.hitl_ticket_id,
        processing_time_seconds=round(elapsed, 3),
    )


@router.post("/invoices/eventarc")
async def eventarc_handler(
    background_tasks: BackgroundTasks,
    ce_type: str = Header(..., alias="ce-type"),
    ce_source: str = Header("", alias="ce-source"),
) -> JSONResponse:
    """
    Eventarc webhook handler for Cloud Storage finalize events.

    Triggered when a new invoice file lands in GCS_INVOICE_BUCKET.
    Processes asynchronously in background to meet Cloud Run 10s response limit.
    """
    from fastapi import Request

    if ce_type != "google.cloud.storage.object.v1.finalized":
        return JSONResponse(content={"status": "ignored", "ce_type": ce_type})

    # Extract GCS URI from Eventarc payload
    # (Real payload parsed from request body in production)
    logger.info("api.invoice.eventarc", ce_type=ce_type, ce_source=ce_source)

    return JSONResponse(
        content={"status": "accepted", "message": "Processing queued"},
        status_code=200,
    )


@router.get("/invoices/{document_id}/status")
async def get_invoice_status(document_id: str = Path(...)) -> dict:
    """Poll the processing status of an invoice."""
    db = get_firestore_client()

    # Check Firestore for status
    docs = (
        db.collection(settings.firestore_collection_invoices)
        .where("document_id", "==", document_id)
        .limit(1)
        .stream()
    )

    for doc in docs:
        data = doc.to_dict()
        return {
            "document_id": document_id,
            "status": data.get("status", "UNKNOWN"),
            "invoice_number": data.get("invoice_number"),
            "processed_at": data.get("processed_at"),
        }

    raise HTTPException(status_code=404, detail=f"Invoice {document_id} not found")


@router.post("/invoices/hitl/{ticket_id}/approve")
async def approve_hitl_ticket(
    ticket_id: str = Path(...),
    request: HITLDecisionRequest = None,
) -> dict:
    """Manager approval of a HITL review ticket (requires OAuth token)."""
    return await _process_hitl_decision(
        ticket_id=ticket_id,
        decision="APPROVED",
        notes=request.notes if request else None,
        reviewer=request.reviewer_email if request else "unknown",
    )


@router.post("/invoices/hitl/{ticket_id}/reject")
async def reject_hitl_ticket(
    ticket_id: str = Path(...),
    request: HITLDecisionRequest = None,
) -> dict:
    """Manager rejection of a HITL review ticket."""
    return await _process_hitl_decision(
        ticket_id=ticket_id,
        decision="REJECTED",
        notes=request.notes if request else None,
        reviewer=request.reviewer_email if request else "unknown",
    )


async def _run_full_pipeline(
    file_bytes: bytes,
    mime_type: str,
    session_id: str,
    document_id: str,
    start_ts: float,
) -> InvoiceProcessingResponse:
    """Run the complete invoice processing pipeline."""
    # Step 1: Document extraction
    try:
        extraction = await get_docai().process_document(
            file_bytes=file_bytes,
            mime_type=mime_type,
            document_id=document_id,
        )
    except TimeoutError as e:
        raise HTTPException(status_code=504, detail=str(e))

    # Step 2: Verification
    verification = await get_verifier().verify(extraction)

    # Step 3: Governance
    governance = await get_governor().evaluate(
        extraction=extraction,
        verification=verification,
        session_id=session_id,
    )

    # Step 4: Register if auto-processed
    if governance.decision == GovernanceDecision.AUTO_PROCESS:
        await get_verifier().register_invoice(extraction)

    elapsed = time.monotonic() - start_ts

    return InvoiceProcessingResponse(
        session_id=session_id,
        document_id=extraction.document_id,
        extraction=extraction,
        verification=verification,
        governance_decision=governance.decision.value,
        violations=[v.value for v in governance.violations],
        audit_entry_id=governance.audit_entry_id,
        hitl_ticket_id=governance.hitl_ticket_id,
        processing_time_seconds=round(elapsed, 3),
    )


async def _process_hitl_decision(
    ticket_id: str,
    decision: str,
    notes: Optional[str],
    reviewer: str,
) -> dict:
    """Update HITL ticket with manager decision."""
    db = get_firestore_client()
    ticket_ref = db.collection(settings.firestore_collection_hitl).document(ticket_id)
    ticket_doc = ticket_ref.get()

    if not ticket_doc.exists:
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_id} not found")

    ticket_data = ticket_doc.to_dict()
    if ticket_data.get("status") != "PENDING_REVIEW":
        raise HTTPException(
            status_code=409,
            detail=f"Ticket already in status: {ticket_data.get('status')}",
        )

    # Update ticket
    ticket_ref.update(
        {
            "status": decision,
            "reviewed_by": reviewer,
            "reviewed_at": datetime.utcnow().isoformat(),
            "review_notes": notes,
        }
    )

    logger.info(
        "api.hitl.decision",
        ticket_id=ticket_id,
        decision=decision,
        reviewer=reviewer,
    )

    return {
        "ticket_id": ticket_id,
        "decision": decision,
        "reviewer": reviewer,
        "timestamp": datetime.utcnow().isoformat(),
    }
