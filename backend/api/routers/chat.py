"""
Chat / RAG API Router

Endpoints:
  POST /api/v1/chat          — Single-turn RAG query (JSON response)
  GET  /api/v1/chat/stream   — SSE streaming RAG response
  POST /api/v1/chat/session  — Create conversation session
  GET  /api/v1/chat/history  — Get session chat history
"""
from __future__ import annotations

import asyncio
import json
import uuid
from datetime import datetime
from typing import AsyncIterator, List, Optional

import structlog
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from agents.eka_agents import run_agent_turn, get_runner
from config import get_settings
from db.firestore import get_firestore_client
from engines.rag_engine import RAGEngine

logger = structlog.get_logger(__name__)
settings = get_settings()
router = APIRouter()

# Shared RAG engine instance
_rag_engine: Optional[RAGEngine] = None


def get_rag_engine() -> RAGEngine:
    global _rag_engine
    if _rag_engine is None:
        _rag_engine = RAGEngine()
    return _rag_engine


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    use_agent: bool = True  # True = full ADK agent, False = direct RAG


class ChatResponse(BaseModel):
    session_id: str
    answer: str
    citations: List[dict] = []
    sources: List[dict] = []
    processing_time_seconds: float
    timestamp: str


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    """
    Single-turn policy query with RAG grounding.
    Returns grounded answer with inline citations.
    """
    import time

    session_id = request.session_id or str(uuid.uuid4())
    start = time.monotonic()

    logger.info(
        "api.chat.request",
        session_id=session_id,
        message_len=len(request.message),
        use_agent=request.use_agent,
    )

    try:
        if request.use_agent:
            # Route through full ADK agent pipeline
            answer = await run_agent_turn(
                user_message=request.message,
                session_id=session_id,
            )
            citations = []
            sources = []
        else:
            # Direct RAG engine call (faster, no agent overhead)
            rag = get_rag_engine()
            result = await rag.query(request.message, session_id=session_id)
            answer = result.get("answer", "")
            citations = result.get("citations", [])
            sources = result.get("sources", [])

    except TimeoutError as e:
        raise HTTPException(status_code=504, detail=str(e))
    except Exception as e:
        logger.error("api.chat.error", error=str(e), session_id=session_id)
        raise HTTPException(status_code=500, detail="Internal processing error")

    elapsed = time.monotonic() - start

    # Persist to Firestore for history
    _persist_message(
        session_id=session_id,
        role="user",
        content=request.message,
    )
    _persist_message(
        session_id=session_id,
        role="assistant",
        content=answer,
        citations=citations,
        sources=sources,
    )

    return ChatResponse(
        session_id=session_id,
        answer=answer,
        citations=citations,
        sources=sources,
        processing_time_seconds=round(elapsed, 3),
        timestamp=datetime.utcnow().isoformat(),
    )


@router.get("/chat/stream")
async def chat_stream(
    message: str = Query(..., description="User query"),
    session_id: Optional[str] = Query(None),
) -> StreamingResponse:
    """
    Server-Sent Events streaming chat endpoint.

    Streams RAG answer tokens in real-time for progressive rendering.
    Each event is a JSON-encoded SSE payload.

    Event types:
      - {type: "token", content: "word ", index: 0}
      - {type: "citations", citations: [...], sources: [...]}
      - {type: "done", total_tokens: N}
      - {type: "error", message: "..."}
    """
    sid = session_id or str(uuid.uuid4())

    async def event_generator() -> AsyncIterator[str]:
        rag = get_rag_engine()
        try:
            async for event in rag.stream_query(message, session_id=sid):
                yield f"data: {json.dumps(event)}\n\n"

                # Allow task switching
                await asyncio.sleep(0)

        except asyncio.CancelledError:
            logger.info("api.chat.stream.cancelled", session_id=sid)
        except Exception as e:
            logger.error("api.chat.stream.error", error=str(e), session_id=sid)
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
        finally:
            yield f"data: {json.dumps({'type': 'stream_end', 'session_id': sid})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
            "X-Session-ID": sid,
        },
    )


@router.post("/chat/session")
async def create_session() -> dict:
    """Create a new conversation session."""
    session_id = str(uuid.uuid4())
    db = get_firestore_client()
    db.collection("chat_sessions").document(session_id).set(
        {
            "session_id": session_id,
            "created_at": datetime.utcnow().isoformat(),
            "status": "active",
        }
    )
    return {"session_id": session_id}


@router.get("/chat/history")
async def get_history(
    session_id: str = Query(...),
    limit: int = Query(50, le=200),
) -> dict:
    """Retrieve chat history for a session."""
    db = get_firestore_client()
    messages = (
        db.collection("chat_sessions")
        .document(session_id)
        .collection("messages")
        .order_by("timestamp")
        .limit(limit)
        .stream()
    )
    history = [msg.to_dict() for msg in messages]
    return {"session_id": session_id, "messages": history}


def _persist_message(
    session_id: str,
    role: str,
    content: str,
    citations: list = None,
    sources: list = None,
) -> None:
    """Persist chat message to Firestore (fire-and-forget)."""
    try:
        db = get_firestore_client()
        db.collection("chat_sessions").document(session_id).collection("messages").add(
            {
                "role": role,
                "content": content,
                "citations": citations or [],
                "sources": sources or [],
                "timestamp": datetime.utcnow().isoformat(),
            }
        )
    except Exception as e:
        logger.warning("api.chat.persist_error", error=str(e))
