"""
Engine 3: Deterministic Verification Suite

FunctionTools for strict validation:
  1. Arithmetic Checker  — strict 2-decimal sum validation
  2. Vendor Reconciler   — vendor ID lookup in AlloyDB approved list
  3. Duplicate Detector  — hash + invoice number check against Firestore index

All checks are deterministic (no ML), ensuring compliance auditability.
"""
from __future__ import annotations

import hashlib
from decimal import ROUND_HALF_UP, Decimal
from typing import Optional

import structlog
from google.cloud import firestore
from google.cloud.firestore_v1 import FieldFilter

from config import get_settings
from db.alloydb import get_alloydb_session
from db.firestore import get_firestore_client
from models.invoice import InvoiceExtractionResult, VerificationResult

logger = structlog.get_logger(__name__)
settings = get_settings()


class VerificationEngine:
    """
    Deterministic verification suite.

    All monetary arithmetic uses Python's Decimal module to avoid
    IEEE 754 floating-point drift (critical for AP/Finance).
    """

    def __init__(self) -> None:
        self._db = get_firestore_client()

    async def verify(
        self, extraction: InvoiceExtractionResult
    ) -> VerificationResult:
        """
        Run all three verification checks and return consolidated result.
        """
        arithmetic_ok, expected_total, extracted_total = self._check_arithmetic(extraction)
        vendor_ok, vendor_details = await self._check_vendor(extraction.vendor_id)
        duplicate_ok, duplicate_id = await self._check_duplicate(extraction)

        return VerificationResult(
            arithmetic_valid=arithmetic_ok,
            expected_total=float(expected_total),
            extracted_total=float(extracted_total),
            arithmetic_delta_usd=float(abs(expected_total - extracted_total)),
            vendor_valid=vendor_ok,
            vendor_details=vendor_details,
            duplicate_detected=not duplicate_ok,
            duplicate_invoice_id=duplicate_id,
        )

    # ── Tool 1: Arithmetic Checker ────────────────────────────────────────────

    def _check_arithmetic(
        self, extraction: InvoiceExtractionResult
    ) -> tuple[bool, Decimal, Decimal]:
        """
        Strict 2-decimal arithmetic validation.

        Validates: net_amount + tax_amount ≈ total_amount (within $0.01 tolerance)
        Also validates line item sum ≈ net_amount when line items are present.
        """
        tolerance = Decimal(str(settings.aal3_arithmetic_tolerance_usd))

        # Use Decimal for all financial arithmetic
        net = Decimal(str(extraction.net_amount_usd)).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        tax = Decimal(str(extraction.tax_amount_usd)).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        total = Decimal(str(extraction.total_amount_usd)).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )

        # Check 1: net + tax ≈ total
        computed_total = (net + tax).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        total_delta = abs(computed_total - total)

        logger.info(
            "verification.arithmetic",
            net=str(net),
            tax=str(tax),
            total=str(total),
            computed=str(computed_total),
            delta=str(total_delta),
        )

        if total_delta > tolerance:
            logger.warning(
                "verification.arithmetic.mismatch",
                delta=str(total_delta),
                tolerance=str(tolerance),
            )
            return False, computed_total, total

        # Check 2: Sum of line items ≈ net_amount (if line items exist)
        if extraction.line_items:
            line_total = Decimal("0.00")
            for item in extraction.line_items:
                amount_entry = item.get("amount") or item.get("line_amount", {})
                if isinstance(amount_entry, dict):
                    raw = amount_entry.get("value", "0")
                else:
                    raw = str(amount_entry)
                try:
                    cleaned = "".join(c for c in raw if c.isdigit() or c == ".")
                    line_total += Decimal(cleaned or "0").quantize(
                        Decimal("0.01"), rounding=ROUND_HALF_UP
                    )
                except Exception:
                    pass

            line_delta = abs(line_total - net)
            if line_delta > tolerance:
                logger.warning(
                    "verification.arithmetic.line_item_mismatch",
                    line_total=str(line_total),
                    net=str(net),
                    delta=str(line_delta),
                )
                return False, line_total, net

        return True, computed_total, total

    # ── Tool 2: Vendor Reconciler ─────────────────────────────────────────────

    async def _check_vendor(
        self, vendor_id: Optional[str]
    ) -> tuple[bool, Optional[dict]]:
        """
        Vendor ID reconciliation against AlloyDB approved vendor registry.

        Returns (is_valid, vendor_details_or_None).
        """
        if not vendor_id:
            logger.warning("verification.vendor.no_id")
            return False, None

        try:
            async with get_alloydb_session() as session:
                result = await session.execute(
                    """
                    SELECT vendor_id, vendor_name, is_active, payment_terms,
                           w9_on_file, tax_id, risk_tier
                    FROM approved_vendors
                    WHERE vendor_id = :vendor_id
                      AND is_active = TRUE
                    LIMIT 1
                    """,
                    {"vendor_id": vendor_id},
                )
                row = result.fetchone()

            if row:
                vendor_details = dict(row._mapping)
                logger.info(
                    "verification.vendor.valid",
                    vendor_id=vendor_id,
                    risk_tier=vendor_details.get("risk_tier"),
                )
                return True, vendor_details
            else:
                logger.warning("verification.vendor.not_found", vendor_id=vendor_id)
                return False, None

        except Exception as e:
            logger.error("verification.vendor.error", vendor_id=vendor_id, error=str(e))
            # Fail-safe: unknown vendor → HITL
            return False, None

    # ── Tool 3: Duplicate Detector ────────────────────────────────────────────

    async def _check_duplicate(
        self, extraction: InvoiceExtractionResult
    ) -> tuple[bool, Optional[str]]:
        """
        Duplicate invoice detection using two-signal approach:
          1. Document content hash (SHA-256 of extracted text)
          2. Compound key: invoice_number + vendor_id + total_amount

        Returns (is_unique, duplicate_invoice_id_if_found).
        """
        # Signal 1: Hash-based dedup
        if extraction.document_hash:
            hash_result = self._db.collection(
                settings.firestore_collection_invoices
            ).where(
                filter=FieldFilter("document_hash", "==", extraction.document_hash)
            ).limit(1).stream()

            for doc in hash_result:
                existing = doc.to_dict()
                logger.warning(
                    "verification.duplicate.hash_match",
                    existing_id=doc.id,
                    document_hash=extraction.document_hash,
                )
                return False, doc.id

        # Signal 2: Compound key dedup (catches re-submitted invoices with altered whitespace)
        compound_key = (
            f"{extraction.invoice_number}|{extraction.vendor_id}|{extraction.total_amount_usd:.2f}"
        )
        compound_hash = hashlib.sha256(compound_key.encode()).hexdigest()

        key_result = self._db.collection(
            settings.firestore_collection_invoices
        ).where(
            filter=FieldFilter("compound_hash", "==", compound_hash)
        ).limit(1).stream()

        for doc in key_result:
            logger.warning(
                "verification.duplicate.key_match",
                existing_id=doc.id,
                compound_key=compound_key,
            )
            return False, doc.id

        logger.info("verification.duplicate.not_found", invoice=extraction.invoice_number)
        return True, None

    async def register_invoice(self, extraction: InvoiceExtractionResult) -> str:
        """
        Register a newly processed invoice in Firestore to enable future dedup.
        Called only after AUTO_PROCESS decision.
        """
        compound_key = (
            f"{extraction.invoice_number}|{extraction.vendor_id}|{extraction.total_amount_usd:.2f}"
        )
        compound_hash = hashlib.sha256(compound_key.encode()).hexdigest()

        doc_ref = self._db.collection(
            settings.firestore_collection_invoices
        ).document()

        doc_ref.set(
            {
                "document_id": extraction.document_id,
                "invoice_number": extraction.invoice_number,
                "vendor_id": extraction.vendor_id,
                "total_amount_usd": extraction.total_amount_usd,
                "document_hash": extraction.document_hash,
                "compound_hash": compound_hash,
                "status": "PROCESSED",
                "processed_at": firestore.SERVER_TIMESTAMP,
            }
        )

        logger.info(
            "verification.invoice.registered",
            doc_id=doc_ref.id,
            invoice_number=extraction.invoice_number,
        )
        return doc_ref.id
