"""Audit trail router."""
from fastapi import APIRouter, Query, Path
from db.alloydb import get_alloydb_session

router = APIRouter()

@router.get("/audit")
async def list_audit_entries(limit: int = Query(50, le=200), offset: int = 0) -> dict:
    async with get_alloydb_session() as session:
        result = await session.execute(
            "SELECT * FROM audit_trail ORDER BY created_at DESC LIMIT :limit OFFSET :offset",
            {"limit": limit, "offset": offset}
        )
        rows = [dict(r._mapping) for r in result]
    return {"entries": rows, "count": len(rows)}

@router.get("/audit/{entry_id}")
async def get_audit_entry(entry_id: str = Path(...)) -> dict:
    async with get_alloydb_session() as session:
        result = await session.execute(
            "SELECT * FROM audit_trail WHERE id = :id", {"id": entry_id}
        )
        row = result.fetchone()
    if not row:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Audit entry not found")
    return dict(row._mapping)
