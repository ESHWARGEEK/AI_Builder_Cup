# Engineering Task Implementation Plan (tasks.md)
## Project: NexusWork — Autonomous Enterprise Compliance & Workspace Proxy Agent

**Target Platform:** Antigravity / Vibe Coding Execution  
**Stack:** Next.js 14 (App Router, TailwindCSS, Lucide, React-PDF), Python 3.12 (FastAPI, Google ADK, Document AI SDK, Google GenAI SDK), Firestore, AlloyDB/PostgreSQL, Cloud Run.

---

## Task Progress Overview

- [ ] **Phase 1: Environment & Project Scaffolding**
- [ ] **Phase 2: Multimodal Ingestion & Document AI Integration (Base)**
- [ ] **Phase 3: Vertex AI Search & Policy Grounding Engine (Base)**
- [ ] **Phase 4: Deterministic Guardrails & AAL 3 Engine (Base + Governance)**
- [ ] **Phase 5: Autonomous Compliance & Redline Clause Generator (Idea 1)**
- [ ] **Phase 6: AutoWorkspace Proxy & Artifact Generation Engine (Idea 2)**
- [ ] **Phase 7: Full-Stack Next.js 14 Cockpit & Side-by-Side UI**
- [ ] **Phase 8: End-to-End Verification & Demonstration Scenarios**

---

## Detailed Task Breakdown

### Phase 1: Environment & Project Scaffolding
- [ ] **T1.1:** Initialize monorepo directory structure:
  - `/frontend`: Next.js 14 App Router, TailwindCSS, shadcn/ui.
  - `/backend`: Python FastAPI service utilizing Google Agent Development Kit (ADK).
  - `/shared`: Shared TypeScript/Pydantic schemas (InvoicePayload, ComplianceReport, ApprovalTicket).
- [ ] **T1.2:** Configure Python environment (`requirements.txt`) with:
  - `google-cloud-documentai`, `google-cloud-discoveryengine`, `google-genai`, `google-cloud-firestore`, `fastapi`, `uvicorn`, `pydantic`.
- [ ] **T1.3:** Set up mock database clients & local emulation for Firestore and AlloyDB audit schemas.

### Phase 2: Multimodal Ingestion & Document AI Integration
- [ ] **T2.1:** Implement `services/document_ai_service.py`:
  - Wrap Google Cloud Document AI Client (`InvoiceProcessor` and `ContractProcessor`).
  - Extract entities: `invoice_id`, `vendor_name`, `invoice_date`, `line_items`, `tax_amount`, `total_amount`.
  - Extract bounding poly vertices and normalized entity confidence scores (0.0 - 1.0).
- [ ] **T2.2:** Build async GCS upload handler with fallback to direct multi-part file ingestion for local demo execution.
- [ ] **T2.3:** Implement schema normalizer converting Document AI raw protobuf into standardized `ParsedDocument` JSON.

### Phase 3: Vertex AI Search & Policy Grounding Engine
- [ ] **T3.1:** Implement `services/rag_engine.py`:
  - Connect to Vertex AI Search Datastore indexing internal enterprise policies (Travel & Expense, Procurement Guidelines, Vendor Code of Conduct).
  - Configure grounding configuration using Gemini 1.5 Pro with temperature 0.1.
- [ ] **T3.2:** Enforce mandatory inline citation parser extracting source document title, page number, and snippet for UI reference chips.
- [ ] **T3.3:** Add query intent classifier: Distinguish between general policy Q&A vs. document evaluation triggers.

### Phase 4: Deterministic Guardrails & AAL 3 Engine
- [ ] **T4.1:** Implement deterministic math validation tool in `tools/math_validator.py`:
  - `verify_invoice_math(line_items, tax, discount, total)` using Python `decimal.Decimal` to guarantee 2-decimal precision.
- [ ] **T4.2:** Implement vendor validation & duplicate check tool in `tools/vendor_checker.py`:
  - Query existing records for duplicate `(vendor_id, invoice_number)`.
- [ ] **T4.3:** Build AAL 3 Autonomy Evaluator (`tools/aal_policy_engine.py`):
  - Rule 1: `total_amount < 1000.00`
  - Rule 2: `min(confidence_scores) >= 0.95`
  - Rule 3: `compliance_violations_count == 0`
  - If all True -> Output status: `AUTO_APPROVED`.
  - If any False -> Output status: `HALTED_AWAITING_HITL` with trigger reason.
- [ ] **T4.4:** Build immutable audit logger committing forward and compensating reverse payloads to Firestore/AlloyDB.

### Phase 5: Autonomous Compliance & Redline Clause Generator (Idea 1)
- [ ] **T5.1:** Implement `services/compliance_auditor.py`:
  - Audit parsed contract/invoice clauses against both corporate rules (e.g., Net 30, liability limits) and regulatory requirements (e.g., cross-border VAT, GDPR clauses).
- [ ] **T5.2:** Implement automated clause redline generator:
  - Generate git-style diff objects `{ original_clause, replacement_clause, policy_violation_rationale, severity }`.
- [ ] **T5.3:** Create compliance risk badge generator emitting `CRITICAL`, `WARNING`, or `PASSED`.

### Phase 6: AutoWorkspace Proxy & Artifact Generation Engine (Idea 2)
- [ ] **T6.1:** Implement `tools/workspace_proxy.py`:
  - Tool `create_audit_ledger_row(sheet_id, invoice_data)`: Appends standardized ledger entry to Google Sheets (or mocked Sheets artifact state).
  - Tool `generate_executive_brief_doc(title, summary, compliance_report)`: Compiles markdown briefing document ready for export.
- [ ] **T6.2:** Implement OOO/Proxy state manager (`services/proxy_manager.py`):
  - Ingest simulated incoming workspace events (e.g., vendor invoice received, urgent approval request) and stage them in the approval queue.

### Phase 7: Full-Stack Next.js 14 Cockpit & Side-by-Side UI
- [ ] **T7.1:** Build main application layout with 3 interactive zones:
  - **Zone 1 (Left Navigation):** Session drawer, Proxy Mode toggle (Active/OOO), active compliance monitors.
  - **Zone 2 (Center Chat Stream):** Conversational agent chat with real-time SSE token streaming, markdown formatting, citation badges, and HITL action cards.
  - **Zone 3 (Right Dynamic Canvas):** Tabbed viewport featuring:
    - Tab A: PDF Viewer with Document AI bounding-box highlighting.
    - Tab B: Real-Time Compliance Redline Diff viewer.
    - Tab C: Live Google Sheets / Docs Artifact Preview.
- [ ] **T7.2:** Implement HITL Approval Modal:
  - Shows visual diff of flagged exceptions, manager approval button with simulated OAuth token sign-off, and one-click rollback trigger.

### Phase 8: End-to-End Verification & Demonstration Scenarios
- [ ] **T8.1:** Test Scenario 1 (Safe Action Auto-Approval):
  - Ingest standard invoice: $450.00, 98% confidence, compliant vendor -> Verify auto-execution, Google Sheet row generated, audit logged.
- [ ] **T8.2:** Test Scenario 2 (AAL 3 HITL Halt):
  - Ingest high-value invoice: $3,500.00 or confidence 88% -> Verify agent halts, displays approval card, blocks ledger write until approved.
- [ ] **T8.3:** Test Scenario 3 (Active Compliance Redline):
  - Ingest vendor agreement with Net 15 payment terms and uncapped liability -> Verify redline diff generated, risk tagged `CRITICAL`, remediation clause suggested.
- [ ] **T8.4:** Test Scenario 4 (Proxy OOO Simulation):
  - Toggle Proxy Mode -> Trigger background inbox event -> Verify agent triages and stages artifacts without human intervention.