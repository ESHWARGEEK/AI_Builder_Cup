# Enterprise Knowledge & Task Assistant (EKA) — Architecture Specification

> **Google Cloud Reference Architecture**: Production-grade AP/Finance workflow automation powered by Google Agent Development Kit (ADK), Vertex AI, Document AI, AlloyDB, and Next.js 14 App Router.

---

## 1. Executive Summary

Enterprise Knowledge & Task Assistant (EKA) automates accounts payable (AP) and expense workflows by unifying three core GCP AI capabilities under strict **Allowed Autonomy Level 3 (AAL-3 "Eyes On")** governance:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           Next.js 14 App Router                                 │
│      Dual-Pane UI: Streaming Chat (SSE) + react-pdf Bounding-Box Overlays       │
└──────────────────────────────────────┬──────────────────────────────────────────┘
                                       │ HTTPS / SSE
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    Cloud Run: Python FastAPI + Google ADK                       │
│                        Model Armor Ingress Screening                            │
├──────────────────────────────────────┬──────────────────────────────────────────┤
│ Engine 1: Vertex AI Search / RAG     │ Engine 2: Document AI Invoice Parser     │
│   • Grounded Travel & Expense Policy │   • Sync (<15s) & Async (Eventarc + GCS) │
│   • Mandatory Inline Citations       │   • 2D Normalised Bounding Boxes         │
├──────────────────────────────────────┴──────────────────────────────────────────┤
│ Engine 3: Deterministic Verification Suite (Python FunctionTools)              │
│   • Strict 2-decimal arithmetic validation (Decimal module, avoid IEEE 754)     │
│   • Approved vendor ID reconciliation against AlloyDB                           │
│   • Duplicate invoice detection against Firestore by hash & compound key        │
├─────────────────────────────────────────────────────────────────────────────────┤
│ AAL-3 ("Eyes On") Governance Engine                                             │
│   • Auto-Process: Total < $1,000 AND Confidence > 95% AND 0 Policy Flags       │
│   • Halt & HITL: Total >= $1,000 OR Confidence <= 95% OR Policy Mismatch        │
│   • Immutable Audit Trail: AlloyDB JSONB record + cryptographic state rollback  │
│   • Manager OAuth 2.0 Authorization Ticket & Notification                       │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Three Core Engines

### 2.1 Engine 1: Vertex AI Search / RAG Engine
- **Corpus**: Corporate travel policies, expense caps, per-diem tables, and approval matrices indexed in Vertex AI Search Datastores.
- **Grounding**: All generated answers require strict inline citations mapped to source chunk URIs and title metadata.
- **Latency Target**: $\le 3.0$ seconds round-trip.
- **Fallback**: Local semantic embedding cache and curated corporate policy knowledge items for local dev.

### 2.2 Engine 2: Document AI Specialized Invoice Parser
- **Processor Type**: Specialized `INVOICE_PROCESSOR` (v1/v2).
- **Extraction Schema**:
  - `invoice_id`, `invoice_date`, `due_date`
  - `supplier_name`, `supplier_tax_id`, `supplier_address`
  - `net_amount`, `total_tax_amount`, `total_amount`
  - `line_item/*` (description, quantity, unit_price, amount)
  - Normalized 2D bounding boxes: `[x, y, width, height]` mapped to PDF page dimensions for frontend canvas overlay.
- **Processing Modes**:
  1. **Synchronous**: Direct PDF bytes upload for real-time review ($\le 15$ seconds SLA).
  2. **Asynchronous**: Cloud Storage bucket drop triggering an Eventarc webhook.

### 2.3 Engine 3: Deterministic Verification Suite
Implemented via Python `FunctionTool` wrappers:
1. **Strict 2-Decimal Arithmetic Checker**:
   - Uses `decimal.Decimal` with `ROUND_HALF_UP` to prevent floating-point drift.
   - Evaluates: $|\text{net} + \text{tax} - \text{total}| \le \$0.01$ and $\sum \text{line\_items} \approx \text{net}$.
2. **Vendor Reconciler**:
   - Queries AlloyDB `approved_vendors` table for active status and payment terms.
3. **Duplicate Detector**:
   - Computes SHA-256 of document content and compound key `invoice_number|vendor_id|total`.
   - Checks Firestore index for prior settled occurrences.

---

## 3. Allowed Autonomy Level 3 (AAL-3 "Eyes On") Governance

| Condition | Outcome | Action Taken |
|---|---|---|
| Total $< \$1,000$ AND Confidence $> 95\%$ AND Zero Flags | **AUTO_PROCESS** | Transaction committed, audit record logged in AlloyDB |
| Total $\ge \$1,000$ | **HALT_HITL** | Execution halted, rollback snapshot stored, manager OAuth ticket generated |
| OCR Confidence $\le 95\%$ | **HALT_HITL** | Execution halted, unconfident fields highlighted on PDF canvas |
| Arithmetic Delta $> \$0.01$ | **HALT_HITL** | Execution halted, calculation discrepancy flagged |
| Duplicate Detected | **HALT_HITL** | Quarantined, matched prior transaction ID attached |
| Unknown Vendor | **HALT_HITL** | Quarantined, vendor registration review dispatched |

---

## 4. Security & Least Privilege

1. **Cloud Run Ingress**:
   - Protected by Google Cloud Armor and Model Armor middleware.
   - Pre-screens incoming requests for prompt injection (direct) and poisoned OCR text (indirect).
2. **Workload Identity Federation**:
   - Zero static service account keys.
   - Service account `eka-backend-sa` holds least-privilege roles:
     - `roles/aiplatform.user`
     - `roles/documentai.viewer`
     - `roles/alloydb.client`
     - `roles/datastore.user`
     - `roles/storage.objectViewer`
3. **Manager OAuth Authorization**:
   - Manager approval endpoints require verified Google Workspace OIDC Bearer tokens.
