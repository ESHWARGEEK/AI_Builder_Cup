"""
AAL-3 (Allowed Autonomy Level 3 — "Eyes On") Governance Engine.

Decision matrix:
  AUTO-PROCESS if ALL of:
    - invoice_total_usd < AAL3_AUTO_PROCESS_THRESHOLD_USD (default $1,000)
    - entity_extraction_confidence > AAL3_CONFIDENCE_THRESHOLD (default 95%)
    - zero policy_flags
    - arithmetic_valid == True
    - duplicate_detected == False
    - vendor_valid == True

  HALT → HITL for any violation.

Audit entries are written immutably to AlloyDB (with rollback payload)
and a summary is mirrored to Firestore for real-time UI polling.
"""
from __future__ import annotations

import hashlib
import json
import uuid
from datetime import datetime, timezone

try:
    from datetime import UTC
except ImportError:
    UTC = timezone.utc
from enum import Enum
from typing import Any, Dict, List, Optional

import structlog
from pydantic import BaseModel, Field

from config import get_settings
from db.alloydb import get_alloydb_session
from db.firestore import get_firestore_client
from models.invoice import InvoiceExtractionResult, VerificationResult
from notifications.dispatcher import dispatch_hitl_notification

logger = structlog.get_logger(__name__)
settings = get_settings()


class GovernanceDecision(str, Enum):
    AUTO_PROCESS = "AUTO_PROCESS"
    HALT_HITL = "HALT_HITL"


class GovernanceViolation(str, Enum):
    AMOUNT_THRESHOLD = "AMOUNT_THRESHOLD"
    LOW_CONFIDENCE = "LOW_CONFIDENCE"
    POLICY_FLAG = "POLICY_FLAG"
    ARITHMETIC_MISMATCH = "ARITHMETIC_MISMATCH"
    DUPLICATE_DETECTED = "DUPLICATE_DETECTED"
    UNKNOWN_VENDOR = "UNKNOWN_VENDOR"


class GovernanceResult(BaseModel):
    decision: GovernanceDecision
    violations: List[GovernanceViolation] = Field(default_factory=list)
    audit_entry_id: str
    hitl_ticket_id: Optional[str] = None
    rollback_payload: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))
    confidence_score: float
    invoice_total_usd: float
    auto_process_eligible: bool


class AAL3Governor:
    """
    Deterministic AAL-3 governance engine.
    Thread-safe: creates a fresh audit entry per evaluation.
    """

    def __init__(self) -> None:
        self._threshold_usd = settings.aal3_auto_process_threshold_usd
        self._confidence_min = settings.aal3_confidence_threshold

    async def evaluate(
        self,
        extraction: InvoiceExtractionResult,
        verification: VerificationResult,
        session_id: str,
        raw_document_bytes: Optional[bytes] = None,
    ) -> GovernanceResult:
        """
        Evaluate the governance decision and persist audit record.

        Returns GovernanceResult with decision, violations, and audit IDs.
        """
        audit_entry_id = str(uuid.uuid4())
        violations: List[GovernanceViolation] = []

        # ── Check 1: Amount threshold ─────────────────────────────────────────
        if extraction.total_amount_usd >= self._threshold_usd:
            violations.append(GovernanceViolation.AMOUNT_THRESHOLD)
            logger.info(
                "aal3.violation.amount",
                amount=extraction.total_amount_usd,
                threshold=self._threshold_usd,
            )

        # ── Check 2: Confidence threshold ─────────────────────────────────────
        if extraction.confidence_score <= self._confidence_min:
            violations.append(GovernanceViolation.LOW_CONFIDENCE)
            logger.info(
                "aal3.violation.confidence",
                confidence=extraction.confidence_score,
                min_required=self._confidence_min,
            )

        # ── Check 3: Policy flags ──────────────────────────────────────────────
        if extraction.policy_flags:
            violations.append(GovernanceViolation.POLICY_FLAG)
            logger.info("aal3.violation.policy", flags=extraction.policy_flags)

        # ── Check 4: Arithmetic validity ──────────────────────────────────────
        if not verification.arithmetic_valid:
            violations.append(GovernanceViolation.ARITHMETIC_MISMATCH)
            logger.info(
                "aal3.violation.arithmetic",
                expected=verification.expected_total,
                found=verification.extracted_total,
            )

        # ── Check 5: Duplicate detection ──────────────────────────────────────
        if verification.duplicate_detected:
            violations.append(GovernanceViolation.DUPLICATE_DETECTED)
            logger.info(
                "aal3.violation.duplicate",
                duplicate_id=verification.duplicate_invoice_id,
            )

        # ── Check 6: Vendor validation ────────────────────────────────────────
        if not verification.vendor_valid:
            violations.append(GovernanceViolation.UNKNOWN_VENDOR)
            logger.info(
                "aal3.violation.vendor",
                vendor_id=extraction.vendor_id,
            )

        decision = (
            GovernanceDecision.AUTO_PROCESS
            if not violations
            else GovernanceDecision.HALT_HITL
        )

        # ── Build rollback payload (immutable snapshot) ────────────────────────
        rollback_payload = None
        if decision == GovernanceDecision.HALT_HITL:
            rollback_payload = {
                "extraction_snapshot": extraction.model_dump(mode="json"),
                "verification_snapshot": verification.model_dump(mode="json"),
                "violations": [v.value for v in violations],
                "session_id": session_id,
                "audit_entry_id": audit_entry_id,
                "rollback_timestamp": datetime.now(UTC).isoformat(),
            }

        result = GovernanceResult(
            decision=decision,
            violations=violations,
            audit_entry_id=audit_entry_id,
            rollback_payload=rollback_payload,
            confidence_score=extraction.confidence_score,
            invoice_total_usd=extraction.total_amount_usd,
            auto_process_eligible=(decision == GovernanceDecision.AUTO_PROCESS),
        )

        # ── Persist audit trail (AlloyDB primary + Firestore mirror) ──────────
        await self._persist_audit_entry(result, extraction, session_id)

        # ── Dispatch HITL if needed ────────────────────────────────────────────
        if decision == GovernanceDecision.HALT_HITL:
            ticket_id = await self._create_hitl_ticket(result, extraction, session_id)
            result.hitl_ticket_id = ticket_id

        logger.info(
            "aal3.decision",
            decision=decision,
            violations=[v.value for v in violations],
            audit_entry_id=audit_entry_id,
        )

        return result

    async def _persist_audit_entry(
        self,
        result: GovernanceResult,
        extraction: InvoiceExtractionResult,
        session_id: str,
    ) -> None:
        """Write immutable audit record to AlloyDB and mirror to Firestore."""
        entry = {
            "id": result.audit_entry_id,
            "session_id": session_id,
            "decision": result.decision.value,
            "violations": [v.value for v in result.violations],
            "invoice_number": extraction.invoice_number,
            "vendor_id": extraction.vendor_id,
            "total_amount_usd": float(extraction.total_amount_usd),
            "confidence_score": float(result.confidence_score),
            "rollback_payload": json.dumps(result.rollback_payload)
            if result.rollback_payload
            else None,
            "created_at": result.timestamp,
        }

        # AlloyDB (authoritative, immutable)
        async with get_alloydb_session() as session:
            await session.execute(
                """
                INSERT INTO audit_trail
                  (id, session_id, decision, violations, invoice_number,
                   vendor_id, total_amount_usd, confidence_score,
                   rollback_payload, created_at)
                VALUES
                  (:id, :session_id, :decision, :violations::jsonb, :invoice_number,
                   :vendor_id, :total_amount_usd, :confidence_score,
                   :rollback_payload::jsonb, :created_at)
                """,
                {**entry, "violations": json.dumps(entry["violations"])},
            )
            await session.commit()

        # Firestore (real-time UI mirror)
        db = get_firestore_client()
        db.collection(settings.firestore_collection_audit).document(
            result.audit_entry_id
        ).set({**entry, "created_at": result.timestamp.isoformat()})

    async def _create_hitl_ticket(
        self,
        result: GovernanceResult,
        extraction: InvoiceExtractionResult,
        session_id: str,
    ) -> str:
        """Create HITL review ticket in Firestore and dispatch notifications."""
        ticket_id = str(uuid.uuid4())
        approval_token = hashlib.sha256(
            f"{ticket_id}{session_id}{settings.hitl_oauth_client_id}".encode()
        ).hexdigest()

        approval_url = (
            f"{settings.hitl_review_base_url}/review/{ticket_id}"
            f"?token={approval_token}&audit={result.audit_entry_id}"
        )

        ticket = {
            "id": ticket_id,
            "audit_entry_id": result.audit_entry_id,
            "session_id": session_id,
            "status": "PENDING_REVIEW",
            "violations": [v.value for v in result.violations],
            "invoice_number": extraction.invoice_number,
            "vendor_id": extraction.vendor_id,
            "total_amount_usd": float(extraction.total_amount_usd),
            "confidence_score": float(result.confidence_score),
            "approval_url": approval_url,
            "approval_token": approval_token,
            "created_at": datetime.now(UTC).isoformat(),
            "expires_at": None,  # Set by manager SLA policy
        }

        db = get_firestore_client()
        db.collection(settings.firestore_collection_hitl).document(ticket_id).set(ticket)

        # Dispatch to Google Chat + email
        await dispatch_hitl_notification(ticket=ticket, approval_url=approval_url)

        return ticket_id
