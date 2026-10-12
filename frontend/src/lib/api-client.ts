/**
 * EKA API client with typed methods for all backend endpoints.
 * Handles auth headers, error normalization, and SSE streaming.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ChatResponse {
  session_id: string;
  answer: string;
  citations: Citation[];
  sources: Source[];
  processing_time_seconds: number;
  timestamp: string;
}

export interface Citation {
  claim_text: string;
  confidence_score: number;
  source_indices: number[];
}

export interface Source {
  id: string;
  title: string;
  uri: string;
  snippet: string;
}

export interface InvoiceProcessingResponse {
  session_id: string;
  document_id: string;
  extraction: InvoiceExtraction;
  verification: VerificationResult;
  governance_decision: "AUTO_PROCESS" | "HALT_HITL";
  violations: string[];
  audit_entry_id: string;
  hitl_ticket_id: string | null;
  processing_time_seconds: number;
}

export interface InvoiceExtraction {
  document_id: string;
  invoice_number: string;
  invoice_date: string | null;
  due_date: string | null;
  vendor_name: string;
  vendor_id: string | null;
  total_amount_usd: number;
  net_amount_usd: number;
  tax_amount_usd: number;
  currency: string;
  confidence_score: number;
  page_count: number;
  policy_flags: string[];
  all_entities: Record<string, ExtractedEntity>;
  line_items: LineItem[];
}

export interface ExtractedEntity {
  field_name: string;
  raw_value: string;
  normalized_value: string;
  confidence: number;
  bounding_box: BoundingBox | null;
  page_number: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
}

export interface LineItem {
  description?: { value: string; confidence: number; bounding_box: BoundingBox | null };
  quantity?: { value: string; confidence: number };
  unit_price?: { value: string; confidence: number };
  amount?: { value: string; confidence: number };
}

export interface VerificationResult {
  arithmetic_valid: boolean;
  expected_total: number;
  extracted_total: number;
  arithmetic_delta_usd: number;
  vendor_valid: boolean;
  vendor_details: Record<string, unknown> | null;
  duplicate_detected: boolean;
  duplicate_invoice_id: string | null;
}

export interface AuditEntry {
  id: string;
  session_id: string;
  decision: string;
  violations: string[];
  invoice_number: string;
  vendor_id: string | null;
  total_amount_usd: number;
  confidence_score: number;
  created_at: string;
}

export interface SSEEvent {
  type: "token" | "citations" | "done" | "error" | "stream_end";
  content?: string;
  index?: number;
  citations?: Citation[];
  sources?: Source[];
  total_tokens?: number;
  message?: string;
  session_id?: string;
}

// ── API client ─────────────────────────────────────────────────────────────────

class EKAApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}/api/v1${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // ── Chat ──────────────────────────────────────────────────────────────────

  async chat(message: string, sessionId?: string): Promise<ChatResponse> {
    return this.request<ChatResponse>("/chat", {
      method: "POST",
      body: JSON.stringify({ message, session_id: sessionId, use_agent: false }),
    });
  }

  async createSession(): Promise<{ session_id: string }> {
    return this.request<{ session_id: string }>("/chat/session", {
      method: "POST",
    });
  }

  async getChatHistory(
    sessionId: string
  ): Promise<{ session_id: string; messages: unknown[] }> {
    return this.request(`/chat/history?session_id=${sessionId}`);
  }

  /**
   * Open an SSE stream for chat, yielding events via an async generator.
   */
  async *streamChat(
    message: string,
    sessionId?: string
  ): AsyncGenerator<SSEEvent> {
    const url = `${this.baseUrl}/api/v1/chat/stream?message=${encodeURIComponent(message)}${sessionId ? `&session_id=${sessionId}` : ""}`;

    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "text/event-stream" },
    });

    if (!response.ok || !response.body) {
      throw new Error(`SSE connection failed: HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() || "";

      for (const chunk of lines) {
        const dataLine = chunk.split("\n").find((l) => l.startsWith("data:"));
        if (dataLine) {
          try {
            const event: SSEEvent = JSON.parse(dataLine.slice(5).trim());
            yield event;
          } catch {
            // Skip malformed events
          }
        }
      }
    }
  }

  // ── Invoices ──────────────────────────────────────────────────────────────

  async uploadInvoice(
    file: File,
    sessionId?: string
  ): Promise<InvoiceProcessingResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const url = `${this.baseUrl}/api/v1/invoices/upload${sessionId ? `?session_id=${sessionId}` : ""}`;
    const response = await fetch(url, { method: "POST", body: formData });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `Upload failed: HTTP ${response.status}`);
    }

    return response.json();
  }

  async getInvoiceStatus(documentId: string): Promise<{
    document_id: string;
    status: string;
    invoice_number?: string;
    processed_at?: string;
  }> {
    return this.request(`/invoices/${documentId}/status`);
  }

  async getDocumentEntities(documentId: string): Promise<{
    document_id: string;
    entities: Record<string, ExtractedEntity>;
    page_count: number;
  }> {
    return this.request(`/documents/${documentId}/entities`);
  }

  async approveHITLTicket(
    ticketId: string,
    reviewerEmail: string,
    notes?: string
  ): Promise<unknown> {
    return this.request(`/invoices/hitl/${ticketId}/approve`, {
      method: "POST",
      body: JSON.stringify({ decision: "APPROVE", reviewer_email: reviewerEmail, notes }),
    });
  }

  async rejectHITLTicket(
    ticketId: string,
    reviewerEmail: string,
    notes?: string
  ): Promise<unknown> {
    return this.request(`/invoices/hitl/${ticketId}/reject`, {
      method: "POST",
      body: JSON.stringify({ decision: "REJECT", reviewer_email: reviewerEmail, notes }),
    });
  }

  // ── Audit ─────────────────────────────────────────────────────────────────

  async listAuditEntries(
    limit = 50,
    offset = 0
  ): Promise<{ entries: AuditEntry[]; count: number }> {
    return this.request(`/audit?limit=${limit}&offset=${offset}`);
  }

  async getAuditEntry(entryId: string): Promise<AuditEntry> {
    return this.request(`/audit/${entryId}`);
  }

  // ── Health ────────────────────────────────────────────────────────────────

  async health(): Promise<{ status: string; timestamp: string }> {
    return this.request("/health");
  }
}

export const apiClient = new EKAApiClient(API_BASE);
