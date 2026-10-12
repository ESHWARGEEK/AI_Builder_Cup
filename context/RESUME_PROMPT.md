# Prompt for AI Assistant on Another Computer

> **Copy and paste the prompt below into your AI coding assistant (Antigravity IDE, Cursor, Claude, ChatGPT, etc.) on your other computer to resume work immediately with 100% context.**

---

```markdown
I am resuming work on the "Enterprise Knowledge & Task Assistant (EKA)" project in this repository.

### 1. Project Background & Architecture
This is a production-grade full-stack monorepo for AP/Finance workflow automation on Google Cloud:
- **Frontend**: Next.js 14 App Router (`frontend/`), TypeScript, TailwindCSS, glassmorphism UI, Framer Motion animations.
  - Dual-Pane UI (`/workspace`): Policy assistant with streaming chat (SSE) and inline citations, side-by-side with an interactive `react-pdf` invoice viewer featuring Document AI 2D bounding-box overlays.
  - Landing page (`/`) with AAL-3 governance rule matrix.
  - AAL-3 Governance & Audit Center (`/audit`) with live filterable audit trail, interactive manager OAuth HITL authorization review, and cryptographic rollback payload viewer.
- **Backend**: Python FastAPI (`backend/`) powered by the Google Agent Development Kit (ADK) on Cloud Run:
  - Root `SequentialAgent` orchestrating:
    1. **Engine 1 (Vertex AI Search / RAG)**: Grounded corporate travel/expense policy retrieval with mandatory inline citations (<=3s SLA).
    2. **Engine 2 (Document AI Invoice Parser)**: Specialized multi-page invoice extraction (<=15s SLA) with sync and async Eventarc + GCS pipelines.
    3. **Engine 3 (Deterministic Verification Suite)**: Python FunctionTools with strict 2-decimal arithmetic (Decimal module, ROUND_HALF_UP, no floating-point drift), AlloyDB vendor reconciliation, and Firestore duplicate detection.
- **AAL-3 ("Eyes On") Governance**:
  - Invoices < $1,000 AND confidence > 95% AND 0 policy flags automatically process (`AUTO_PROCESS`).
  - Invoices >= $1,000, confidence <= 95%, or arithmetic/vendor/duplicate discrepancy immediately halt execution (`HALT_HITL`), persist an immutable pre-state rollback payload in AlloyDB, and dispatch manager OAuth review tickets.
- **Security**: Ingress Model Armor middleware for prompt injection defense, Workload Identity federation, and indirect prompt injection OCR scanning.
- **Infrastructure**: Terraform (`infra/terraform/`) and Cloud Build CI/CD pipelines (`infra/cloudbuild/`).

### 2. Chat Context & Prior Work
The full chronological conversation transcript, previous tool calls, and decisions are saved in this repository in:
- `context/CHAT_TRANSCRIPT.md` (human/AI readable complete history)
- `context/transcript.jsonl` (raw system transcript)
- `docs/ARCHITECTURE.md` (architecture specification and diagrams)
- `docs/ADR-001-AAL3-GOVERNANCE.md` & `docs/ADR-002-MODEL-ARMOR-PROMPT-INJECTION.md`

### 3. Current State
- The frontend has been verified with `npm run build` (Next.js 14.2.24 / Node 18) and runs on `http://localhost:3000`.
- All code has been committed to branch `main`.

Please inspect `context/CHAT_TRANSCRIPT.md` and `docs/ARCHITECTURE.md`, confirm your understanding of the architecture, and let me know you are ready to continue the task.
```
