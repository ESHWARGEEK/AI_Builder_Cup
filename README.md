# Enterprise Knowledge & Task Assistant (EKA)

> Production-grade AP/Finance workflow automation on Google Cloud — powered by Google Agent Development Kit (ADK), Vertex AI, and Next.js 14.

## Repository Structure

```
enterprise-knowledge-assistant/
├── frontend/               # Next.js 14 App Router
│   ├── app/                # Pages and layouts
│   ├── components/         # UI components (shadcn/ui)
│   ├── lib/                # API clients, SSE hooks
│   └── types/              # TypeScript types
├── backend/                # Python FastAPI + ADK
│   ├── api/                # FastAPI routers
│   ├── agents/             # ADK agent definitions
│   ├── engines/            # RAG, DocAI, Verification engines
│   ├── governance/         # AAL-3 governor
│   ├── security/           # Model Armor integration
│   └── tools/              # ADK FunctionTools
├── infra/
│   ├── terraform/          # All GCP resources
│   └── cloudbuild/         # CI/CD pipelines
└── docs/                   # Architecture decisions
```

## Quick Start

```bash
cp .env.example .env
# Fill in your GCP values

cd infra/terraform && terraform init && terraform apply
cd backend && gcloud builds submit --config=../infra/cloudbuild/backend.yaml
cd frontend && npm install && npm run dev
```

## AAL-3 Governance Rules

| Condition | Action |
|-----------|--------|
| Amount < $1,000 AND confidence > 95% AND no policy flags | Auto-process |
| Amount >= $1,000 OR confidence <= 95% OR policy flag | HALT -> HITL |
| Duplicate detected | HALT -> HITL |
| Arithmetic mismatch | HALT -> HITL |

## SLA Targets

| Operation | Target |
|-----------|--------|
| RAG Policy Query | <= 3 seconds |
| Document Extraction | <= 15 seconds |
