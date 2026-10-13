/**
 * Zustand store for the NexusWork enterprise cockpit state.
 * Manages chat sessions, invoice processing, PDF viewer,
 * compliance clause redlines, and AutoWorkspace proxy artifacts.
 */
import { create } from "zustand";
import type {
  ChatResponse,
  InvoiceProcessingResponse,
  SSEEvent,
  Source,
  ClauseRedline,
  ComplianceReport,
  LedgerRow,
  ExecutiveBriefDoc,
  ProxyEvent,
  ProxyMode,
} from "@/lib/api-client";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  citations?: Array<{ claim_text: string; confidence_score: number }>;
  sources?: Source[];
  isStreaming?: boolean;
  uploadedFileName?: string;
  isHITLCard?: boolean;
}

export interface ProcessingStep {
  id: string;
  label: string;
  status: "pending" | "active" | "complete" | "error";
  detail?: string;
  duration?: number;
}

export type WorkspaceTab = "chat" | "invoice" | "audit";
export type CanvasTab = "docai" | "redlines" | "artifacts";
export type ArtifactSubTab = "sheets" | "docs";

const DEFAULT_REDLINES: ClauseRedline[] = [
  {
    id: "redline-net15",
    clause_type: "payment_terms",
    original_clause:
      "Payment shall be made within 15 calendar days from receipt of invoice. Late payments accrue interest at 3% monthly.",
    replacement_clause:
      "Payment shall be made within 30 calendar days pursuant to Global Procurement Policy §8.1.",
    policy_violation_rationale:
      "Corporate standard requires Net 30 payment terms; vendor specified accelerated terms without executive pre-approval.",
    severity: "WARNING",
    applied: false,
    citation: "Global Procurement Policy §8.1 (Payment Terms & Cashflow Controls)",
  },
  {
    id: "redline-liability",
    clause_type: "liability_cap",
    original_clause:
      "Customer assumes full, uncapped liability for all direct, indirect, and consequential damages arising from any system outage.",
    replacement_clause:
      "Neither party's aggregate liability under this Agreement shall exceed two times (2x) the total fees paid or payable under the applicable SOW in the preceding 12 months.",
    policy_violation_rationale:
      "Enterprise risk policy mandates a 2x annual fee liability cap. Uncapped liability exposes the organization to catastrophic risk.",
    severity: "CRITICAL",
    applied: false,
    citation: "Enterprise Legal Risk Charter §14.2 (Limitation of Liability)",
  },
];

const DEFAULT_LEDGER_ROWS: LedgerRow[] = [
  {
    id: "row-101",
    timestamp: "2026-10-12 14:15:00 UTC",
    vendor_name: "Acme Cloud Solutions",
    invoice_number: "INV-2026-091",
    total_amount_usd: 450.0,
    confidence_score: 0.98,
    compliance_status: "AUTO_APPROVED",
    approved_by: "NexusWork Agent (AAL-3 Autonomous)",
    sheet_row_index: 101,
  },
  {
    id: "row-102",
    timestamp: "2026-10-12 16:40:22 UTC",
    vendor_name: "Global Office Logistics",
    invoice_number: "GOL-8891-B",
    total_amount_usd: 820.5,
    confidence_score: 0.96,
    compliance_status: "AUTO_APPROVED",
    approved_by: "NexusWork Agent (AAL-3 Autonomous)",
    sheet_row_index: 102,
  },
  {
    id: "row-103",
    timestamp: "2026-10-13 09:10:05 UTC",
    vendor_name: "Dell Enterprise Hardware",
    invoice_number: "DELL-US-7721",
    total_amount_usd: 4200.0,
    confidence_score: 0.91,
    compliance_status: "PENDING_APPROVAL",
    approved_by: "Awaiting HITL Review (Elena Rostova)",
    sheet_row_index: 103,
  },
];

const DEFAULT_PROXY_EVENTS: ProxyEvent[] = [
  {
    id: "evt-001",
    source: "email: ar-billing@dell.com",
    event_type: "INVOICE_RECEIVED",
    summary:
      "Inbound AP Invoice #DELL-US-7721 ($4,200.00). Triaged & staged for Elena's HITL review (exceeds $1,000 threshold).",
    status: "QUEUED_HITL",
    created_at: new Date().toISOString(),
    payload: { vendor: "Dell Enterprise Hardware", amount: 4200.0 },
  },
  {
    id: "evt-002",
    source: "drive: /contracts/emea/initech_msa_v1.pdf",
    event_type: "CONTRACT_SUBMITTED",
    summary:
      "Pre-execution audit complete for Initech MSA. 2 policy redlines flagged; Executive Brief compiled.",
    status: "TRIAGED",
    created_at: new Date().toISOString(),
    payload: { contract: "Initech MSA", redlines_count: 2 },
  },
  {
    id: "evt-003",
    source: "email: accounts@acme-cloud.com",
    event_type: "INVOICE_RECEIVED",
    summary:
      "Routine monthly SaaS invoice #INV-2026-091 ($450.00). Confidence 98%. Auto-approved & posted to Ledger row 101.",
    status: "AUTO_RESOLVED",
    created_at: new Date().toISOString(),
    payload: { vendor: "Acme Cloud Solutions", amount: 450.0 },
  },
];

const DEFAULT_BRIEF_DOC: ExecutiveBriefDoc = {
  id: "doc-emea-msa-01",
  title: "Executive Brief: Initech Master Services Agreement (EMEA)",
  summary:
    "NexusWork pre-execution compliance review identified 2 critical policy deviations requiring procurement remediation prior to executive sign-off.",
  compliance_notes:
    "1. Payment terms specify Net 15 days (Corporate policy mandates Net 30 days pursuant to §8.1).\n2. Uncapped liability provision identified in Clause 14. Enterprise ceiling is 2x annual contract value.",
  recommended_actions: [
    "Issue redline counter-draft adopting Enterprise Net 30 standard terms.",
    "Insert mandatory 2x annual fee liability cap pursuant to Enterprise Legal Risk Charter §14.2.",
    "Verify EU GDPR Standard Contractual Clauses (SCCs) schedule.",
  ],
  markdown_content: `# Executive Brief: Initech Master Services Agreement (EMEA)
**Prepared by:** NexusWork Autonomous Agent (AAL 3 Eyes-On)  
**Date:** 2026-10-13  
**Review Status:** CRITICAL POLICY FLAGS IDENTIFIED

---

### 1. Executive Summary
An autonomous pre-execution audit was executed against the submitted Initech Master Services Agreement. The agreement governs cloud migration and enterprise infrastructure support across EMEA regions.

### 2. High-Priority Discrepancies
* **Non-Compliant Payment Schedule:** Agreement states Net 15 days with 3% monthly compounding interest. Global cashflow governance mandates Net 30 days (§8.1).
* **Uncapped Consequential Liability:** Clause 14 subjects the organization to unlimited direct and indirect damages. Policy mandates a hard ceiling at 2x annual SOW billings (§14.2).

### 3. Recommended Remediation
Execute the automated git-style redline draft produced by NexusWork. The updated draft aligns with Corporate Boilerplate v4.2 while maintaining vendor relationship viability.`,
  created_at: new Date().toISOString(),
};

interface EKAStore {
  // Session
  sessionId: string | null;
  setSessionId: (id: string) => void;

  // Active tab & Canvas
  activeTab: WorkspaceTab;
  setActiveTab: (tab: WorkspaceTab) => void;
  canvasTab: CanvasTab;
  setCanvasTab: (tab: CanvasTab) => void;
  artifactSubTab: ArtifactSubTab;
  setArtifactSubTab: (tab: ArtifactSubTab) => void;

  // Chat state
  messages: ChatMessage[];
  isStreamingChat: boolean;
  addMessage: (msg: ChatMessage) => void;
  appendToLastMessage: (token: string) => void;
  updateLastMessageCitations: (event: SSEEvent) => void;
  setStreamingChat: (streaming: boolean) => void;
  clearMessages: () => void;

  // Invoice state
  currentInvoiceResult: InvoiceProcessingResponse | null;
  setInvoiceResult: (result: InvoiceProcessingResponse | null) => void;
  processingSteps: ProcessingStep[];
  setProcessingStep: (id: string, updates: Partial<ProcessingStep>) => void;
  resetProcessingSteps: () => void;
  isProcessingInvoice: boolean;
  setProcessingInvoice: (processing: boolean) => void;

  // PDF viewer state
  pdfFile: File | null;
  setPdfFile: (file: File | null) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  setTotalPages: (pages: number) => void;
  selectedEntity: string | null;
  setSelectedEntity: (entity: string | null) => void;
  showOverlays: boolean;
  setShowOverlays: (show: boolean) => void;
  zoomLevel: number;
  setZoomLevel: (zoom: number) => void;

  // Workspace Proxy State (Idea 2)
  proxyMode: ProxyMode;
  setProxyMode: (mode: ProxyMode) => void;
  proxyEvents: ProxyEvent[];
  simulateInboundEvent: (vendor?: string, amount?: number) => void;

  // Compliance & Redlines State (Idea 1)
  redlines: ClauseRedline[];
  applyRedline: (id: string) => void;

  // Live Artifacts (Sheets & Docs)
  ledgerRows: LedgerRow[];
  addLedgerRow: (row: LedgerRow) => void;
  briefDoc: ExecutiveBriefDoc;

  // AAL 3 HITL State
  hitlDecision: "PENDING_REVIEW" | "AUTHORIZED" | "REJECTED";
  authorizeHITL: () => void;
  rejectHITL: () => void;
}

const DEFAULT_PROCESSING_STEPS: ProcessingStep[] = [
  { id: "upload", label: "Document Upload", status: "pending" },
  { id: "extraction", label: "Document AI Extraction", status: "pending" },
  { id: "verification", label: "Verification Suite", status: "pending" },
  { id: "governance", label: "AAL-3 Governance", status: "pending" },
  { id: "notification", label: "Notification Dispatch", status: "pending" },
];

export const useEKAStore = create<EKAStore>((set, get) => ({
  // Session
  sessionId: null,
  setSessionId: (id) => set({ sessionId: id }),

  // Tab & Canvas
  activeTab: "chat",
  setActiveTab: (tab) => set({ activeTab: tab }),
  canvasTab: "redlines",
  setCanvasTab: (tab) => set({ canvasTab: tab }),
  artifactSubTab: "sheets",
  setArtifactSubTab: (tab) => set({ artifactSubTab: tab }),

  // Chat
  messages: [],
  isStreamingChat: false,
  addMessage: (msg) =>
    set((state) => ({ messages: [...state.messages, msg] })),
  appendToLastMessage: (token) =>
    set((state) => {
      const messages = [...state.messages];
      if (messages.length > 0) {
        const last = messages[messages.length - 1];
        messages[messages.length - 1] = {
          ...last,
          content: last.content + token,
        };
      }
      return { messages };
    }),
  updateLastMessageCitations: (event) =>
    set((state) => {
      const messages = [...state.messages];
      if (messages.length > 0) {
        const last = messages[messages.length - 1];
        messages[messages.length - 1] = {
          ...last,
          citations: event.citations || [],
          sources: event.sources || [],
          isStreaming: false,
        };
      }
      return { messages };
    }),
  setStreamingChat: (streaming) => set({ isStreamingChat: streaming }),
  clearMessages: () => set({ messages: [] }),

  // Invoice
  currentInvoiceResult: null,
  setInvoiceResult: (result) => set({ currentInvoiceResult: result }),
  processingSteps: DEFAULT_PROCESSING_STEPS.map((s) => ({ ...s })),
  setProcessingStep: (id, updates) =>
    set((state) => ({
      processingSteps: state.processingSteps.map((step) =>
        step.id === id ? { ...step, ...updates } : step
      ),
    })),
  resetProcessingSteps: () =>
    set({ processingSteps: DEFAULT_PROCESSING_STEPS.map((s) => ({ ...s })) }),
  isProcessingInvoice: false,
  setProcessingInvoice: (processing) => set({ isProcessingInvoice: processing }),

  // PDF viewer
  pdfFile: null,
  setPdfFile: (file) => set({ pdfFile: file }),
  currentPage: 1,
  setCurrentPage: (page) => set({ currentPage: page }),
  totalPages: 1,
  setTotalPages: (pages) => set({ totalPages: pages }),
  selectedEntity: null,
  setSelectedEntity: (entity) => set({ selectedEntity: entity }),
  showOverlays: true,
  setShowOverlays: (show) => set({ showOverlays: show }),
  zoomLevel: 1.0,
  setZoomLevel: (zoom) => set({ zoomLevel: zoom }),

  // Workspace Proxy
  proxyMode: "OOO_INTERCEPTING",
  setProxyMode: (mode) => set({ proxyMode: mode }),
  proxyEvents: DEFAULT_PROXY_EVENTS,
  simulateInboundEvent: (vendor = "Apex Cloud Networks", amount = 650.0) =>
    set((state) => {
      const isAuto = amount < 1000.0;
      const newEvent: ProxyEvent = {
        id: `evt-${Date.now().toString(36)}`,
        source: `email: invoices@${vendor.toLowerCase().replace(/\s+/g, "")}.com`,
        event_type: "INVOICE_RECEIVED",
        summary: isAuto
          ? `Autonomous OOO triaged: ${vendor} invoice ($${amount.toFixed(2)}) auto-approved under $1,000 threshold and added to Sheets ledger.`
          : `Intercepted high-value transaction: ${vendor} ($${amount.toFixed(2)}). AAL 3 safety rule triggered: Staged for human approval.`,
        status: isAuto ? "AUTO_RESOLVED" : "QUEUED_HITL",
        created_at: new Date().toISOString(),
        payload: { vendor, amount },
      };

      const updatedLedger = isAuto
        ? [
            {
              id: `row-${Date.now().toString(36)}`,
              timestamp: new Date().toISOString().replace("T", " ").substring(0, 19) + " UTC",
              vendor_name: vendor,
              invoice_number: `INV-AUTO-${Math.floor(1000 + Math.random() * 9000)}`,
              total_amount_usd: amount,
              confidence_score: 0.98,
              compliance_status: "AUTO_APPROVED",
              approved_by: "NexusWork Proxy (OOO Autonomous)",
              sheet_row_index: state.ledgerRows.length + 101,
            },
            ...state.ledgerRows,
          ]
        : state.ledgerRows;

      return {
        proxyEvents: [newEvent, ...state.proxyEvents],
        ledgerRows: updatedLedger,
      };
    }),

  // Compliance & Redlines
  redlines: DEFAULT_REDLINES,
  applyRedline: (id) =>
    set((state) => ({
      redlines: state.redlines.map((r) =>
        r.id === id ? { ...r, applied: true } : r
      ),
    })),

  // Live Artifacts
  ledgerRows: DEFAULT_LEDGER_ROWS,
  addLedgerRow: (row) =>
    set((state) => ({ ledgerRows: [row, ...state.ledgerRows] })),
  briefDoc: DEFAULT_BRIEF_DOC,

  // AAL 3 HITL Action
  hitlDecision: "PENDING_REVIEW",
  authorizeHITL: () =>
    set((state) => {
      const newRow: LedgerRow = {
        id: `row-${Date.now().toString(36)}`,
        timestamp: new Date().toISOString().replace("T", " ").substring(0, 19) + " UTC",
        vendor_name: "Dell Enterprise Hardware",
        invoice_number: "DELL-US-7721",
        total_amount_usd: 4200.0,
        confidence_score: 0.91,
        compliance_status: "AUTHORIZED_HITL",
        approved_by: "Elena Rostova (OAuth PKCE Token #sig-99e2f)",
        sheet_row_index: state.ledgerRows.length + 101,
      };
      return {
        hitlDecision: "AUTHORIZED",
        ledgerRows: [newRow, ...state.ledgerRows],
      };
    }),
  rejectHITL: () =>
    set(() => ({
      hitlDecision: "REJECTED",
    })),
}));
