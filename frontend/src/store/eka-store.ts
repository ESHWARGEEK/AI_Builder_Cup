/**
 * Zustand store for the EKA workspace state.
 * Manages chat sessions, invoice processing state, and PDF viewer.
 */
import { create } from "zustand";
import type { ChatResponse, InvoiceProcessingResponse, SSEEvent, Source } from "@/lib/api-client";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  citations?: Array<{ claim_text: string; confidence_score: number }>;
  sources?: Source[];
  isStreaming?: boolean;
}

export interface ProcessingStep {
  id: string;
  label: string;
  status: "pending" | "active" | "complete" | "error";
  detail?: string;
  duration?: number;
}

export type WorkspaceTab = "chat" | "invoice" | "audit";

interface EKAStore {
  // Session
  sessionId: string | null;
  setSessionId: (id: string) => void;

  // Active tab
  activeTab: WorkspaceTab;
  setActiveTab: (tab: WorkspaceTab) => void;

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

  // Tab
  activeTab: "chat",
  setActiveTab: (tab) => set({ activeTab: tab }),

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
}));
