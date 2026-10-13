# NexusWork — Autonomous Enterprise Compliance & Workspace Proxy Agent

> Production-grade AP/Finance and Contract Compliance Automation on Google Cloud — powered by Google Agent Development Kit (ADK), Vertex AI, Document AI, and Next.js 14.

---

## Key Features

1. **Grounded Policy Intelligence (Base):** Instant retrieval and grounded synthesis over enterprise manuals with mandatory inline citations (≤3s SLA).
2. **Specialized Multimodal Extraction (Base):** Automated Document AI ingestion for invoices and contracts with 2D bounding-box overlays (≤15s SLA).
3. **Active Compliance & Redline Clause Generator (Idea 1):** Real-time pre-execution auditing of agreements against corporate policies and GDPR/EU regulations, producing automated git-style redline clause diffs.
4. **AutoWorkspace Proxy & Artifact Engine (Idea 2):** Autonomous Out-of-Office (OOO) task interception, appending rows to a live Google Sheets AP Audit Ledger and drafting Google Docs Executive Briefs.
5. **Deterministic AAL 3 ("Eyes On") Governance:** Python `decimal.Decimal` 2-decimal arithmetic assertion, vendor reconciliation, duplicate detection, and manager OAuth PKCE sign-off gatekeeper with immutable reverse rollback trails.

---

## Documentation & Architecture

* **[Project PRD](Project_Documents/PRD.md):** Complete Product Requirements Document.
* **[Design & Stitch Spec](Project_Documents/design.md):** Tri-Pane Enterprise Cockpit UI design & Master Google Stitch prompt.
* **[Engineering Task Plan](Project_Documents/tasks.md):** Detailed implementation breakdown across 8 phases.
* **[Google Ecosystem Integration Guide](docs/GOOGLE_INTEGRATION_GUIDE.md):** Step-by-step instructions for **Google Stitch**, **Google Agent Platform**, and **Google AI Studio**.
* **[Architecture Specification](docs/ARCHITECTURE.md):** Full system topology and data flow diagrams.

---

## Repository Structure

```
enterprise-knowledge-assistant/
├── frontend/                     # Next.js 14 App Router Tri-Pane Cockpit
│   ├── app/                      # / (Landing), /workspace (Cockpit), /audit (Ledger)
│   ├── components/
│   │   ├── chat/                 # ChatPanel, HITLActionCard
│   │   ├── compliance/           # RedlineDiffViewer (Git-style diffs)
│   │   ├── workspace/            # LiveArtifactCanvas (Sheets & Docs)
│   │   └── pdf/                  # PDFViewer (Document AI 2D overlays)
│   ├── store/                    # Zustand reactive store (eka-store.ts)
│   └── lib/                      # Typed API client & SSE streaming
├── backend/                      # Python FastAPI + Google ADK
│   ├── api/routers/              # chat, documents, invoices, audit, compliance, proxy
│   ├── engines/                  # docai_engine, rag_engine, compliance_engine, proxy_manager
│   ├── tools/                    # verification_tools, workspace_proxy
│   ├── models/                   # Pydantic schemas (invoice, compliance, workspace)
│   └── governance/               # AAL 3 state machine & audit loggers
├── Project_Documents/            # PRD.md, design.md, tasks.md
└── docs/                         # Integration guides & architectural decision records
```

---

## Quick Start

### 1. Backend Service
```bash
cp .env.example .env
# Fill in your GCP project & credential values

cd backend
# Run with FastAPI / Uvicorn
uvicorn main:app --host 0.0.0.0 --port 8080 --reload
```

### 2. Frontend Cockpit
```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000/workspace to access the Tri-Pane Cockpit
```

---

## AAL-3 Governance Rules Matrix

| Condition | Action | Result |
| :--- | :--- | :--- |
| Amount < $1,000 AND Confidence ≥ 95% AND 0 Policy Flags | Auto-Process | Appends to Sheets Ledger; commits forward audit log |
| Amount ≥ $1,000 OR Confidence < 95% | HALT → HITL Review | Execution paused; stages OAuth sign-off card |
| Policy Violation (Payment Terms / Uncapped Liability) | Flag Redline | Generates git-style diff; requires remediation |
| Duplicate Detected (Composite Key Match) | HALT → Blocked | Blocks mutation; prevents double payment |
| Arithmetic Mismatch (±$0.01 tolerance) | HALT → Blocked | Rejects invoice; triggers vendor correction |
