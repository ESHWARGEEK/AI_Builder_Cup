"""
Engine 2: Document AI Specialized Invoice Parser

Supports:
  - Synchronous extraction for documents ≤15 pages
  - Asynchronous batch extraction for larger documents
  - Eventarc trigger handler for Cloud Storage events
  - Multi-page bounding box extraction for frontend overlay rendering
  - ≤15s SLA enforcement
"""
from __future__ import annotations

import asyncio
import hashlib
import io
import time
import uuid
from typing import Any, Dict, List, Optional, Tuple

import structlog
from google.api_core import exceptions as gcp_exceptions
from google.cloud import documentai_v1 as documentai
from google.cloud import storage

from config import get_settings
from models.invoice import (
    BoundingBox,
    ExtractedEntity,
    InvoiceExtractionResult,
)

logger = structlog.get_logger(__name__)
settings = get_settings()

# Document AI entity type → normalized field name mapping
ENTITY_FIELD_MAP = {
    "invoice_id": "invoice_number",
    "invoice_date": "invoice_date",
    "due_date": "due_date",
    "vendor_name": "vendor_name",
    "vendor_address": "vendor_address",
    "vendor_tax_id": "vendor_tax_id",
    "vendor_id": "vendor_id",
    "total_amount": "total_amount_usd",
    "net_amount": "net_amount_usd",
    "tax_amount": "tax_amount_usd",
    "currency": "currency",
    "purchase_order": "purchase_order_number",
    "payment_terms": "payment_terms",
    "line_item/description": "line_items",
    "line_item/quantity": "line_items",
    "line_item/unit_price": "line_items",
    "line_item/amount": "line_items",
}


class DocAIEngine:
    """
    Document AI Specialized Invoice Parser.

    Uses the Invoice Parser processor which is pre-trained on
    millions of invoice formats (PDF, TIFF, JPEG).
    """

    def __init__(self) -> None:
        self._docai_client = documentai.DocumentProcessorServiceAsyncClient()
        self._storage_client = storage.Client(project=settings.gcp_project_id)
        self._processor_name = (
            f"projects/{settings.gcp_project_id}"
            f"/locations/{settings.docai_location}"
            f"/processors/{settings.docai_processor_id}"
            f"/processorVersions/{settings.docai_processor_version}"
        )

    async def process_document(
        self,
        file_bytes: bytes,
        mime_type: str = "application/pdf",
        document_id: Optional[str] = None,
    ) -> InvoiceExtractionResult:
        """
        Process an invoice document synchronously.
        Enforces ≤15s SLA.
        """
        doc_id = document_id or str(uuid.uuid4())
        start_ts = time.monotonic()

        logger.info(
            "docai.process.start",
            doc_id=doc_id,
            mime_type=mime_type,
            size_bytes=len(file_bytes),
        )

        try:
            result = await asyncio.wait_for(
                self._run_extraction(file_bytes, mime_type, doc_id),
                timeout=settings.extraction_sla_seconds,
            )
        except asyncio.TimeoutError:
            elapsed = time.monotonic() - start_ts
            logger.error(
                "docai.process.sla_breach",
                doc_id=doc_id,
                elapsed_s=elapsed,
            )
            raise TimeoutError(
                f"Document extraction exceeded {settings.extraction_sla_seconds}s SLA"
            )

        elapsed = time.monotonic() - start_ts
        logger.info(
            "docai.process.complete",
            doc_id=doc_id,
            elapsed_s=round(elapsed, 3),
            confidence=result.confidence_score,
        )
        return result

    async def process_gcs_document(
        self,
        gcs_uri: str,
        mime_type: str = "application/pdf",
    ) -> InvoiceExtractionResult:
        """
        Process an invoice from Cloud Storage URI.
        Used by Eventarc trigger handler.
        """
        doc_id = gcs_uri.split("/")[-1].replace(".", "_")

        logger.info("docai.gcs.start", gcs_uri=gcs_uri, doc_id=doc_id)

        request = documentai.ProcessRequest(
            name=self._processor_name,
            gcs_document=documentai.GcsDocument(
                gcs_uri=gcs_uri, mime_type=mime_type
            ),
            skip_human_review=True,
            process_options=documentai.ProcessOptions(
                ocr_config=documentai.OcrConfig(
                    enable_native_pdf_parsing=True,
                    enable_image_quality_scores=True,
                    hints=documentai.OcrConfig.Hints(
                        language_hints=["en"]
                    ),
                )
            ),
        )

        try:
            response = await self._docai_client.process_document(request=request)
            return self._parse_document_response(response.document, doc_id, gcs_uri)
        except gcp_exceptions.GoogleAPIError as e:
            logger.error("docai.gcs.error", gcs_uri=gcs_uri, error=str(e))
            raise

    async def trigger_async_batch(
        self,
        gcs_input_uri: str,
        gcs_output_uri: str,
    ) -> str:
        """
        Trigger async batch processing for large documents.
        Returns the operation name for status polling.
        """
        input_config = documentai.BatchDocumentsInputConfig(
            gcs_prefix=documentai.GcsPrefix(gcs_uri_prefix=gcs_input_uri)
        )
        output_config = documentai.DocumentOutputConfig(
            gcs_output_config=documentai.DocumentOutputConfig.GcsOutputConfig(
                gcs_uri=gcs_output_uri,
                field_mask=None,
            )
        )

        request = documentai.BatchProcessRequest(
            name=self._processor_name,
            input_documents=input_config,
            document_output_config=output_config,
            skip_human_review=True,
        )

        operation = await self._docai_client.batch_process_documents(request=request)
        op_name = operation.operation.name

        logger.info("docai.batch.started", operation=op_name)
        return op_name

    async def _run_extraction(
        self,
        file_bytes: bytes,
        mime_type: str,
        doc_id: str,
    ) -> InvoiceExtractionResult:
        """Internal extraction runner."""
        request = documentai.ProcessRequest(
            name=self._processor_name,
            raw_document=documentai.RawDocument(
                content=file_bytes,
                mime_type=mime_type,
            ),
            skip_human_review=True,
            process_options=documentai.ProcessOptions(
                ocr_config=documentai.OcrConfig(
                    enable_native_pdf_parsing=True,
                    enable_image_quality_scores=True,
                )
            ),
        )

        response = await self._docai_client.process_document(request=request)
        return self._parse_document_response(response.document, doc_id)

    def _parse_document_response(
        self,
        doc: documentai.Document,
        doc_id: str,
        gcs_uri: Optional[str] = None,
    ) -> InvoiceExtractionResult:
        """
        Parse Document AI response into structured InvoiceExtractionResult.
        Extracts bounding boxes for each entity for frontend overlay rendering.
        """
        entities: Dict[str, ExtractedEntity] = {}
        line_items: List[Dict[str, Any]] = []
        all_confidences: List[float] = []

        for entity in doc.entities:
            entity_type = entity.type_.lower().replace("/", "_")
            confidence = entity.confidence or 0.0
            all_confidences.append(confidence)

            # Extract bounding box from page anchor
            bounding_box: Optional[BoundingBox] = None
            page_number: int = 1
            if entity.page_anchor and entity.page_anchor.page_refs:
                page_ref = entity.page_anchor.page_refs[0]
                page_number = int(page_ref.page) + 1  # 1-indexed
                if page_ref.bounding_poly and page_ref.bounding_poly.normalized_vertices:
                    verts = page_ref.bounding_poly.normalized_vertices
                    xs = [v.x for v in verts]
                    ys = [v.y for v in verts]
                    bounding_box = BoundingBox(
                        x=min(xs),
                        y=min(ys),
                        width=max(xs) - min(xs),
                        height=max(ys) - min(ys),
                        page=page_number,
                    )

            field_name = ENTITY_FIELD_MAP.get(entity.type_.lower(), entity_type)

            if "line_item" in entity.type_.lower():
                # Group line item sub-entities
                li_index = len(line_items) - 1
                if li_index < 0 or entity.type_.startswith("line_item/description"):
                    line_items.append({})
                    li_index = len(line_items) - 1
                sub_field = entity.type_.lower().split("/")[-1] if "/" in entity.type_ else entity_type
                line_items[li_index][sub_field] = {
                    "value": entity.mention_text,
                    "confidence": confidence,
                    "bounding_box": bounding_box.model_dump() if bounding_box else None,
                    "page": page_number,
                }
            else:
                entities[field_name] = ExtractedEntity(
                    field_name=field_name,
                    raw_value=entity.mention_text,
                    normalized_value=entity.normalized_value.text
                    if entity.normalized_value
                    else entity.mention_text,
                    confidence=confidence,
                    bounding_box=bounding_box,
                    page_number=page_number,
                )

        # Compute overall confidence as average of all entity confidences
        avg_confidence = sum(all_confidences) / len(all_confidences) if all_confidences else 0.0

        # Extract key fields with safe fallbacks
        def get_entity_value(field: str, default: Any = None) -> Any:
            e = entities.get(field)
            return e.normalized_value if e else default

        def get_entity_confidence(field: str) -> float:
            e = entities.get(field)
            return e.confidence if e else 0.0

        # Parse monetary values
        total_str = get_entity_value("total_amount_usd", "0")
        net_str = get_entity_value("net_amount_usd", "0")
        tax_str = get_entity_value("tax_amount_usd", "0")

        def parse_money(value: str) -> float:
            """Safely parse monetary string to float."""
            try:
                cleaned = "".join(c for c in str(value) if c.isdigit() or c == ".")
                return round(float(cleaned or "0"), 2)
            except (ValueError, TypeError):
                return 0.0

        total_usd = parse_money(total_str)
        net_usd = parse_money(net_str)
        tax_usd = parse_money(tax_str)

        # Generate document hash for duplicate detection
        doc_hash = hashlib.sha256(doc.text.encode()).hexdigest() if doc.text else ""

        return InvoiceExtractionResult(
            document_id=doc_id,
            gcs_uri=gcs_uri,
            invoice_number=get_entity_value("invoice_number", "UNKNOWN"),
            invoice_date=get_entity_value("invoice_date"),
            due_date=get_entity_value("due_date"),
            vendor_name=get_entity_value("vendor_name", "UNKNOWN"),
            vendor_id=get_entity_value("vendor_id"),
            vendor_tax_id=get_entity_value("vendor_tax_id"),
            vendor_address=get_entity_value("vendor_address"),
            total_amount_usd=total_usd,
            net_amount_usd=net_usd,
            tax_amount_usd=tax_usd,
            currency=get_entity_value("currency", "USD"),
            purchase_order_number=get_entity_value("purchase_order_number"),
            payment_terms=get_entity_value("payment_terms"),
            line_items=line_items,
            all_entities=entities,
            confidence_score=avg_confidence,
            document_hash=doc_hash,
            page_count=len(doc.pages),
            policy_flags=[],  # Populated by RAG engine after extraction
        )
