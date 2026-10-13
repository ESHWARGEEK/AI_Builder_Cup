# Engineering Task Implementation Plan (tasks.md)
## Project: NexusWork — Autonomous Enterprise Compliance & Workspace Proxy Agent

**Target Platform:** Antigravity / Vibe Coding Execution  
**Stack:** Next.js 14 (App Router, TailwindCSS, Lucide, React-PDF), Python 3.12 (FastAPI, Google ADK, Document AI SDK, Google GenAI SDK), Firestore, AlloyDB/PostgreSQL, Cloud Run.

---

## Task Progress Overview

- [x] **Phase 1: Environment & Project Scaffolding**
- [x] **Phase 2: Multimodal Ingestion & Document AI Integration (Base)**
- [x] **Phase 3: Vertex AI Search & Policy Grounding Engine (Base)**
- [x] **Phase 4: Deterministic Guardrails & AAL 3 Engine (Base + Governance)**
- [x] **Phase 5: Autonomous Compliance & Redline Clause Generator (Idea 1)**
- [x] **Phase 6: AutoWorkspace Proxy & Artifact Generation Engine (Idea 2)**
- [x] **Phase 7: Full-Stack Next.js 14 Cockpit & Side-by-Side UI**
- [x] **Phase 8: End-to-End Verification & Demonstration Scenarios**
- [x] **Phase 9: Google Stitch Swiss Obsidian Executive Design Integration**

---

## Detailed Task Breakdown

### Phase 1: Environment & Project Scaffolding
- [x] **T1.1:** Initialize monorepo directory structure:
  - `/frontend`: Next.js 14 App Router, TailwindCSS, shadcn/ui.
  - `/backend`: Python FastAPI service utilizing Google Agent Development Kit (ADK).
  - `/shared`: Shared TypeScript/Pydantic schemas (InvoicePayload, ComplianceReport, ApprovalTicket).
- [x] **T1.2:** Configure Python environment (`requirements.txt`) with:
  - `google-cloud-documentai`, `google-cloud-discoveryengine`, `google-genai`, `google-cloud-firestore`, `fastapi`, `uvicorn`, `pydantic`.
- [x] **T1.3:** Set up mock database clients & local emulation for Firestore and AlloyDB audit schemas.

### Phase 2: Multimodal Ingestion & Document AI Integration
- [x] **T2.1:** Implement `services/document_ai_service.py`:
  - Wrap Google Cloud Document AI Client (`InvoiceProcessor` and `ContractProcessor`).
  - Extract entities: `invoice_id`, `vendor_name`, `invoice_date`, `line_items`, `tax_amount`, `total_amount`.
  - Extract bounding poly vertices and normalized entity confidence scores (0.0 - 1.0).
- [x] **T2.2:** Build async GCS upload handler with fallback to direct multi-part file ingestion for local demo execution.
- [x] **T2.3:** Implement schema normalizer converting Document AI raw protobuf into standardized `ParsedDocument` JSON.

### Phase 3: Vertex AI Search & Policy Grounding Engine
- [x] **T3.1:** Implement `services/rag_engine.py`:
  - Connect to Vertex AI Search Datastore indexing internal enterprise policies (Travel & Expense, Procurement Guidelines, Vendor Code of Conduct).
  - Configure grounding configuration using Gemini 1.5 Pro with temperature 0.1.
- [x] **T3.2:** Enforce mandatory inline citation parser extracting source document title, page number, and snippet for UI reference chips.
- [x] **T3.3:** Add query intent classifier: Distinguish between general policy Q&A vs. document evaluation triggers.

### Phase 4: Deterministic Guardrails & AAL 3 Engine
- [x] **T4.1:** Implement deterministic math validation tool in `tools/math_validator.py`:
  - `verify_invoice_math(line_items, tax, discount, total)` using Python `decimal.Decimal` to guarantee 2-decimal precision.
- [x] **T4.2:** Implement vendor validation & duplicate check tool in `tools/vendor_checker.py`:
  - Query existing records for duplicate `(vendor_id, invoice_number)`.
- [x] **T4.3:** Build AAL 3 Autonomy Evaluator (`tools/aal_policy_engine.py`):
  - Rule 1: `total_amount < 1000.00`
  - Rule 2: `min(confidence_scores) >= 0.95`
  - Rule 3: `compliance_violations_count == 0`
  - If all True -> Output status: `AUTO_APPROVED`.
  - If any False -> Output status: `HALTED_AWAITING_HITL` with trigger reason.
- [x] **T4.4:** Build immutable audit logger committing forward and compensating reverse payloads to Firestore/AlloyDB.

### Phase 5: Autonomous Compliance & Redline Clause Generator (Idea 1)
- [x] **T5.1:** Implement `services/compliance_auditor.py`:
  - Audit parsed contract/invoice clauses against both corporate rules (e.g., Net 30, liability limits) and regulatory requirements (e.g., cross-border VAT, GDPR clauses).
- [x] **T5.2:** Implement automated clause redline generator:
  - Generate git-style diff objects `{ original_clause, replacement_clause, policy_violation_rationale, severity }`.
- [x] **T5.3:** Create compliance risk badge generator emitting `CRITICAL`, `WARNING`, or `PASSED`.

### Phase 6: AutoWorkspace Proxy & Artifact Generation Engine (Idea 2)
- [x] **T6.1:** Implement `tools/workspace_proxy.py`:
  - Tool `create_audit_ledger_row(sheet_id, invoice_data)`: Appends standardized ledger entry to Google Sheets (or mocked Sheets artifact state).
  - Tool `generate_executive_brief_doc(title, summary, compliance_report)`: Compiles markdown briefing document ready for export.
- [x] **T6.2:** Implement OOO/Proxy state manager (`services/proxy_manager.py`):
  - Ingest simulated incoming workspace events (e.g., vendor invoice received, urgent approval request) and stage them in the approval queue.

### Phase 7: Full-Stack Next.js 14 Cockpit & Side-by-Side UI
- [x] **T7.1:** Build main application layout with 3 interactive zones:
  - **Zone 1 (Left Navigation):** Session drawer, Proxy Mode toggle (Active/OOO), active compliance monitors.
  - **Zone 2 (Center Chat Stream):** Conversational agent chat with real-time SSE token streaming, markdown formatting, citation badges, and HITL action cards.
  - **Zone 3 (Right Dynamic Canvas):** Tabbed viewport featuring:
    - Tab A: PDF Viewer with Document AI bounding-box highlighting.
    - Tab B: Real-Time Compliance Redline Diff viewer.
    - Tab C: Live Google Sheets / Docs Artifact Preview.
- [x] **T7.2:** Implement HITL Approval Modal:
  - Shows visual diff of flagged exceptions, manager approval button with simulated OAuth token sign-off, and one-click rollback trigger.

### Phase 8: End-to-End Verification & Demonstration Scenarios
- [x] **T8.1:** Test Scenario 1 (Safe Action Auto-Approval):
  - Ingest standard invoice: $450.00, 98% confidence, compliant vendor -> Verify auto-execution, Google Sheet row generated, audit logged.
- [x] **T8.2:** Test Scenario 2 (AAL 3 HITL Halt):
  - Ingest high-value invoice: $3,500.00 or confidence 88% -> Verify agent halts, displays approval card, blocks ledger write until approved.
- [x] **T8.3:** Test Scenario 3 (Active Compliance Redline):
  - Ingest vendor agreement with Net 15 payment terms and uncapped liability -> Verify redline diff generated, risk tagged `CRITICAL`, remediation clause suggested.
- [x] **T8.4:** Test Scenario 4 (Proxy OOO Simulation):
  - Toggle Proxy Mode -> Trigger background inbox event -> Verify agent triages and stages artifacts without human intervention.

### Phase 9: Google Stitch Swiss Obsidian Executive Design Integration
- [x] **T9.1:** Import and save Google Stitch HTML export to `frontend/public/stitch.html` for side-by-side reference.
- [x] **T9.2:** Configure `tailwind.config.ts` with Obsidian (`#0d1117`–`#2d333b`) and Executive (`#e6edf3`–`#f85149`) color tokens.
- [x] **T9.3:** Refactor `workspace/page.tsx` to 3-pane Swiss grid layout:
  - 52px Header (NexusWork AP Core, Ledger Synced, Elena Rostova profile).
  - 38px Telemetry Bar (#REQ-2026-EMEA-09, AAL-3, AlloyDB Secured).
  - 240px Left Pane (OOO Proxy toggle, Verification Queue, Grounding References, SPIFFE mTLS).
  - Flex-1 Center (Dell AP Ingest, PDF chip, AP Analysis, HITL Card, Directive input bar).
  - 500px Right Pane (Clause Redline / Document AI / Live Ledger tabs).
- [x] **T9.4:** Restyle `HITLActionCard.tsx` with Obsidian card, deterministic validation matrix, Spiffe ID authorize button.
- [x] **T9.5:** Restyle `RedlineDiffViewer.tsx` with vendor (-) / policy (+) diff cards, Clause 18.1 penalty variance, export action.
- [x] **T9.6:** Restyle `LiveArtifactCanvas.tsx` with AlloyDB multi-region ledger table (Time/Entity/Sum/State), SAP connector.
- [x] **T9.7:** Validate `npm run build` with zero TypeScript errors and commit to `main`.