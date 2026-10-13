# Google Ecosystem Integration Guide
## NexusWork — Autonomous Enterprise Compliance & Workspace Proxy Agent

This guide provides end-to-end instructions for connecting and operationalizing **Google Stitch**, **Google Agent Platform (Agent Development Kit / Vertex AI Agent Builder)**, and **Google AI Studio** with the NexusWork codebase.

---

## Table of Contents
1. [Google Stitch: UI Generation & Token Parity](#1-google-stitch-ui-generation--token-parity)
2. [Google Agent Platform (ADK & Vertex AI Agent Builder)](#2-google-agent-platform-adk--vertex-ai-agent-builder)
3. [Google AI Studio: Prototyping & Schema Enforcement](#3-google-ai-studio-prototyping--schema-enforcement)
4. [Remaining Work & Production Deployment Checklist](#4-remaining-work--production-deployment-checklist)

---

## 1. Google Stitch: UI Generation & Token Parity

**Google Stitch** is Google's multimodal generative UI and rapid design-to-code platform. It enables engineers and designers to describe complex layouts and generate React/Tailwind components with Material Design 3 tokens.

### Step 1.1: Submit the Master Stitch Prompt
Copy and paste the exact prompt provided in [`Project_Documents/design.md`](file:///home/eshwar/.gemini/antigravity-ide/scratch/enterprise-knowledge-assistant/Project_Documents/design.md) (Section 3: Master Google Stitch Prompt) into Google Stitch:

```stitch
Create a modern, high-density Enterprise AI Cockpit application named "NexusWork" for financial analysts, procurement officers, and corporate executives. The interface is built in React, Tailwind CSS, Lucide icons, and Material 3 design principles, featuring a 3-column layout.
...
```

### Step 1.2: Code Extraction & File Mapping
When Stitch generates the component artifacts:
1. **Left Navigation Bar** (Zone 1): Maps directly to `LeftSidebar()` in [`frontend/src/app/workspace/page.tsx`](file:///home/eshwar/.gemini/antigravity-ide/scratch/enterprise-knowledge-assistant/frontend/src/app/workspace/page.tsx).
2. **Center Chat Stage & HITL Action Card** (Zone 2):
   - Conversational stream maps to `CenterStage()` in [`frontend/src/app/workspace/page.tsx`](file:///home/eshwar/.gemini/antigravity-ide/scratch/enterprise-knowledge-assistant/frontend/src/app/workspace/page.tsx).
   - Gatekeeper card maps to [`frontend/src/components/chat/HITLActionCard.tsx`](file:///home/eshwar/.gemini/antigravity-ide/scratch/enterprise-knowledge-assistant/frontend/src/components/chat/HITLActionCard.tsx).
3. **Right Dynamic Canvas** (Zone 3):
   - PDF bounding overlays: [`frontend/src/components/pdf/PDFViewer.tsx`](file:///home/eshwar/.gemini/antigravity-ide/scratch/enterprise-knowledge-assistant/frontend/src/components/pdf/PDFViewer.tsx).
   - Git-style Redline comparisons: [`frontend/src/components/compliance/RedlineDiffViewer.tsx`](file:///home/eshwar/.gemini/antigravity-ide/scratch/enterprise-knowledge-assistant/frontend/src/components/compliance/RedlineDiffViewer.tsx).
   - Live Google Sheets & Docs artifacts: [`frontend/src/components/workspace/LiveArtifactCanvas.tsx`](file:///home/eshwar/.gemini/antigravity-ide/scratch/enterprise-knowledge-assistant/frontend/src/components/workspace/LiveArtifactCanvas.tsx).

### Step 1.3: Connecting Stitch Components to Zustand Store
Wire user interactions directly to the reactive store in [`frontend/src/store/eka-store.ts`](file:///home/eshwar/.gemini/antigravity-ide/scratch/enterprise-knowledge-assistant/frontend/src/store/eka-store.ts):
```tsx
import { useEKAStore } from "@/store/eka-store";

const {
  proxyMode,            // "OOO_INTERCEPTING" | "ACTIVE_ATTENDING"
  setProxyMode,         // Toggle OOO mode
  simulateInboundEvent, // Triggers simulated inbox task
  redlines,             // List of ClauseRedline diffs
  applyRedline,         // Applies approved redline boilerplate
  ledgerRows,           // Live Google Sheets rows
  hitlDecision,         // "PENDING_REVIEW" | "AUTHORIZED" | "REJECTED"
  authorizeHITL,        // Manager OAuth PKCE sign-off
  rejectHITL            // Reverse rollback compensation
} = useEKAStore();
```

---

## 2. Google Agent Platform (ADK & Vertex AI Agent Builder)

NexusWork utilizes the **Google Agent Development Kit (ADK)** on Cloud Run to orchestrate multi-agent workflows, bind deterministic `FunctionTools`, and enforce Allowed Autonomy Level 3 (AAL 3 "Eyes On") controls.

### Step 2.1: Agent Architecture Topology
The agent pipeline runs as a `SequentialAgent` orchestrating specialized subagents and tools:

```
┌────────────────────────────────────────────────────────┐
│             NexusWork ADK Root Orchestrator             │
│  (Ingress Model Armor Filter + Workload Identity SA)   │
└───────────────────────────┬────────────────────────────┘
                            │
       ┌────────────────────┼────────────────────┐
       ▼                    ▼                    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Engine 1:   │     │  Engine 2:   │     │  Engine 3:   │
│ Vertex AI    │     │ Document AI  │     │ Deterministic│
│ Search RAG   │     │ OCR Parser   │     │ Verification │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │
       └────────────────────┼────────────────────┘
                            ▼
       ┌─────────────────────────────────────────┐
       │   AAL 3 Gatekeeper (aal3_governor.py)   │
       │   - Total < $1,000                      │
       │   - Confidence >= 0.95                  │
       │   - Policy Violations == 0              │
       └────────────────────┬────────────────────┘
             Auto-Pass ┌────┴────┐ Violations / >= $1,000
                       ▼         ▼
             ┌───────────┐     ┌───────────────────────┐
             │ Auto-Post │     │ Pause Execution       │
             │ to Sheets │     │ Stage HITL Ticket     │
             └───────────┘     │ Commit Pre-State Roll │
                               └───────────────────────┘
```

### Step 2.2: Registering ADK FunctionTools
The Python backend defines deterministic `FunctionTools` in `backend/tools/`:
* [`backend/tools/verification_tools.py`](file:///home/eshwar/.gemini/antigravity-ide/scratch/enterprise-knowledge-assistant/backend/tools/verification_tools.py):
  - `verify_invoice_totals`: Deterministic math with Python `decimal.Decimal` (zero floating-point drift).
  - `check_vendor_directory`: AlloyDB vendor validation.
  - `detect_duplicate_invoice`: Firestore composite key collision check.
* [`backend/tools/workspace_proxy.py`](file:///home/eshwar/.gemini/antigravity-ide/scratch/enterprise-knowledge-assistant/backend/tools/workspace_proxy.py):
  - `create_audit_ledger_row`: Appends standardized row to Google Sheets AP Ledger.
  - `generate_executive_brief_doc`: Formats markdown briefing document for Google Docs export.
* [`backend/engines/compliance_engine.py`](file:///home/eshwar/.gemini/antigravity-ide/scratch/enterprise-knowledge-assistant/backend/engines/compliance_engine.py):
  - `audit_document`: Generates git-style redline clause diffs with severity badges (`CRITICAL`, `WARNING`, `PASSED`).

### Step 2.3: Cloud Run Deployment with Least-Privilege IAM
Deploy the backend container with Google Cloud Workload Identity:
```bash
# Authenticate & set GCP Project
gcloud config set project YOUR_GCP_PROJECT_ID

# Build & Deploy to Cloud Run
gcloud builds submit --config=infra/cloudbuild/backend.yaml

# Grant least-privilege IAM roles to the Agent Service Account:
gcloud projects add-iam-policy-binding YOUR_GCP_PROJECT_ID \
  --member="serviceAccount:nexuswork-agent-sa@YOUR_GCP_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/discoveryengine.viewer"

gcloud projects add-iam-policy-binding YOUR_GCP_PROJECT_ID \
  --member="serviceAccount:nexuswork-agent-sa@YOUR_GCP_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/documentai.viewer"

gcloud projects add-iam-policy-binding YOUR_GCP_PROJECT_ID \
  --member="serviceAccount:nexuswork-agent-sa@YOUR_GCP_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/datastore.user"
```

---

## 3. Google AI Studio: Prototyping & Schema Enforcement

**Google AI Studio** (`https://aistudio.google.com`) is the fastest environment for prompt tuning, few-shot prompt design, and JSON schema benchmarking for Gemini 1.5 Pro and Gemini 2.0 Flash.

### Step 3.1: API Key Provisioning & Local Environment Setup
1. Navigate to **Google AI Studio** > **Get API Key**.
2. Create an API key bound to your Google Cloud project.
3. Configure your local `.env`:
```bash
GEMINI_API_KEY="AIzaSy..."
GOOGLE_GENAI_MODEL="gemini-1.5-pro"
```

### Step 3.2: AI Studio System Instruction for Compliance Auditing
Paste this system instruction into Google AI Studio to evaluate clause redlining:

```markdown
You are NexusWork Autonomous Compliance Auditor.
Your responsibility:
1. Audit extracted contract clauses and invoice parameters against Enterprise Procurement Guidelines (§8.1 Payment Terms) and Legal Charters (§14.2 Liability Limits).
2. For any clause that specifies payment terms faster than Net 30, flag as WARNING and generate a replacement clause referencing §8.1.
3. For any clause that imposes uncapped or disproportionate liability, flag as CRITICAL and generate a 2x annual fee liability cap boilerplate.
4. Output strictly structured JSON matching the ComplianceReport schema.
```

### Step 3.3: Enforcing Structured JSON Output
In AI Studio, expand **Advanced Settings** > **Structured Output** and supply the Pydantic schema from [`backend/models/compliance.py`](file:///home/eshwar/.gemini/antigravity-ide/scratch/enterprise-knowledge-assistant/backend/models/compliance.py):
```json
{
  "type": "object",
  "properties": {
    "document_id": { "type": "string" },
    "risk_level": { "type": "string", "enum": ["CRITICAL", "WARNING", "PASSED"] },
    "summary": { "type": "string" },
    "redlines": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "clause_type": { "type": "string" },
          "original_clause": { "type": "string" },
          "replacement_clause": { "type": "string" },
          "policy_violation_rationale": { "type": "string" },
          "severity": { "type": "string", "enum": ["CRITICAL", "WARNING", "PASSED"] }
        },
        "required": ["id", "clause_type", "original_clause", "replacement_clause", "severity"]
      }
    }
  },
  "required": ["document_id", "risk_level", "redlines", "summary"]
}
```

### Step 3.4: Transitioning from AI Studio to Vertex AI SDK
The code written for AI Studio seamlessly ports to production Vertex AI by toggling `GOOGLE_GENAI_USE_VERTEXAI=true` in `backend/config.py`:
```python
from google import genai

client = genai.Client(
    vertexai=True,
    project="YOUR_GCP_PROJECT_ID",
    location="us-central1"
)

response = client.models.generate_content(
    model="gemini-1.5-pro",
    contents=document_text,
    config=dict(
        temperature=0.1,
        response_mime_type="application/json",
        response_schema=ComplianceReport,
    ),
)
```

---

## 4. Remaining Work & Production Deployment Checklist

| Task / Integration | Status | Target Component | Action Needed |
| :--- | :--- | :--- | :--- |
| **Tri-Pane UI Presentation** | ✅ Complete | `frontend/src/app/workspace/page.tsx` | Run `npm run dev` to verify in browser |
| **Compliance Redline Diff Viewer** | ✅ Complete | `components/compliance/RedlineDiffViewer.tsx` | Visual git-style diffs with 1-click apply |
| **Live Google Sheets AP Ledger** | ✅ Complete | `components/workspace/LiveArtifactCanvas.tsx` | Real-time row insertion animations |
| **AAL 3 HITL Action Gatekeeper** | ✅ Complete | `components/chat/HITLActionCard.tsx` | OAuth sign-off & AlloyDB rollback triggers |
| **FastAPI Compliance & Proxy Routers**| ✅ Complete | `backend/api/routers/compliance.py` & `proxy.py` | Registered in `backend/main.py` |
| **Google Sheets API Live OAuth Creds**| 🟡 Config Ready | `backend/tools/workspace_proxy.py` | Bind GCP OAuth Client ID in `.env` |
| **Vertex AI Search Datastore ID** | 🟡 Config Ready | `backend/engines/rag_engine.py` | Provide `DATA_STORE_ID` in `.env` |
| **Document AI Processor Endpoint** | 🟡 Config Ready | `backend/engines/docai_engine.py` | Provide `PROCESSOR_ID` in `.env` |

---

## Summary
The NexusWork application architecture is verified, compiled, and ready for deployment. The frontend and backend run seamlessly with simulated fallbacks for immediate local demonstrations, and can be switched to live Google Cloud Platform and Google Workspace APIs simply by providing cloud credentials in `.env`.
