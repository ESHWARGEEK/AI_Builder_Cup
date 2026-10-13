"""
Data models for AutoWorkspace Proxy & Artifact Generation Engine (Idea 2).
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


ProxyMode = Literal["ACTIVE_ATTENDING", "OOO_INTERCEPTING", "OFFLINE"]
EventStatus = Literal["TRIAGED", "QUEUED_HITL", "AUTO_RESOLVED"]


class LedgerRow(BaseModel):
    """Row entry in the live Google Sheets AP Audit Ledger."""
    id: str
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"))
    vendor_name: str
    invoice_number: str
    total_amount_usd: float
    confidence_score: float
    compliance_status: str  # e.g., "AUTO_APPROVED", "PENDING_APPROVAL", "REDLINE_FLAGGED", "BLOCKED"
    approved_by: str = "Elena Rostova (Senior AP Lead)"
    sheet_row_index: Optional[int] = None


class ExecutiveBriefDoc(BaseModel):
    """Executive briefing document compiled for Google Docs export."""
    id: str
    title: str
    summary: str
    compliance_notes: str
    recommended_actions: List[str] = Field(default_factory=list)
    markdown_content: str
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class ProxyEvent(BaseModel):
    """Simulated incoming workspace event intercepted in Proxy/OOO mode."""
    id: str
    source: str  # e.g. "email: billing@vendor.com", "calendar: urgent-approval", "drive: new_invoice"
    event_type: str  # "INVOICE_RECEIVED", "CONTRACT_SUBMITTED", "APPROVAL_REQUEST"
    summary: str
    status: EventStatus
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    payload: Dict[str, Any] = Field(default_factory=dict)
