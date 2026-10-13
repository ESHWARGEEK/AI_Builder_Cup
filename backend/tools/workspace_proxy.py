"""
AutoWorkspace Proxy Tools (Idea 2).
Provides tools to proactively generate Google Workspace artifacts:
- Google Sheets AP Audit Ledger row creation and streaming
- Google Docs Executive Brief compilation for contract and compliance reviews
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
import structlog

from models.workspace import ExecutiveBriefDoc, LedgerRow

logger = structlog.get_logger(__name__)


class WorkspaceArtifactStore:
    """In-memory & persistent synchronized store for live workspace artifacts."""

    def __init__(self) -> None:
        self._ledger_rows: List[LedgerRow] = []
        self._brief_docs: List[ExecutiveBriefDoc] = []
        self._seed_default_artifacts()

    def _seed_default_artifacts(self) -> None:
        """Seed realistic initial rows in the Google Sheets AP Ledger."""
        self._ledger_rows = [
            LedgerRow(
                id="row-101",
                timestamp="2026-10-12 14:15:00 UTC",
                vendor_name="Acme Cloud Solutions",
                invoice_number="INV-2026-091",
                total_amount_usd=450.00,
                confidence_score=0.98,
                compliance_status="AUTO_APPROVED",
                approved_by="NexusWork Agent (AAL-3 Autonomous)",
                sheet_row_index=101,
            ),
            LedgerRow(
                id="row-102",
                timestamp="2026-10-12 16:40:22 UTC",
                vendor_name="Global Office Logistics",
                invoice_number="GOL-8891-B",
                total_amount_usd=820.50,
                confidence_score=0.96,
                compliance_status="AUTO_APPROVED",
                approved_by="NexusWork Agent (AAL-3 Autonomous)",
                sheet_row_index=102,
            ),
            LedgerRow(
                id="row-103",
                timestamp="2026-10-13 09:10:05 UTC",
                vendor_name="Dell Enterprise Hardware",
                invoice_number="DELL-US-7721",
                total_amount_usd=4200.00,
                confidence_score=0.91,
                compliance_status="PENDING_APPROVAL",
                approved_by="Awaiting HITL Review (Elena Rostova)",
                sheet_row_index=103,
            ),
        ]

        self._brief_docs = [
            ExecutiveBriefDoc(
                id="doc-emea-msa-01",
                title="Executive Brief: Initech Master Services Agreement (EMEA)",
                summary="NexusWork pre-execution compliance review identified 2 critical policy deviations requiring procurement remediation prior to executive sign-off.",
                compliance_notes="1. Payment terms specify Net 15 days (Corporate policy mandates Net 30 days pursuant to §8.1).\n2. Uncapped liability provision identified in Clause 14. Enterprise ceiling is 2x annual contract value.",
                recommended_actions=[
                    "Issue redline counter-draft adopting Enterprise Net 30 standard terms.",
                    "Insert mandatory 2x annual fee liability cap pursuant to Enterprise Legal Risk Charter §14.2.",
                    "Verify EU GDPR Standard Contractual Clauses (SCCs) schedule.",
                ],
                markdown_content="""# Executive Brief: Initech Master Services Agreement (EMEA)
**Prepared by:** NexusWork Autonomous Agent (AAL 3 Eyes-On)  
**Date:** 2026-10-13  
**Review Status:** CRITICAL POLICY FLAGS IDENTIFIED

---

### 1. Executive Summary
An autonomous pre-execution audit was executed against the submitted Initech Master Services Agreement. The agreement governs cloud migration and enterprise infrastructure support across EMEA regions.

### 2. High-Priority Discrepancies
* **Non-Compliant Payment Schedule:** Agreement states Net 15 days with 3% monthly compounding interest. Global cashflow governance mandates Net 30 days (§8.1).
* **Uncapped Consequential Liability:** Clause 14 subjects the organization to unlimited direct and indirect damages. Policy mandates a hard ceiling at 2x annual SOW billings (§14.2).

### 3. Recommended Remediation
Execute the automated git-style redline draft produced by NexusWork. The updated draft aligns with Corporate Boilerplate v4.2 while maintaining vendor relationship viability.
""",
            )
        ]

    def add_ledger_row(self, row: LedgerRow) -> LedgerRow:
        row.sheet_row_index = len(self._ledger_rows) + 101
        self._ledger_rows.insert(0, row)
        logger.info(
            "workspace.ledger.row_appended",
            invoice_number=row.invoice_number,
            vendor=row.vendor_name,
            total=row.total_amount_usd,
        )
        return row

    def get_ledger_rows(self) -> List[LedgerRow]:
        return self._ledger_rows

    def add_brief_doc(self, doc: ExecutiveBriefDoc) -> ExecutiveBriefDoc:
        self._brief_docs.insert(0, doc)
        logger.info("workspace.brief_doc.created", title=doc.title)
        return doc

    def get_brief_docs(self) -> List[ExecutiveBriefDoc]:
        return self._brief_docs


# Global singleton instance
_artifact_store: Optional[WorkspaceArtifactStore] = None


def get_artifact_store() -> WorkspaceArtifactStore:
    global _artifact_store
    if _artifact_store is None:
        _artifact_store = WorkspaceArtifactStore()
    return _artifact_store


def create_audit_ledger_row(
    sheet_id: str,
    vendor_name: str,
    invoice_number: str,
    total_amount_usd: float,
    confidence_score: float,
    compliance_status: str,
    approved_by: str = "NexusWork Agent",
) -> LedgerRow:
    """Tool: appends a standardized ledger entry to the Google Sheet AP Ledger."""
    store = get_artifact_store()
    row = LedgerRow(
        id=f"row-{uuid.uuid4().hex[:6]}",
        vendor_name=vendor_name,
        invoice_number=invoice_number,
        total_amount_usd=total_amount_usd,
        confidence_score=confidence_score,
        compliance_status=compliance_status,
        approved_by=approved_by,
    )
    return store.add_ledger_row(row)


def generate_executive_brief_doc(
    title: str,
    summary: str,
    compliance_notes: str,
    recommended_actions: List[str],
    markdown_content: str,
) -> ExecutiveBriefDoc:
    """Tool: generates an executive brief Google Doc ready for export."""
    store = get_artifact_store()
    doc = ExecutiveBriefDoc(
        id=f"doc-{uuid.uuid4().hex[:6]}",
        title=title,
        summary=summary,
        compliance_notes=compliance_notes,
        recommended_actions=recommended_actions,
        markdown_content=markdown_content,
    )
    return store.add_brief_doc(doc)
