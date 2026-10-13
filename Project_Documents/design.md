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

## 2. Design System Tokens & Color Palette (Atlassian Design System)

* **Theme:** Atlassian Design System (ADS) Enterprise Dark Theme
* **Base Background:** Neutral Darkest (`#161A1D` / `#1D2125`)
* **Surface Background:** Neutral Dark Surface (`#22272B` / `#282E33`)
* **Elevated Surface:** Neutral Dark Raised (`#2C333A` / `#333C43`)
* **Borders & Dividers:** Neutral Dark Border (`#38414A` / `#454F59`)
* **Primary Brand Accent:** Atlassian Classic Blue (B400: `#0052CC`, B300: `#2684FF`, Hover B500: `#0747A6`, Badge Tint: `#1C2B41`)
* **Success / Auto-Approved:** Atlassian Green (G400: `#00875A` / `#36B37E`, Text: `#57D9A3`, Soft Tint: `#1C3829`)
* **Warning / Review Required:** Atlassian Amber/Yellow (Y400: `#FF991F` / `#FFAB00`, Text: `#FFC400`, Soft Tint: `#3A2E12`)
* **Critical / Policy Block:** Atlassian Danger Red (R400: `#DE350B` / `#FF5630`, Text: `#FF7452`, Soft Tint: `#3D1B1B`)
* **Information / Discovery:** Atlassian Teal/Purple (T400: `#00B8D9`, P400: `#6554C0`)
* **Badge Componentry:** Atlassian Lozenges (`rounded-[3px]`, uppercase 10px, font-bold, subtle border and pastel text tint)
* **Typography:** Inter or Atlassian Sans (`font-sans`), Data/Metrics: JetBrains Mono / SFMono tabular figures

---

## 3. Master Google Stitch Prompt (Atlassian Palette Edition)

Copy and paste the prompt below directly into **Google Stitch**, **Galileo AI**, or **v0** to generate the pixel-perfect cockpit UI:

```stitch
Create a modern, high-density Enterprise AI Cockpit application named "NexusWork" for financial analysts, procurement officers, and corporate executives using the authentic Atlassian Design System (ADS) color palette and UI guidelines. The interface features a 3-column layout built with React and Tailwind CSS.

ATLASSIAN DESIGN SYSTEM TOKENS:
- Base Background: #161A1D (Neutral Darkest)
- Surface Container: #22272B (Neutral Dark Surface)
- Elevated Surface / Cards: #2C333A (Neutral Dark Raised)
- Borders & Dividers: #38414A (Subtle Neutral Border)
- Primary Brand Accent: Atlassian Blue (#0052CC / #2684FF, hover: #0747A6, tint: #1C2B41)
- Success / Auto-Approved: Atlassian Green (#00875A / #36B37E, text: #57D9A3, soft badge: #1C3829)
- Warning / HITL Gate: Atlassian Amber (#FF991F / #FFAB00, text: #FFC400, soft badge: #3A2E12)
- Critical / Block: Atlassian Red (#DE350B / #FF5630, text: #FF7452, soft badge: #3D1B1B)
- Badge Style: Atlassian Lozenges (rounded-[3px], uppercase, 10px, font-semibold, letter-spacing wide)
- Typography: Inter for text/headings, JetBrains Mono for monetary values, confidence percentages, and timestamps.

1. LEFT SIDEBAR (Width: 260px, Background: #161A1D, Border-Right: 1px solid #38414A):
- Header: Minimalist brand icon in Atlassian Blue (#0052CC) with title "NexusWork AI", subtitle "Autonomous Enterprise Agent".
- Workspace Proxy Status Widget: A card (#22272B border #38414A) showing "Proxy Mode: Out of Office (OOO)". When toggled ON, displays a pulsing green beacon (#36B37E) with status "Autonomous Email & Calendar Interceptor Active" and an Atlassian Lozenge badge "OOO ACTIVE" (#1C3829 text-#57D9A3).
- Active Sessions List: Grouped by "Today" and "Previous 7 Days". Each item displays an icon with Atlassian Lozenge badges:
  - "Initech EMEA MSA 2026" with Critical Lozenge (#3D1B1B text-#FF7452: "2 Redlines")
  - "Dell AP Inv #DELL-US-7721" with In-Progress Warning Lozenge (#3A2E12 text-#FFC400: "Awaiting HITL")
  - "Acme SaaS #INV-2026-091" with Success Lozenge (#1C3829 text-#57D9A3: "Auto-Approved")
- Grounded Knowledge Datastores: Collapsible list showing "Active RAG Sources: Global Travel Policy 2026, Procurement Rules v4.2, EU AI Act Compliance".
- Bottom Section: User profile "Elena Rostova (Senior AP Lead)", SPIFFE principal badge `spiffe://corp.internal/agents/nexuswork`, and an Atlassian-style secondary button "Audit Ledger (AlloyDB)".

2. CENTER STAGE (Flex-1, Background: #22272B):
- Top Bar: Conversation title "Audit & Extract: Initech Vendor Contract #INV-2026-88", breadcrumb trail, and Atlassian-styled telemetry pill ("RAG: 1.2s | DocAI: 4.8s | AAL 3 'Eyes On' Active").
- Chat Stream:
  - Agent Message bubble: Rendered in surface card (#2C333A) with clean typography and Atlassian-styled citation lozenges (e.g., "[Policy §4.2: Max Meal Limit]").
  - User Message: Displaying uploaded file thumbnail "Invoice_Dell_PowerEdge_R750.pdf (2.4 MB)".
  - AAL 3 Human-in-the-Loop Action Card: Framed in Atlassian Amber border (#FF991F/50) with subtle warm glow:
    - Title: "AAL 3 Consequential Action Gatekeeper"
    - Status Lozenge: "EXECUTION PAUSED: $4,200.00 exceeds $1,000 threshold & confidence is 91%".
    - Deterministic Math Breakdown: Clean tabular figures showing Subtotal ($3,900.00) + Tax ($300.00) = Total ($4,200.00) [Verified Match ✓].
    - Policy Flags: "Warning: Payment terms specified Net 15; company standard requires Net 30".
    - Action Buttons: Primary Atlassian Amber Button (#FF991F text-#161A1D hover:#FFAB00) "Authorize & Post to Ledger (OAuth Sign-off)" and Subtle Ghost Button (#2C333A hover:#38414A text-#FF5630) "Reject & Rollback State".
- Bottom Multi-modal Input Bar:
  - Input container (#161A1D border #38414A focus-within:ring-1 focus-within:ring-[#2684FF]) with file attachment, mic, prompt placeholder, and primary Atlassian Blue send button (#0052CC hover:#0747A6).

3. RIGHT DYNAMIC CANVAS (Width: 540px, Background: #161A1D, Border-Left: 1px solid #38414A):
- Tab Navigation Header: Three Atlassian-styled tabs with smooth indicator:
  - Tab 1: "Document AI Preview" (Lozenge: "95% Conf")
  - Tab 2: "Compliance Redline Diff" (Lozenge: "2 Flags")
  - Tab 3: "Live Workspace Artifacts" (Lozenge: "Sheets Live")
- Content Views:
  - Tab 1 View: PDF document canvas with high-tech glowing bounding box overlays highlighting extracted fields.
  - Tab 2 View: Git-style redline clause comparison viewer:
    - Red Box (#3D1B1B border #FF5630/40 text-#FF7452): "[-] Payment shall be made within 15 calendar days from receipt of invoice."
    - Green Box (#1C3829 border #36B37E/40 text-#57D9A3): "[+] Payment shall be made within 30 calendar days pursuant to Global Procurement Policy §8.1."
    - Action: Atlassian Blue Button (#0052CC) "Apply Approved Redline Draft".
  - Tab 3 View: "AutoWorkspace Proxy Live Ledger" rendered as an embedded spreadsheet grid with columns [Timestamp, Vendor, Invoice #, Amount, Confidence, Compliance Status, Approved By], plus executive brief doc view.
```

. Component Hierarchy & State Interactions
Component	State Variations	User Actions
ProxyModeWidget	ACTIVE_ATTENDING, OOO_INTERCEPTING, OFFLINE	Toggle switch triggers background event listening.
HITLApprovalCard	PENDING_REVIEW, AUTHORIZED, REJECTED, ROLLED_BACK	"Authorize" posts OAuth claim; "Reject" fires rollback compensation tool.
BoundingBoxOverlay	DEFAULT, HOVERED, FLAGGED_EXCEPTION	Hovering synchronizes focus between PDF text and extracted field card.
RedlineDiffViewer	DIFF_VIEW, ACCEPTED_REPLACED	"Apply Redline" rewrites contract payload with enterprise boilerplate.
LiveArtifactGrid	SYNCING, SYNCED, CONFLICT	Displays live row insertion into Google Sheets AP Ledger in real time.