"""Documents router (bounding-box overlay data)."""
from fastapi import APIRouter, Path
from db.firestore import get_firestore_client

router = APIRouter()

@router.get("/documents/{document_id}/entities")
async def get_document_entities(document_id: str = Path(...)) -> dict:
    """Return extracted entities with bounding boxes for frontend PDF overlay."""
    db = get_firestore_client()
    docs = db.collection("invoices").where("document_id", "==", document_id).limit(1).stream()
    for doc in docs:
        data = doc.to_dict()
        return {"document_id": document_id, "entities": data.get("entities", {}), "page_count": data.get("page_count", 1)}
    return {"document_id": document_id, "entities": {}, "page_count": 1}
