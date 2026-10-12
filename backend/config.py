"""
Central configuration for EKA Backend.
All values loaded from environment variables (Secret Manager for secrets).
"""
from __future__ import annotations

import os
from functools import lru_cache
from typing import List, Optional

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── GCP Core ──────────────────────────────────────────────────────────────
    gcp_project_id: str = Field(..., alias="GCP_PROJECT_ID")
    gcp_region: str = Field("us-central1", alias="GCP_REGION")
    gcp_service_account: Optional[str] = Field(None, alias="GCP_SERVICE_ACCOUNT")

    # ── Vertex AI / RAG ───────────────────────────────────────────────────────
    vertex_ai_location: str = Field("us-central1", alias="VERTEX_AI_LOCATION")
    vertex_search_data_store_id: str = Field(..., alias="VERTEX_SEARCH_DATA_STORE_ID")
    vertex_search_serving_config: str = Field(
        "default_config", alias="VERTEX_SEARCH_SERVING_CONFIG"
    )
    gemini_model: str = Field("gemini-2.5-flash-preview-05-20", alias="GEMINI_MODEL")
    rag_sla_seconds: float = Field(3.0, alias="RAG_SLA_SECONDS")

    # ── Document AI ───────────────────────────────────────────────────────────
    docai_processor_id: str = Field(..., alias="DOCAI_PROCESSOR_ID")
    docai_processor_version: str = Field("stable", alias="DOCAI_PROCESSOR_VERSION")
    docai_location: str = Field("us", alias="DOCAI_LOCATION")
    gcs_invoice_bucket: str = Field(..., alias="GCS_INVOICE_BUCKET")
    gcs_output_bucket: str = Field(..., alias="GCS_OUTPUT_BUCKET")
    extraction_sla_seconds: float = Field(15.0, alias="EXTRACTION_SLA_SECONDS")

    # ── Firestore ─────────────────────────────────────────────────────────────
    firestore_collection_invoices: str = Field(
        "invoices", alias="FIRESTORE_COLLECTION_INVOICES"
    )
    firestore_collection_audit: str = Field(
        "audit_trail", alias="FIRESTORE_COLLECTION_AUDIT"
    )
    firestore_collection_hitl: str = Field(
        "hitl_tickets", alias="FIRESTORE_COLLECTION_HITL"
    )

    # ── AlloyDB ───────────────────────────────────────────────────────────────
    alloydb_connection_name: str = Field(..., alias="ALLOYDB_CONNECTION_NAME")
    alloydb_database: str = Field("eka_finance", alias="ALLOYDB_DATABASE")
    alloydb_user: str = Field("eka_agent", alias="ALLOYDB_USER")
    alloydb_password: SecretStr = Field(..., alias="ALLOYDB_PASSWORD")
    alloydb_pool_size: int = Field(10, alias="ALLOYDB_POOL_SIZE")

    # ── Model Armor / Security ────────────────────────────────────────────────
    model_armor_endpoint: str = Field(..., alias="MODEL_ARMOR_ENDPOINT")
    model_armor_template_id: str = Field(..., alias="MODEL_ARMOR_TEMPLATE_ID")
    model_armor_enabled: bool = Field(True, alias="MODEL_ARMOR_ENABLED")
    allowed_origins: List[str] = Field(
        ["https://eka.internal.example.com"], alias="ALLOWED_ORIGINS"
    )

    # ── HITL / Notifications ──────────────────────────────────────────────────
    google_chat_webhook_url: SecretStr = Field(..., alias="GOOGLE_CHAT_WEBHOOK_URL")
    sendgrid_api_key: SecretStr = Field(..., alias="SENDGRID_API_KEY")
    sendgrid_from_email: str = Field("eka-noreply@example.com", alias="SENDGRID_FROM_EMAIL")
    hitl_review_base_url: str = Field(..., alias="HITL_REVIEW_BASE_URL")
    hitl_oauth_client_id: str = Field(..., alias="HITL_OAUTH_CLIENT_ID")
    manager_email: str = Field(..., alias="MANAGER_EMAIL")

    # ── AAL-3 Governance Thresholds ───────────────────────────────────────────
    aal3_auto_process_threshold_usd: float = Field(
        1000.0, alias="AAL3_AUTO_PROCESS_THRESHOLD_USD"
    )
    aal3_confidence_threshold: float = Field(
        0.95, alias="AAL3_CONFIDENCE_THRESHOLD"
    )
    aal3_arithmetic_tolerance_usd: float = Field(
        0.01, alias="AAL3_ARITHMETIC_TOLERANCE_USD"
    )

    # ── API ───────────────────────────────────────────────────────────────────
    api_host: str = Field("0.0.0.0", alias="API_HOST")
    api_port: int = Field(8080, alias="API_PORT")
    log_level: str = Field("INFO", alias="LOG_LEVEL")
    environment: str = Field("production", alias="ENVIRONMENT")

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def parse_origins(cls, v: str | List[str]) -> List[str]:
        if isinstance(v, str):
            return [o.strip() for o in v.split(",")]
        return v


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
