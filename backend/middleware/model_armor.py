"""
Model Armor Middleware

Integrates Cloud Run with Model Armor to defend against:
  - Direct prompt injection (user-originated adversarial prompts)
  - Indirect prompt injection (poisoned document content / retrieved context)

All incoming request bodies containing text content are screened
before reaching route handlers. Blocked requests return HTTP 400
with a sanitized error message (no leaking of armor details).

Reference:
  https://cloud.google.com/security/products/model-armor
"""
from __future__ import annotations

import json
import time
from typing import Callable

import httpx
import structlog
from fastapi import Request, Response
from google.auth import default as google_auth_default
from google.auth.transport.requests import Request as GoogleAuthRequest
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from config import get_settings

logger = structlog.get_logger(__name__)
settings = get_settings()

# Endpoints that bypass Model Armor (health checks, file uploads use different screening)
BYPASS_PATHS = {
    "/api/v1/health",
    "/api/v1/health/ready",
    "/api/v1/health/live",
    "/api/docs",
    "/api/redoc",
    "/api/openapi.json",
}

# Request body paths containing user text to screen
TEXT_FIELD_PATHS = ["message", "query", "text", "content", "prompt"]


class ModelArmorMiddleware(BaseHTTPMiddleware):
    """
    ASGI middleware that screens user-provided text through Model Armor
    before allowing requests to proceed to route handlers.

    Uses the Model Armor REST API with a pre-configured template that enforces:
      - Jailbreak detection
      - Prompt injection detection
      - Harmful content filtering
      - PII scrubbing in responses
    """

    def __init__(self, app, **kwargs):
        super().__init__(app, **kwargs)
        self._credentials, _ = google_auth_default(
            scopes=["https://www.googleapis.com/auth/cloud-platform"]
        )
        self._http_client = httpx.AsyncClient(timeout=5.0)
        self._armor_url = (
            f"https://{settings.model_armor_endpoint}/v1/projects/{settings.gcp_project_id}"
            f"/locations/{settings.gcp_region}/templates/{settings.model_armor_template_id}:sanitizeUserPrompt"
        )

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip non-POST/PUT requests and bypass paths
        if request.method not in ("POST", "PUT"):
            return await call_next(request)

        if request.url.path in BYPASS_PATHS:
            return await call_next(request)

        # Only screen JSON content
        content_type = request.headers.get("content-type", "")
        if "application/json" not in content_type:
            return await call_next(request)

        # Read and parse body
        body_bytes = await request.body()
        if not body_bytes:
            return await call_next(request)

        try:
            body = json.loads(body_bytes)
        except json.JSONDecodeError:
            return await call_next(request)

        # Extract text fields to screen
        texts_to_screen = []
        for field in TEXT_FIELD_PATHS:
            value = body.get(field)
            if isinstance(value, str) and value.strip():
                texts_to_screen.append(value)

        if not texts_to_screen:
            return await call_next(request)

        # Screen all text fields
        combined_text = " ".join(texts_to_screen)

        try:
            blocked, reason = await self._screen_text(combined_text, request)
        except Exception as e:
            logger.error(
                "model_armor.error",
                path=request.url.path,
                error=str(e),
            )
            # Fail-open: log and allow on armor service errors
            return await call_next(request)

        if blocked:
            logger.warning(
                "model_armor.blocked",
                path=request.url.path,
                reason=reason,
                request_id=request.state.request_id,
            )
            return JSONResponse(
                status_code=400,
                content={
                    "error": "CONTENT_POLICY_VIOLATION",
                    "message": "Your request was blocked by content safety policies.",
                    "request_id": getattr(request.state, "request_id", ""),
                },
            )

        # Rebuild request with original body for downstream handlers
        async def receive_override():
            return {"type": "http.request", "body": body_bytes}

        request._receive = receive_override
        return await call_next(request)

    async def _screen_text(self, text: str, request: Request) -> tuple[bool, str]:
        """
        Call Model Armor sanitizeUserPrompt API.

        Returns (is_blocked, reason).
        """
        # Refresh credentials if needed
        if not self._credentials.valid:
            self._credentials.refresh(GoogleAuthRequest())

        auth_header = f"Bearer {self._credentials.token}"

        payload = {
            "user_prompt_data": {
                "text": text,
            }
        }

        start = time.monotonic()
        response = await self._http_client.post(
            self._armor_url,
            json=payload,
            headers={
                "Authorization": auth_header,
                "Content-Type": "application/json",
                "X-Goog-Request-Params": f"name=projects/{settings.gcp_project_id}/locations/{settings.gcp_region}/templates/{settings.model_armor_template_id}",
            },
        )
        elapsed = time.monotonic() - start

        logger.debug(
            "model_armor.screen",
            status=response.status_code,
            elapsed_ms=round(elapsed * 1000),
        )

        if response.status_code != 200:
            # Non-200 from armor → fail-open
            return False, ""

        result = response.json()

        # Parse Model Armor response
        sanitization_result = result.get("sanitizationResult", {})
        filter_results = sanitization_result.get("filterResults", {})

        # Check for jailbreak or injection violations
        for filter_name, filter_result in filter_results.items():
            filter_match = filter_result.get("raiFilterResult", {}) or filter_result.get("piAndJailbreakFilterResult", {})
            if filter_match.get("executionState") == "EXECUTION_STATE_SUCCESS":
                match_state = filter_match.get("matchState", "")
                if match_state == "MATCH_FOUND":
                    return True, f"{filter_name}: MATCH_FOUND"

        return False, ""
