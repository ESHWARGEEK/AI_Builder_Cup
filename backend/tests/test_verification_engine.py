"""
Unit tests for Deterministic Verification Engine & FunctionTools.
Tests exact 2-decimal arithmetic precision, vendor ID checks, and duplicate detection.
"""
import pytest
from tools.verification_tools import (
    check_invoice_arithmetic,
    validate_vendor,
    check_duplicate_invoice,
)


@pytest.mark.asyncio
async def test_arithmetic_valid_exact():
    """Verify net + tax == total exactly."""
    result = await check_invoice_arithmetic(
        net_amount=500.00,
        tax_amount=40.00,
        total_amount=540.00,
    )
    assert result["arithmetic_valid"] is True
    assert result["total_valid"] is True
    assert result["delta_usd"] == 0.0
    assert result["expected_total"] == 540.00


@pytest.mark.asyncio
async def test_arithmetic_valid_within_tolerance():
    """Verify floating point edge cases within $0.01 tolerance."""
    result = await check_invoice_arithmetic(
        net_amount=19.99,
        tax_amount=1.60,
        total_amount=21.59,
    )
    assert result["arithmetic_valid"] is True
    assert result["delta_usd"] <= 0.01


@pytest.mark.asyncio
async def test_arithmetic_invalid_mismatch():
    """Verify arithmetic mismatch detection when totals diverge."""
    result = await check_invoice_arithmetic(
        net_amount=500.00,
        tax_amount=40.00,
        total_amount=600.00,  # $60 discrepancy
    )
    assert result["arithmetic_valid"] is False
    assert result["total_valid"] is False
    assert result["delta_usd"] == 60.00


@pytest.mark.asyncio
async def test_arithmetic_line_items_reconciliation():
    """Verify line item sum matches net amount."""
    line_items = [
        {"amount": 100.00, "description": "Widget A"},
        {"amount": 150.50, "description": "Widget B"},
        {"amount": 49.50, "description": "Widget C"},
    ]
    import json
    result = await check_invoice_arithmetic(
        net_amount=300.00,
        tax_amount=24.00,
        total_amount=324.00,
        line_items_json=json.dumps(line_items),
    )
    assert result["arithmetic_valid"] is True
    assert result["line_items_valid"] is True


@pytest.mark.asyncio
async def test_vendor_validation():
    """Verify approved vs unknown vendor logic."""
    valid_res = await validate_vendor("VND-4821-CORP")
    assert valid_res["is_valid"] is True
    assert valid_res["vendor_details"] is not None

    invalid_res = await validate_vendor("VND-UNKNOWN-999")
    assert invalid_res["is_valid"] is False

    missing_res = await validate_vendor(None)
    assert missing_res["is_valid"] is False


@pytest.mark.asyncio
async def test_duplicate_invoice_detection():
    """Verify duplicate detection triggers for flagged invoices."""
    dup_res = await check_duplicate_invoice(
        invoice_number="INV-2026-0840-DUP",
        vendor_id="VND-3012-SUPPLY",
        total_amount_usd=420.00,
    )
    assert dup_res["is_duplicate"] is True

    unique_res = await check_duplicate_invoice(
        invoice_number="INV-2026-9999-UNIQUE",
        vendor_id="VND-4821-CORP",
        total_amount_usd=150.00,
    )
    assert unique_res["is_duplicate"] is False
