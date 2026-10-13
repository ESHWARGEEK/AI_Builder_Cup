# UI/UX Design Specification & Google Stitch Prompt (design.md)
## Application: NexusWork — Autonomous Enterprise Compliance & Workspace Cockpit

This document contains the visual architecture, component interaction system, and the complete copy-pasteable **Google Stitch Prompt** to generate the frontend design and interactive components.

---

## 1. UI Layout Architecture

The user interface follows a high-density, low-cognitive-load **Tri-Pane Enterprise Cockpit** modeled after best-in-class agentic productivity tools (inspired by Hackathon winners *Sidekick* and *ScreenMate*):

┌─────────────────┬───────────────────────────────────┬───────────────────────────────────┐
│ Left Navigation │ Center Stage │ Right Dynamic Canvas │
│ (240px) │ (Flex-1 / Chat) │ (480px - 600px) │
├─────────────────┼───────────────────────────────────┼───────────────────────────────────┤
│ [NexusWork Logo]│ [Agent Chat Stream Header] │ [Tab: PDF / Tab: Diff / Tab: Live]│
│ │ │ │
│ Proxy Mode │ User: "Audit this Master Service │ ┌─────────────────────────────┐ │
│ [ [●] OOO On ] │ Agreement for EMEA." │ │ Interactive PDF Viewer │ │
│ │ │ │ with Bounding Box Overlays │ │
│ Active Audits │ NexusWork: │ │ [Box: Net 15 - 99% Conf] │ │
│ • EMEA MSA 2026 │ "Identified 2 policy violations. │ └─────────────────────────────┘ │
│ • Dell AP Inv │ See redline diff in Canvas." │ │
│ │ │ ┌─────────────────────────────┐ │
│ Knowledge Base │ ┌─────────────────────────────┐ │ │ Live Redline Diff View │ │
│ • Travel Policy │ │ AAL 3 HITL Action Card │ │ │ - Net 15 Days (Red) │ │
│ • GDPR Framework│ │ Status: PAUSED FOR APPROVAL │ │ │ + Net 30 Days (Green) │ │
│ │ │ Amount: $4,200 (>= $1,000) │ │ └─────────────────────────────┘ │
│ Audit Ledger │ │ [Approve & Commit] [Reject] │ │ │
│ [View AlloyDB] │ └─────────────────────────────┘ │ ┌─────────────────────────────┐ │
│ │ │ │ Live Artifact View (Sheets)│ │
│ User Profile │ [Input Prompt Box & File Upload] │ │ Row 104 appended to Ledger │ │
│ finance-admin │ │ └─────────────────────────────┘ │
└─────────────────┴───────────────────────────────────┴───────────────────────────────────┘

---

## 2. Design System Tokens & Color Palette

* **Theme:** Material Design 3 Enterprise Dark / Light Adaptive
* **Base Background:** Slate-950 (`#090D16`) / Slate-50 (`#F8FAFC`)
* **Surface Background:** Slate-900 (`#0F172A`) / White (`#FFFFFF`)
* **Primary Brand Accent:** Google Blue / Electric Indigo (`#3B82F6` / `#4F46E5`)
* **Success / Auto-Approved:** Emerald-500 (`#10B981`)
* **Warning / AAL 3 Review Required:** Amber-500 (`#F59E0B`)
* **Critical / Policy Block:** Rose-500 (`#EF4444`)
* **Typography:** Inter or Google Sans (Headings: 600 Semi-Bold; Data/Metrics: JetBrains Mono tabular figures)

---

## 3. Master Google Stitch Prompt

Copy and paste the prompt below directly into **Google Stitch**, **Galileo AI**, or **v0** to generate the pixel-perfect cockpit UI:

```stitch
Create a modern, high-density Enterprise AI Cockpit application named "NexusWork" for financial analysts, procurement officers, and corporate executives. The interface is built in React, Tailwind CSS, Lucide icons, and Material 3 design principles, featuring a 3-column layout.

1. LEFT SIDEBAR (Width: 260px, Background: #0B0F19, Border: Right border #1E293B):
- Header: Minimalist brand icon with glowing blue gradient and title "NexusWork AI", subtitle "Autonomous Enterprise Agent".
- Workspace Proxy Status Widget: A toggle card showing "Proxy Mode: Out of Office (OOO)". When toggled ON, displays a pulsing green beacon with status "Autonomous Email & Calendar Interceptor Active".
- Active Sessions List: Grouped by "Today" and "Previous 7 Days". Each item has an icon (FileText, ShieldCheck, DollarSign) with status pill badges ("Awaiting Approval", "Auto-Approved", "Compliance Alert").
- Grounded Knowledge Datastores: Collapsible list showing "Active RAG Sources: Global Travel Policy 2026, Procurement Rules v4.2, EU AI Act Compliance".
- Bottom Section: User avatar "Elena Rostova (Senior AP Lead)", Workload Identity principal badge "spiffe://corp.internal/agents/nexuswork", and an "Audit Ledger (AlloyDB)" button.

2. CENTER STAGE (Flex-1, Background: #0F172A):
- Top Bar: Conversation title "Audit & Extract: Initech Vendor Contract #INV-2026-88", breadcrumb trail, and latency telemetry pill ("RAG: 1.2s | DocAI: 4.8s | AAL 3 'Eyes On' Active").
- Chat Stream:
  - Agent Message bubble: Clean typography, rendered markdown, and interactive citation chips (e.g., "[Policy §4.2: Max Meal Limit]").
  - User Message: Displaying uploaded file thumbnail "Invoice_Dell_PowerEdge_R750.pdf (2.4 MB)".
  - AAL 3 Human-in-the-Loop Action Card: Highlighted with an amber-500 border and subtle backdrop glow.
    - Title: "AAL 3 Consequential Action Gatekeeper"
    - Status Badge: "EXECUTION PAUSED: $4,200.00 exceeds $1,000 threshold & confidence is 91%".
    - Deterministic Math Breakdown: Table showing Subtotal ($3,900.00) + Tax ($300.00) = Total ($4,200.00) [Verified Match].
    - Policy Flags: "Warning: Payment terms specified Net 15; company standard requires Net 30".
    - Two prominent action buttons: Primary Amber Button "Authorize & Post to Ledger (OAuth Sign-off)" and Ghost Button "Reject & Rollback State".
- Bottom Action Input Bar:
  - Multi-modal input container with document upload button, microphone, prompt placeholder "Ask policy questions, audit documents, or instruct proxy...", and a primary send button.

3. RIGHT DYNAMIC CANVAS (Width: 540px, Background: #0B0F19, Border: Left border #1E293B):
- Tab Navigation Header: Three tabs with smooth indicator:
  - Tab 1: "Document AI Preview" (with badge "95% Conf")
  - Tab 2: "Compliance Redline Diff" (with badge "2 Flags")
  - Tab 3: "Live Workspace Artifacts" (with badge "Sheets Live")
- Content Views:
  - Tab 1 View: PDF document canvas showing simulated contract page with high-tech glowing bounding box overlays. Hovering over a box highlights the corresponding field in the chat card.
  - Tab 2 View: Git-style redline clause comparison viewer. Shows:
    - Red Box: "[-] Payment shall be made within 15 calendar days from receipt of invoice."
    - Green Box: "[+] Payment shall be made within 30 calendar days pursuant to Global Procurement Policy §8.1."
    - Action: "Apply Approved Redline Draft" button.
  - Tab 3 View: "AutoWorkspace Proxy Live Ledger". Renders an embedded reactive spreadsheet grid showing row entries automatically appended by the agent with columns: [Timestamp, Vendor, Invoice #, Amount, Confidence, Compliance Status, Approved By].

Micro-Interactions & Aesthetic:
- Dark theme default with deep navy and slate surfaces (#090D16, #0F172A).
- Crisp 1px borders using slate-800.
- Monospace font (JetBrains Mono) for numbers, dollar amounts, confidence percentages, and timestamps.
- Smooth loading skeletons and streaming text animations.

. Component Hierarchy & State Interactions
Component	State Variations	User Actions
ProxyModeWidget	ACTIVE_ATTENDING, OOO_INTERCEPTING, OFFLINE	Toggle switch triggers background event listening.
HITLApprovalCard	PENDING_REVIEW, AUTHORIZED, REJECTED, ROLLED_BACK	"Authorize" posts OAuth claim; "Reject" fires rollback compensation tool.
BoundingBoxOverlay	DEFAULT, HOVERED, FLAGGED_EXCEPTION	Hovering synchronizes focus between PDF text and extracted field card.
RedlineDiffViewer	DIFF_VIEW, ACCEPTED_REPLACED	"Apply Redline" rewrites contract payload with enterprise boilerplate.
LiveArtifactGrid	SYNCING, SYNCED, CONFLICT	Displays live row insertion into Google Sheets AP Ledger in real time.