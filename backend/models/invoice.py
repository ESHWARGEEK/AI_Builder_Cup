"""
Pydantic data models for invoice extraction, verification, and governance.
"""
from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator


class BoundingBox(BaseModel):
    """Normalized bounding box coordinates (0.0–1.0) for a page entity."""
    x: float = Field(..., ge=0.0, le=1.0, description="Left edge (normalized)")
    y: float = Field(..., ge=0.0, le=1.0, description="Top edge (normalized)")
    width: float = Field(..., ge=0.0, le=1.0, description="Box width (normalized)")
    height: float = Field(..., ge=0.0, le=1.0, description="Box height (normalized)")
    page: int = Field(1, ge=1, description="1-indexed page number")


class ExtractedEntity(BaseModel):
    """A single extracted entity from Document AI."""
    field_name: str
    raw_value: str
    normalized_value: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    bounding_box: Optional[BoundingBox] = None
    page_number: int = 1


class LineItem(BaseModel):
    """Invoice line item."""
    description: Optional[str] = None
    quantity: Optional[float] = None
    unit_price_usd: Optional[float] = None
    amount_usd: Optional[float] = None
    product_code: Optional[str] = None
    tax_rate: Optional[float] = None
    bounding_box: Optional[BoundingBox] = None
    page_number: int = 1


class PolicyFlag(BaseModel):
    """A policy violation flag from RAG engine."""
    rule_id: str
    description: str
    severity: str  # "HIGH", "MEDIUM", "LOW"
    policy_section: Optional[str] = None
    citation: Optional[str] = None


class InvoiceExtractionResult(BaseModel):
    """
    Complete structured result from Document AI invoice extraction.
    All monetary fields are in USD with 2-decimal precision.
    """
    document_id: str
    gcs_uri: Optional[str] = None

    # Core invoice fields
    invoice_number: str
    invoice_date: Optional[str] = None
    due_date: Optional[str] = None
    purchase_order_number: Optional[str] = None
    payment_terms: Optional[str] = None

    # Vendor information
    vendor_name: str
    vendor_id: Optional[str] = None
    vendor_tax_id: Optional[str] = None
    vendor_address: Optional[str] = None

    # Financial fields (all USD, 2-decimal)
    total_amount_usd: float = Field(..., ge=0.0)
    net_amount_usd: float = Field(0.0, ge=0.0)
    tax_amount_usd: float = Field(0.0, ge=0.0)
    currency: str = "USD"

    # Extracted entities with bounding boxes
    all_entities: Dict[str, ExtractedEntity] = Field(default_factory=dict)
    line_items: List[Dict[str, Any]] = Field(default_factory=list)

    # Quality signals
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    document_hash: str = ""
    page_count: int = 1

    # Policy flags (populated after RAG policy check)
    policy_flags: List[str] = Field(default_factory=list)

    @field_validator("total_amount_usd", "net_amount_usd", "tax_amount_usd", mode="before")
    @classmethod
    def round_to_2dp(cls, v: Any) -> float:
        return round(float(v or 0), 2)


class VerificationResult(BaseModel):
    """Result from Engine 3 verification suite."""
    arithmetic_valid: bool
    expected_total: float
    extracted_total: float
    arithmetic_delta_usd: float

    vendor_valid: bool
    vendor_details: Optional[Dict[str, Any]] = None

    duplicate_detected: bool
    duplicate_invoice_id: Optional[str] = None

    @property
    def all_checks_passed(self) -> bool:
        return (
            self.arithmetic_valid
            and self.vendor_valid
            and not self.duplicate_detected
        )


class ChatMessage(BaseModel):
    """A single conversational message."""
    role: str  # "user" | "assistant"
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    citations: List[Dict[str, Any]] = Field(default_factory=list)
    sources: List[Dict[str, Any]] = Field(default_factory=list)


class InvoiceProcessingRequest(BaseModel):
    """Request to process an invoice document."""
    gcs_uri: Optional[str] = None
    session_id: str
    metadata: Dict[str, Any] = Field(default_factory=dict)


class InvoiceProcessingResponse(BaseModel):
    """Full invoice processing response including governance decision."""
    session_id: str
    document_id: str
    extraction: InvoiceExtractionResult
    verification: VerificationResult
    governance_decision: str
    violations: List[str] = Field(default_factory=list)
    audit_entry_id: str
    hitl_ticket_id: Optional[str] = None
    processing_time_seconds: float


class HITLTicket(BaseModel):
    """HITL review ticket for manager approval."""
    id: str
    audit_entry_id: str
    session_id: str
    status: str  # PENDING_REVIEW, APPROVED, REJECTED, EXPIRED
    violations: List[str]
    invoice_number: str
    vendor_id: Optional[str]
    total_amount_usd: float
    confidence_score: float
    approval_url: str
    created_at: str
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[str] = None
    review_notes: Optional[str] = None


class AuditEntry(BaseModel):
    """Immutable audit trail entry."""
    id: str
    session_id: str
    decision: str
    violations: List[str]
    invoice_number: str
    vendor_id: Optional[str]
    total_amount_usd: float
    confidence_score: float
    rollback_payload: Optional[str] = None
    created_at: str
