"""
Data models for Autonomous Compliance & Clause Redline Generator (Idea 1).
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


SeverityLevel = Literal["CRITICAL", "WARNING", "PASSED"]


class ClauseRedline(BaseModel):
    """A git-style redline clause replacement suggestion."""
    id: str
    clause_type: str = Field(..., description="e.g. payment_terms, liability_cap, indemnification, gdpr_data_transfer")
    original_clause: str
    replacement_clause: str
    policy_violation_rationale: str
    severity: SeverityLevel
    applied: bool = False
    citation: Optional[str] = None


class ComplianceReport(BaseModel):
    """Comprehensive compliance evaluation result."""
    document_id: str
    risk_level: SeverityLevel
    redlines: List[ClauseRedline] = Field(default_factory=list)
    corporate_policy_matches: List[str] = Field(default_factory=list)
    regulatory_framework_matches: List[str] = Field(default_factory=list)
    summary: str
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
