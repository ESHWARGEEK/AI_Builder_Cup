"""
Workspace Proxy State Manager (Idea 2).
Manages Out-Of-Office (OOO) autonomous interception mode:
- Intercepts incoming emails, invoices, and calendar approval requests.
- Autonomously triages routine items under AAL-3 policy limits.
- Stages consequential actions into the HITL pending queue.
- Generates live Google Sheets ledger updates and Google Docs briefs.
"""
from __future__ import annotations

import uuid
from typing import Any, Dict, List, Optional
import structlog

from models.workspace import EventStatus, LedgerRow, ProxyEvent, ProxyMode
from tools.workspace_proxy import get_artifact_store

logger = structlog.get_logger(__name__)


class ProxyManager:
    """Manager for OOO Workspace Proxy mode and incoming task triaging."""

    def __init__(self) -> None:
        self._mode: ProxyMode = "OOO_INTERCEPTING"
        self._events: List[ProxyEvent] = []
        self._seed_default_events()

    def _seed_default_events(self) -> None:
        """Seed initial realistic workspace events."""
        self._events = [
            ProxyEvent(
                id="evt-001",
                source="email: ar-billing@dell.com",
                event_type="INVOICE_RECEIVED",
                summary="Inbound AP Invoice #DELL-US-7721 ($4,200.00). Triaged & staged for Elena's HITL review (exceeds $1,000 threshold).",
                status="QUEUED_HITL",
                payload={"vendor": "Dell Enterprise Hardware", "amount": 4200.00, "invoice_id": "DELL-US-7721"},
            ),
            ProxyEvent(
                id="evt-002",
                source="drive: /contracts/emea/initech_msa_v1.pdf",
                event_type="CONTRACT_SUBMITTED",
                summary="Pre-execution audit complete for Initech MSA. 2 policy redlines flagged; Executive Brief compiled.",
                status="TRIAGED",
                payload={"contract": "Initech MSA", "redlines_count": 2},
            ),
            ProxyEvent(
                id="evt-003",
                source="email: accounts@acme-cloud.com",
                event_type="INVOICE_RECEIVED",
                summary="Routine monthly SaaS invoice #INV-2026-091 ($450.00). Confidence 98%. Auto-approved & posted to Ledger row 101.",
                status="AUTO_RESOLVED",
                payload={"vendor": "Acme Cloud Solutions", "amount": 450.00, "invoice_id": "INV-2026-091"},
            ),
        ]

    def get_mode(self) -> ProxyMode:
        return self._mode

    def set_mode(self, mode: ProxyMode) -> ProxyMode:
        old_mode = self._mode
        self._mode = mode
        logger.info("proxy.mode.changed", old_mode=old_mode, new_mode=mode)
        return self._mode

    def get_events(self) -> List[ProxyEvent]:
        return self._events

    def simulate_inbound_event(
        self,
        event_type: str = "INVOICE_RECEIVED",
        source: str = "email: vendor-billing@enterprise.corp",
        amount: float = 850.00,
        vendor: str = "FastTrack Logistics",
    ) -> ProxyEvent:
        """
        Simulate an incoming workspace event to demonstrate autonomous triaging
        while the user is in Proxy/OOO Mode.
        """
        event_id = f"evt-{uuid.uuid4().hex[:6]}"
        is_safe = amount < 1000.00

        if is_safe:
            status: EventStatus = "AUTO_RESOLVED"
            summary = (
                f"Autonomous OOO triaged: {vendor} invoice (${amount:.2f}) "
                f"is under $1,000 threshold. Validated math, auto-approved, and added to Google Sheets Ledger."
            )
            # Proactively append to ledger
            store = get_artifact_store()
            store.add_ledger_row(
                LedgerRow(
                    id=f"row-{uuid.uuid4().hex[:6]}",
                    vendor_name=vendor,
                    invoice_number=f"INV-AUTO-{uuid.uuid4().hex[:4].upper()}",
                    total_amount_usd=amount,
                    confidence_score=0.97,
                    compliance_status="AUTO_APPROVED",
                    approved_by="NexusWork Proxy (OOO Autonomous)",
                )
            )
        else:
            status = "QUEUED_HITL"
            summary = (
                f"Intercepted high-value transaction: {vendor} (${amount:.2f}). "
                f"AAL 3 safety rule triggered: Staged in Pending Review drawer for human sign-off."
            )

        event = ProxyEvent(
            id=event_id,
            source=source,
            event_type=event_type,
            summary=summary,
            status=status,
            payload={"vendor": vendor, "amount": amount},
        )
        self._events.insert(0, event)
        logger.info("proxy.event.simulated", event_id=event_id, status=status)
        return event


# Global singleton instance
_proxy_manager: Optional[ProxyManager] = None


def get_proxy_manager() -> ProxyManager:
    global _proxy_manager
    if _proxy_manager is None:
        _proxy_manager = ProxyManager()
    return _proxy_manager
