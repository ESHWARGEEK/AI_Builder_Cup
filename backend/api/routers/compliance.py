"""
FastAPI Router for Compliance Auditing & Clause Redline Generation (Idea 1).
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from engines.compliance_engine import get_compliance_engine
from models.compliance import ClauseRedline, ComplianceReport

router = APIRouter()


class AuditRequest(BaseModel):
    document_id: str
    document_text: Optional[str] = None
    extracted_fields: Optional[Dict[str, Any]] = None


class ApplyRedlineRequest(BaseModel):
    redline_id: str


@router.post("/compliance/audit", response_model=ComplianceReport)
async def audit_document(request: AuditRequest) -> ComplianceReport:
    """Run an automated compliance audit and generate git-style clause redlines."""
    engine = get_compliance_engine()
    return engine.audit_document(
        document_id=request.document_id,
        document_text=request.document_text,
        extracted_fields=request.extracted_fields,
    )


@router.get("/compliance/redlines", response_model=List[ClauseRedline])
async def list_redlines() -> List[ClauseRedline]:
    """Retrieve all active redline suggestions."""
    engine = get_compliance_engine()
    return engine.get_all_redlines()


@router.post("/compliance/redlines/{redline_id}/apply", response_model=ClauseRedline)
async def apply_redline(redline_id: str) -> ClauseRedline:
    """Apply an approved redline draft clause."""
    engine = get_compliance_engine()
    result = engine.apply_redline(redline_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"Redline '{redline_id}' not found")
    return result
