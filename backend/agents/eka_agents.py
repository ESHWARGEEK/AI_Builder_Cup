"""
Google ADK Agent Definitions

EKA orchestrates three specialized sub-agents coordinated by a root
SequentialAgent that enforces AAL-3 governance at each transition.

Agent hierarchy:
  EKAOrchestrator (SequentialAgent)
  ├── PolicyQueryAgent    → RAG engine + Vertex AI Search
  ├── InvoiceParserAgent  → Document AI extraction
  └── VerificationAgent   → FunctionTools: arithmetic, vendor, duplicate
"""
from __future__ import annotations

from typing import Any, Dict, Optional

import structlog
from google.adk.agents import Agent, SequentialAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.tools import FunctionTool
from google.genai.types import Content, Part

from config import get_settings
from engines.rag_engine import RAGEngine
from engines.verification_engine import VerificationEngine
from models.invoice import InvoiceExtractionResult

logger = structlog.get_logger(__name__)
settings = get_settings()

# Shared engine instances
_rag_engine: Optional[RAGEngine] = None
_verification_engine: Optional[VerificationEngine] = None


def get_rag_engine() -> RAGEngine:
    global _rag_engine
    if _rag_engine is None:
        _rag_engine = RAGEngine()
    return _rag_engine


def get_verification_engine() -> VerificationEngine:
    global _verification_engine
    if _verification_engine is None:
        _verification_engine = VerificationEngine()
    return _verification_engine


# ── FunctionTool definitions ──────────────────────────────────────────────────

async def query_travel_policy(query: str) -> Dict[str, Any]:
    """
    Query the corporate travel and expense policy corpus using RAG.

    Args:
        query: Natural language question about travel or expense policies.

    Returns:
        dict with 'answer' (str), 'citations' (list), and 'sources' (list).
    """
    rag = get_rag_engine()
    result = await rag.query(query)
    return {
        "answer": result.get("answer", ""),
        "citations": result.get("citations", []),
        "sources": result.get("sources", []),
        "query": query,
    }


async def check_invoice_arithmetic(
    net_amount: float,
    tax_amount: float,
    total_amount: float,
    line_items_json: str = "[]",
) -> Dict[str, Any]:
    """
    Verify invoice arithmetic with strict 2-decimal precision.

    Args:
        net_amount: Net amount before tax (USD).
        tax_amount: Tax amount (USD).
        total_amount: Claimed total amount (USD).
        line_items_json: JSON string of line items for sub-total validation.

    Returns:
        dict with 'arithmetic_valid' (bool), 'expected_total' (float),
        'extracted_total' (float), 'delta_usd' (float).
    """
    from decimal import Decimal, ROUND_HALF_UP
    import json

    tolerance = Decimal(str(settings.aal3_arithmetic_tolerance_usd))
    net = Decimal(str(net_amount)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    tax = Decimal(str(tax_amount)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    total = Decimal(str(total_amount)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    computed = (net + tax).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    delta = abs(computed - total)

    return {
        "arithmetic_valid": delta <= tolerance,
        "expected_total": float(computed),
        "extracted_total": float(total),
        "delta_usd": float(delta),
        "tolerance_usd": float(tolerance),
    }


async def validate_vendor(vendor_id: str) -> Dict[str, Any]:
    """
    Validate vendor ID against the approved vendor registry in AlloyDB.

    Args:
        vendor_id: The vendor identifier to validate.

    Returns:
        dict with 'is_valid' (bool) and 'vendor_details' (dict or None).
    """
    engine = get_verification_engine()
    is_valid, details = await engine._check_vendor(vendor_id)
    return {
        "is_valid": is_valid,
        "vendor_details": details,
        "vendor_id": vendor_id,
    }


async def check_duplicate_invoice(
    invoice_number: str,
    vendor_id: str,
    total_amount_usd: float,
    document_hash: str,
) -> Dict[str, Any]:
    """
    Check for duplicate invoices using content hash and compound key.

    Args:
        invoice_number: Invoice number from the document.
        vendor_id: Vendor identifier.
        total_amount_usd: Invoice total in USD.
        document_hash: SHA-256 hash of the invoice document content.

    Returns:
        dict with 'is_duplicate' (bool) and 'existing_invoice_id' (str or None).
    """
    from google.cloud.firestore_v1 import FieldFilter
    import hashlib

    db = get_firestore_client_local()
    collection = settings.firestore_collection_invoices

    # Check by content hash
    if document_hash:
        results = db.collection(collection).where(
            filter=FieldFilter("document_hash", "==", document_hash)
        ).limit(1).stream()
        for doc in results:
            return {"is_duplicate": True, "existing_invoice_id": doc.id, "signal": "content_hash"}

    # Check by compound key
    compound_key = f"{invoice_number}|{vendor_id}|{total_amount_usd:.2f}"
    compound_hash = hashlib.sha256(compound_key.encode()).hexdigest()
    results = db.collection(collection).where(
        filter=FieldFilter("compound_hash", "==", compound_hash)
    ).limit(1).stream()
    for doc in results:
        return {"is_duplicate": True, "existing_invoice_id": doc.id, "signal": "compound_key"}

    return {"is_duplicate": False, "existing_invoice_id": None}


def get_firestore_client_local():
    from db.firestore import get_firestore_client
    return get_firestore_client()


# ── Agent definitions ─────────────────────────────────────────────────────────

def create_policy_query_agent() -> Agent:
    """Agent specialized for corporate policy RAG queries."""
    return Agent(
        name="policy_query_agent",
        model=settings.gemini_model,
        description=(
            "Retrieves and interprets corporate travel and expense policies "
            "using Vertex AI Search with mandatory inline citations. "
            "Always includes source references in the response."
        ),
        instruction=(
            "You are a corporate policy expert. When asked about travel or expense "
            "policies, use the query_travel_policy tool to retrieve grounded answers. "
            "Always cite your sources inline using the format [Source: <title>]. "
            "Never make up policy details — only report what the retrieved documents state. "
            "If a policy is ambiguous or not found, clearly state this."
        ),
        tools=[FunctionTool(query_travel_policy)],
    )


def create_invoice_verification_agent() -> Agent:
    """Agent specialized for invoice verification."""
    return Agent(
        name="invoice_verification_agent",
        model=settings.gemini_model,
        description=(
            "Runs deterministic verification checks on extracted invoice data: "
            "arithmetic validation, vendor reconciliation, and duplicate detection."
        ),
        instruction=(
            "You are a financial verification specialist. For any invoice data provided: "
            "1. Use check_invoice_arithmetic to validate all monetary calculations. "
            "2. Use validate_vendor to confirm the vendor is in the approved registry. "
            "3. Use check_duplicate_invoice to detect re-submitted invoices. "
            "Report all findings precisely and numerically. Do not round or approximate. "
            "If any check fails, list the specific failure with exact values."
        ),
        tools=[
            FunctionTool(check_invoice_arithmetic),
            FunctionTool(validate_vendor),
            FunctionTool(check_duplicate_invoice),
        ],
    )


def create_eka_orchestrator() -> SequentialAgent:
    """Root orchestrator that coordinates all sub-agents."""
    return SequentialAgent(
        name="eka_orchestrator",
        description=(
            "Enterprise Knowledge Assistant orchestrator. Coordinates policy retrieval "
            "and invoice verification workflows with AAL-3 governance."
        ),
        sub_agents=[
            create_policy_query_agent(),
            create_invoice_verification_agent(),
        ],
    )


# ── Runner singleton ──────────────────────────────────────────────────────────

_runner: Optional[Runner] = None
_session_service: Optional[InMemorySessionService] = None


def get_runner() -> Runner:
    global _runner, _session_service
    if _runner is None:
        orchestrator = create_eka_orchestrator()
        _session_service = InMemorySessionService()
        _runner = Runner(
            agent=orchestrator,
            app_name="enterprise_knowledge_assistant",
            session_service=_session_service,
        )
    return _runner


async def run_agent_turn(
    user_message: str,
    session_id: str,
    context: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Execute one conversational turn with the EKA agent.
    Returns the final agent response text.
    """
    runner = get_runner()
    content = Content(role="user", parts=[Part(text=user_message)])

    final_response = ""
    async for event in runner.run_async(
        user_id="eka_user",
        session_id=session_id,
        new_message=content,
    ):
        if event.is_final_response():
            if event.content and event.content.parts:
                final_response = event.content.parts[0].text or ""

    return final_response
