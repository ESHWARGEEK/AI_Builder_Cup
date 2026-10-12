"""
HITL Notification Dispatcher

Sends review tickets via:
  1. Google Chat webhook with formatted card message
  2. SendGrid email with OAuth approval deep-link

Both channels include a clickable approval URL that validates
an HMAC-signed token before allowing manager action.
"""
from __future__ import annotations

import json
from datetime import datetime
from typing import Any, Dict

import httpx
import structlog
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

from config import get_settings

logger = structlog.get_logger(__name__)
settings = get_settings()


async def dispatch_hitl_notification(
    ticket: Dict[str, Any],
    approval_url: str,
) -> None:
    """
    Dispatch HITL notifications via Google Chat and email.
    Errors are logged but do not block the main pipeline.
    """
    import asyncio

    tasks = [
        _send_google_chat(ticket, approval_url),
        _send_email(ticket, approval_url),
    ]

    results = await asyncio.gather(*tasks, return_exceptions=True)

    for i, result in enumerate(results):
        channel = ["google_chat", "email"][i]
        if isinstance(result, Exception):
            logger.error(
                "hitl.notification.error",
                channel=channel,
                error=str(result),
                ticket_id=ticket.get("id"),
            )
        else:
            logger.info("hitl.notification.sent", channel=channel, ticket_id=ticket.get("id"))


async def _send_google_chat(ticket: Dict[str, Any], approval_url: str) -> None:
    """Send formatted Google Chat card with approval button."""
    violations_text = "\n".join(
        f"• {v}" for v in ticket.get("violations", [])
    )

    payload = {
        "cardsV2": [
            {
                "cardId": f"hitl-{ticket['id'][:8]}",
                "card": {
                    "header": {
                        "title": "🔴 Invoice Review Required (AAL-3 HALT)",
                        "subtitle": f"Invoice #{ticket.get('invoice_number', 'N/A')}",
                        "imageUrl": "https://fonts.gstatic.com/s/i/googlematerialicons/warning/v14/24px.svg",
                        "imageType": "CIRCLE",
                    },
                    "sections": [
                        {
                            "header": "Invoice Details",
                            "widgets": [
                                {
                                    "decoratedText": {
                                        "topLabel": "Vendor ID",
                                        "text": ticket.get("vendor_id", "N/A"),
                                    }
                                },
                                {
                                    "decoratedText": {
                                        "topLabel": "Total Amount",
                                        "text": f"${ticket.get('total_amount_usd', 0):.2f} USD",
                                    }
                                },
                                {
                                    "decoratedText": {
                                        "topLabel": "Confidence Score",
                                        "text": f"{ticket.get('confidence_score', 0) * 100:.1f}%",
                                    }
                                },
                                {
                                    "decoratedText": {
                                        "topLabel": "Violations",
                                        "text": violations_text or "See details",
                                        "wrapText": True,
                                    }
                                },
                                {
                                    "decoratedText": {
                                        "topLabel": "Created At",
                                        "text": ticket.get("created_at", ""),
                                    }
                                },
                            ],
                        },
                        {
                            "widgets": [
                                {
                                    "buttonList": {
                                        "buttons": [
                                            {
                                                "text": "📋 Review & Approve",
                                                "onClick": {
                                                    "openLink": {"url": approval_url}
                                                },
                                                "color": {
                                                    "red": 0.11,
                                                    "green": 0.73,
                                                    "blue": 0.36,
                                                    "alpha": 1,
                                                },
                                            },
                                            {
                                                "text": "View Audit Trail",
                                                "onClick": {
                                                    "openLink": {
                                                        "url": f"{settings.hitl_review_base_url}/audit/{ticket.get('audit_entry_id')}"
                                                    }
                                                },
                                            },
                                        ]
                                    }
                                }
                            ]
                        },
                    ],
                },
            }
        ]
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(
            settings.google_chat_webhook_url.get_secret_value(),
            json=payload,
            headers={"Content-Type": "application/json"},
        )
        response.raise_for_status()


async def _send_email(ticket: Dict[str, Any], approval_url: str) -> None:
    """Send HTML email via SendGrid with approval link."""
    violations_html = "".join(
        f"<li><strong>{v}</strong></li>" for v in ticket.get("violations", [])
    )

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {{ font-family: Arial, sans-serif; color: #333; }}
        .header {{ background: #c62828; color: white; padding: 20px; }}
        .content {{ padding: 20px; }}
        .detail-table {{ border-collapse: collapse; width: 100%; }}
        .detail-table td {{ padding: 8px 12px; border-bottom: 1px solid #eee; }}
        .detail-table td:first-child {{ font-weight: bold; color: #555; width: 180px; }}
        .violations {{ background: #fff3e0; border-left: 4px solid #f57c00; padding: 12px; margin: 16px 0; }}
        .approve-btn {{
          display: inline-block;
          background: #1b5e20;
          color: white !important;
          padding: 14px 32px;
          border-radius: 4px;
          text-decoration: none;
          font-size: 16px;
          margin-top: 20px;
        }}
        .footer {{ color: #999; font-size: 12px; padding: 20px; border-top: 1px solid #eee; }}
      </style>
    </head>
    <body>
      <div class="header">
        <h2>⚠️ Invoice Review Required — AAL-3 HALT</h2>
        <p>Invoice #{ticket.get('invoice_number', 'N/A')} requires your authorization</p>
      </div>
      <div class="content">
        <table class="detail-table">
          <tr><td>Invoice Number</td><td>{ticket.get('invoice_number', 'N/A')}</td></tr>
          <tr><td>Vendor ID</td><td>{ticket.get('vendor_id', 'N/A')}</td></tr>
          <tr><td>Total Amount</td><td><strong>${ticket.get('total_amount_usd', 0):.2f} USD</strong></td></tr>
          <tr><td>Confidence Score</td><td>{ticket.get('confidence_score', 0) * 100:.1f}%</td></tr>
          <tr><td>Ticket ID</td><td><code>{ticket.get('id', '')}</code></td></tr>
          <tr><td>Audit Entry ID</td><td><code>{ticket.get('audit_entry_id', '')}</code></td></tr>
          <tr><td>Created At</td><td>{ticket.get('created_at', '')}</td></tr>
        </table>

        <div class="violations">
          <strong>🚨 Governance Violations Detected:</strong>
          <ul>{violations_html}</ul>
        </div>

        <p>Please review the invoice details and take action:</p>
        <a href="{approval_url}" class="approve-btn">📋 Review & Approve Invoice</a>
        <p style="margin-top: 16px; color: #666;">
          This link contains a secure token and expires per your organization's SLA policy.
          OAuth authentication is required to complete the review.
        </p>
      </div>
      <div class="footer">
        <p>Enterprise Knowledge Assistant | AP/Finance Automation</p>
        <p>This is an automated message. Do not reply directly to this email.</p>
        <p>Audit Trail Entry: {ticket.get('audit_entry_id', '')}</p>
      </div>
    </body>
    </html>
    """

    message = Mail(
        from_email=settings.sendgrid_from_email,
        to_emails=settings.manager_email,
        subject=f"[ACTION REQUIRED] Invoice Review: #{ticket.get('invoice_number', 'N/A')} — ${ticket.get('total_amount_usd', 0):.2f}",
        html_content=html_content,
    )

    sg = SendGridAPIClient(settings.sendgrid_api_key.get_secret_value())
    # SendGrid client is sync — run in executor
    import asyncio

    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, sg.send, message)
