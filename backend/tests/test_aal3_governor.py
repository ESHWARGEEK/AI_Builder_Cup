"""
Unit tests for AAL-3 ("Eyes On") Governance Engine.
Verifies auto-process requirements, threshold halts, and audit trail rollback payload creation.
"""
import pytest
from governance.aal3_governor import (
    AAL3Governor,
    GovernanceDecision,
    GovernanceViolation,
)
from models.invoice import InvoiceExtractionResult, VerificationResult


def make_sample_extraction(
    total: float = 500.0,
    confidence: float = 0.98,
    policy_flags: list = None,
    vendor_id: str = "VND-4821-CORP",
) -> InvoiceExtractionResult:
    return InvoiceExtractionResult(
        document_id="doc-test-123",
        invoice_number="INV-2026-TEST",
        vendor_name="Global Office Supplies Corp",
        vendor_id=vendor_id,
        total_amount_usd=total,
        net_amount_usd=total * 0.9,
        tax_amount_usd=total * 0.1,
        currency="USD",
        confidence_score=confidence,
        page_count=1,
        policy_flags=policy_flags or [],
    )


def make_sample_verification(
    arithmetic_valid: bool = True,
    vendor_valid: bool = True,
    duplicate_detected: bool = False,
) -> VerificationResult:
    return VerificationResult(
        arithmetic_valid=arithmetic_valid,
        expected_total=500.0,
        extracted_total=500.0,
        arithmetic_delta_usd=0.0,
        vendor_valid=vendor_valid,
        vendor_details={"name": "Global Office Supplies Corp"},
        duplicate_detected=duplicate_detected,
        duplicate_invoice_id=None,
    )


@pytest.mark.asyncio
async def test_aal3_auto_process_eligible():
    """Amount < $1,000, confidence > 95%, 0 flags, all verifications valid -> AUTO_PROCESS."""
    governor = AAL3Governor()
    extraction = make_sample_extraction(total=450.0, confidence=0.97)
    verification = make_sample_verification()

    result = await governor.evaluate(
        extraction=extraction,
        verification=verification,
        session_id="test-session-1",
    )

    assert result.decision == GovernanceDecision.AUTO_PROCESS
    assert len(result.violations) == 0
    assert result.auto_process_eligible is True
    assert result.audit_entry_id is not None


@pytest.mark.asyncio
async def test_aal3_halt_amount_threshold():
    """Amount >= $1,000 halts execution -> HALT_HITL."""
    governor = AAL3Governor()
    extraction = make_sample_extraction(total=1500.0, confidence=0.98)
    verification = make_sample_verification()

    result = await governor.evaluate(
        extraction=extraction,
        verification=verification,
        session_id="test-session-2",
    )

    assert result.decision == GovernanceDecision.HALT_HITL
    assert GovernanceViolation.AMOUNT_THRESHOLD in result.violations
    assert result.auto_process_eligible is False
    assert result.hitl_ticket_id is not None
    assert result.rollback_payload is not None


@pytest.mark.asyncio
async def test_aal3_halt_low_confidence():
    """Confidence <= 95% halts execution -> HALT_HITL."""
    governor = AAL3Governor()
    extraction = make_sample_extraction(total=200.0, confidence=0.88)
    verification = make_sample_verification()

    result = await governor.evaluate(
        extraction=extraction,
        verification=verification,
        session_id="test-session-3",
    )

    assert result.decision == GovernanceDecision.HALT_HITL
    assert GovernanceViolation.LOW_CONFIDENCE in result.violations


@pytest.mark.asyncio
async def test_aal3_halt_arithmetic_mismatch():
    """Arithmetic mismatch halts execution -> HALT_HITL."""
    governor = AAL3Governor()
    extraction = make_sample_extraction(total=500.0, confidence=0.99)
    verification = make_sample_verification(arithmetic_valid=False)

    result = await governor.evaluate(
        extraction=extraction,
        verification=verification,
        session_id="test-session-4",
    )

    assert result.decision == GovernanceDecision.HALT_HITL
    assert GovernanceViolation.ARITHMETIC_MISMATCH in result.violations


@pytest.mark.asyncio
async def test_aal3_halt_duplicate():
    """Duplicate invoice halts execution -> HALT_HITL."""
    governor = AAL3Governor()
    extraction = make_sample_extraction(total=250.0, confidence=0.99)
    verification = make_sample_verification(duplicate_detected=True)

    result = await governor.evaluate(
        extraction=extraction,
        verification=verification,
        session_id="test-session-5",
    )

    assert result.decision == GovernanceDecision.HALT_HITL
    assert GovernanceViolation.DUPLICATE_DETECTED in result.violations
