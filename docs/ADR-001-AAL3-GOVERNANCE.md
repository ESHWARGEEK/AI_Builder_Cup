# ADR 001: Allowed Autonomy Level 3 (AAL-3 "Eyes On") with Immutable Rollback

## Status
Accepted

## Context
Automating financial disbursements and AP invoice ingestion requires safeguarding against hallucinations, OCR degradation, arithmetic drift, and adversarial attacks. While fully autonomous agents (AAL-4/5) can operate unattended for low-risk workflows, enterprise financial regulations (SOX compliance, GAAP, SOC 2 Type II) require human oversight ("Eyes On") whenever high-value transactions or extraction anomalies occur.

## Decision
We enforce an Allowed Autonomy Level 3 (AAL-3) state machine across all invoice extraction and payment pipelines:
1. **Auto-Process Threshold**: Invoices strictly under $1,000.00 USD with entity extraction confidence exceeding 95.0% and zero policy/arithmetic discrepancies may execute automatically.
2. **Deterministic Halt Criteria**: Any invoice $\ge \$1,000.00$, with confidence $\le 95.0\%$, arithmetic delta $> \$0.01$, unverified vendor, or duplicate signature immediately halts autonomous execution.
3. **Immutable Write-Ahead Ledger**: Prior to any external API trigger or ERP posting, an immutable snapshot is committed to AlloyDB with a cryptographic state hash and full reversal rollback payload.
4. **Manager Authorization**: Halted transactions create an interactive HITL ticket requiring a validated OAuth 2.0 / OIDC bearer signature from an authorized finance manager.

## Consequences
- **Positive**: Eliminates unmonitored financial leakage while automating ~70% of standard high-volume recurring expenses under $1,000. Full auditability and SOX compliance.
- **Negative**: High-value invoices require manager intervention, introducing queue latency dependent on manager response times (mitigated by automated Slack/PubSub notification dispatcher).
