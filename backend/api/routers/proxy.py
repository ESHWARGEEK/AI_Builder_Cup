"""
FastAPI Router for AutoWorkspace Proxy & Artifact Generation Engine (Idea 2).
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional
from fastapi import APIRouter
from pydantic import BaseModel

from engines.proxy_manager import get_proxy_manager
from models.workspace import ExecutiveBriefDoc, LedgerRow, ProxyEvent, ProxyMode
from tools.workspace_proxy import get_artifact_store

router = APIRouter()


class ModeUpdateRequest(BaseModel):
    mode: ProxyMode


class SimulateEventRequest(BaseModel):
    event_type: str = "INVOICE_RECEIVED"
    source: str = "email: vendor-billing@enterprise.corp"
    amount: float = 850.00
    vendor: str = "FastTrack Logistics"


@router.get("/proxy/status")
async def get_proxy_status() -> Dict[str, Any]:
    """Get current OOO/Proxy mode and counts."""
    mgr = get_proxy_manager()
    events = mgr.get_events()
    return {
        "mode": mgr.get_mode(),
        "total_events": len(events),
        "queued_hitl_count": sum(1 for e in events if e.status == "QUEUED_HITL"),
        "auto_resolved_count": sum(1 for e in events if e.status == "AUTO_RESOLVED"),
    }


@router.post("/proxy/status")
async def update_proxy_status(req: ModeUpdateRequest) -> Dict[str, Any]:
    """Toggle or update Proxy mode (ACTIVE_ATTENDING, OOO_INTERCEPTING, OFFLINE)."""
    mgr = get_proxy_manager()
    new_mode = mgr.set_mode(req.mode)
    return {"status": "updated", "mode": new_mode}


@router.get("/proxy/events", response_model=List[ProxyEvent])
async def list_proxy_events() -> List[ProxyEvent]:
    """List intercepted and triaged workspace events."""
    mgr = get_proxy_manager()
    return mgr.get_events()


@router.post("/proxy/simulate-event", response_model=ProxyEvent)
async def simulate_event(req: SimulateEventRequest) -> ProxyEvent:
    """Trigger a simulated incoming workspace event to test autonomous triaging."""
    mgr = get_proxy_manager()
    return mgr.simulate_inbound_event(
        event_type=req.event_type,
        source=req.source,
        amount=req.amount,
        vendor=req.vendor,
    )


@router.get("/proxy/ledger", response_model=List[LedgerRow])
async def get_ledger_rows() -> List[LedgerRow]:
    """Retrieve live rows from the Google Sheets AP Audit Ledger."""
    store = get_artifact_store()
    return store.get_ledger_rows()


@router.get("/proxy/briefs", response_model=List[ExecutiveBriefDoc])
async def get_brief_docs() -> List[ExecutiveBriefDoc]:
    """Retrieve generated Google Docs Executive Briefs."""
    store = get_artifact_store()
    return store.get_brief_docs()
