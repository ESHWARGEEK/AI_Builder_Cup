"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Shield,
  Users,
  Clock,
  DollarSign,
  Percent,
  Hash,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
} from "lucide-react";
import { useEKAStore } from "@/store/eka-store";
import { apiClient } from "@/lib/api-client";
import type { InvoiceProcessingResponse } from "@/lib/api-client";

function StepIndicator({
  label,
  status,
  detail,
}: {
  label: string;
  status: "pending" | "active" | "complete" | "error";
  detail?: string;
}) {
  const icons = {
    pending: <div className="w-4 h-4 rounded-full border border-border" />,
    active: <Loader2 className="w-4 h-4 animate-spin text-primary" />,
    complete: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
    error: <XCircle className="w-4 h-4 text-red-400" />,
  };

  return (
    <div
      className={`step-indicator ${status === "active" ? "active" : ""} ${status === "complete" ? "complete" : ""} ${status === "error" ? "error" : ""}`}
    >
      <div className="shrink-0">{icons[status]}</div>
      <div className="flex-1">
        <div className="text-sm font-medium">{label}</div>
        {detail && <div className="text-xs text-muted-foreground">{detail}</div>}
      </div>
    </div>
  );
}

function GovernanceBadge({ decision }: { decision: string }) {
  if (decision === "AUTO_PROCESS") {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl glow-green">
        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        <div>
          <div className="text-emerald-400 font-semibold">Auto-Processed</div>
          <div className="text-xs text-emerald-400/70">All AAL-3 checks passed</div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl glow-red">
      <AlertTriangle className="w-5 h-5 text-red-400" />
      <div>
        <div className="text-red-400 font-semibold">HALT — HITL Review Required</div>
        <div className="text-xs text-red-400/70">Manager authorization needed</div>
      </div>
    </div>
  );
}

function MetricRow({
  icon: Icon,
  label,
  value,
  sub,
  status,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  status?: "ok" | "warn" | "error";
}) {
  const statusColors = { ok: "text-emerald-400", warn: "text-amber-400", error: "text-red-400" };
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/30 last:border-0">
      <Icon
        className={`w-4 h-4 ${status ? statusColors[status] : "text-muted-foreground"} shrink-0`}
      />
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-medium text-foreground truncate">{value}</div>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </div>
    </div>
  );
}

function InvoiceResultCard({ result }: { result: InvoiceProcessingResponse }) {
  const { extraction, verification, governance_decision, violations, processing_time_seconds } = result;
  const [showRaw, setShowRaw] = useState(false);
  const [showLineItems, setShowLineItems] = useState(false);
  const { setSelectedEntity, setPdfFile } = useEKAStore();

  const confidencePct = Math.round(extraction.confidence_score * 100);

  return (
    <div className="space-y-4">
      {/* Governance Decision */}
      <GovernanceBadge decision={governance_decision} />

      {/* Processing time */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="w-3.5 h-3.5" />
        Processed in {processing_time_seconds.toFixed(2)}s
      </div>

      {/* Key Metrics */}
      <div className="glass rounded-xl divide-y divide-border/30 overflow-hidden">
        <div className="px-4 py-2.5 flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Extraction Results</span>
        </div>
        <div className="px-4 py-1">
          <MetricRow
            icon={Hash}
            label="Invoice Number"
            value={extraction.invoice_number}
          />
          <MetricRow
            icon={Users}
            label="Vendor"
            value={extraction.vendor_name}
            sub={extraction.vendor_id ? `ID: ${extraction.vendor_id}` : "No vendor ID"}
            status={verification.vendor_valid ? "ok" : "error"}
          />
          <MetricRow
            icon={DollarSign}
            label="Total Amount"
            value={`$${extraction.total_amount_usd.toFixed(2)} ${extraction.currency}`}
            sub={`Net: $${extraction.net_amount_usd.toFixed(2)} + Tax: $${extraction.tax_amount_usd.toFixed(2)}`}
            status={verification.arithmetic_valid ? "ok" : "error"}
          />
          <MetricRow
            icon={Percent}
            label="Confidence Score"
            value={`${confidencePct}%`}
            sub={confidencePct >= 95 ? "Above threshold" : "Below 95% threshold"}
            status={confidencePct >= 95 ? "ok" : "warn"}
          />
        </div>
      </div>

      {/* Verification Suite Results */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 flex items-center gap-2 border-b border-border/30">
          <Shield className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold">Verification Results</span>
        </div>
        <div className="px-4 py-3 space-y-2">
          {[
            {
              label: "Arithmetic Check",
              ok: verification.arithmetic_valid,
              detail: verification.arithmetic_valid
                ? `Delta: $${verification.arithmetic_delta_usd.toFixed(4)}`
                : `Mismatch: Expected $${verification.expected_total.toFixed(2)}, Found $${verification.extracted_total.toFixed(2)}`,
            },
            {
              label: "Vendor Validation",
              ok: verification.vendor_valid,
              detail: verification.vendor_valid ? "In approved registry" : "Unknown vendor",
            },
            {
              label: "Duplicate Check",
              ok: !verification.duplicate_detected,
              detail: verification.duplicate_detected
                ? `Duplicate of ${verification.duplicate_invoice_id}`
                : "No duplicate found",
            },
          ].map((check) => (
            <div key={check.label} className="flex items-start gap-2">
              {check.ok ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="text-sm font-medium">{check.label}</div>
                <div className="text-xs text-muted-foreground">{check.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Violations */}
      {violations.length > 0 && (
        <div className="glass rounded-xl p-4 border border-red-500/20">
          <div className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            Governance Violations
          </div>
          <ul className="space-y-1">
            {violations.map((v) => (
              <li key={v} className="text-xs text-red-400/80 flex items-center gap-1.5">
                <span className="w-1 h-1 bg-red-400/60 rounded-full" />
                {v.replace(/_/g, " ")}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Line Items */}
      {extraction.line_items.length > 0 && (
        <div className="glass rounded-xl overflow-hidden">
          <button
            onClick={() => setShowLineItems(!showLineItems)}
            className="w-full px-4 py-2.5 flex items-center justify-between text-sm font-semibold border-b border-border/30 hover:bg-secondary/30 transition-colors"
          >
            <span>Line Items ({extraction.line_items.length})</span>
            {showLineItems ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          <AnimatePresence>
            {showLineItems && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 py-3 space-y-2 max-h-48 overflow-y-auto">
                  {extraction.line_items.map((item, i) => (
                    <div key={i} className="text-xs text-muted-foreground border-b border-border/20 pb-2 last:border-0">
                      <div className="font-medium text-foreground">
                        {(item.description as any)?.value || `Line ${i + 1}`}
                      </div>
                      <div className="flex gap-3 mt-0.5">
                        {(item.quantity as any)?.value && <span>Qty: {(item.quantity as any).value}</span>}
                        {(item.amount as any)?.value && <span>Amount: {(item.amount as any).value}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Audit info */}
      <div className="text-xs text-muted-foreground space-y-1 px-1">
        <div>Audit ID: <span className="font-mono text-foreground">{result.audit_entry_id.slice(0, 16)}...</span></div>
        {result.hitl_ticket_id && (
          <div>HITL Ticket: <span className="font-mono text-amber-400">{result.hitl_ticket_id.slice(0, 16)}...</span></div>
        )}
      </div>
    </div>
  );
}

export function InvoicePanel() {
  const {
    currentInvoiceResult,
    setInvoiceResult,
    processingSteps,
    setProcessingStep,
    resetProcessingSteps,
    isProcessingInvoice,
    setProcessingInvoice,
    sessionId,
    setPdfFile,
  } = useEKAStore();

  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      if (!file) return;

      setUploadError(null);
      resetProcessingSteps();
      setInvoiceResult(null);
      setProcessingInvoice(true);
      setPdfFile(file);

      const startTime = Date.now();

      try {
        // Step 1: Upload
        setProcessingStep("upload", { status: "active", detail: `${(file.size / 1024).toFixed(0)} KB` });
        await new Promise((r) => setTimeout(r, 200));
        setProcessingStep("upload", { status: "complete", detail: file.name });

        // Step 2: Extraction
        setProcessingStep("extraction", { status: "active", detail: "Document AI processing..." });

        const result = await apiClient.uploadInvoice(file, sessionId ?? undefined);

        setProcessingStep("extraction", {
          status: "complete",
          detail: `${result.extraction.page_count} page(s) · ${Math.round(result.extraction.confidence_score * 100)}% confidence`,
        });

        // Step 3: Verification
        setProcessingStep("verification", { status: "active", detail: "Checking arithmetic, vendor, duplicates..." });
        await new Promise((r) => setTimeout(r, 100));
        setProcessingStep("verification", {
          status: result.verification.arithmetic_valid && result.verification.vendor_valid && !result.verification.duplicate_detected ? "complete" : "error",
          detail: `${[
            result.verification.arithmetic_valid ? "✓ Arithmetic" : "✗ Arithmetic",
            result.verification.vendor_valid ? "✓ Vendor" : "✗ Vendor",
            !result.verification.duplicate_detected ? "✓ Dedup" : "✗ Dedup",
          ].join(" · ")}`,
        });

        // Step 4: Governance
        setProcessingStep("governance", { status: "active", detail: "AAL-3 evaluation..." });
        await new Promise((r) => setTimeout(r, 100));
        setProcessingStep("governance", {
          status: result.governance_decision === "AUTO_PROCESS" ? "complete" : "error",
          detail: result.governance_decision === "AUTO_PROCESS" ? "Auto-processed" : `HALT — ${result.violations.length} violation(s)`,
        });

        // Step 5: Notification
        if (result.governance_decision === "HALT_HITL") {
          setProcessingStep("notification", { status: "active", detail: "Dispatching HITL notifications..." });
          await new Promise((r) => setTimeout(r, 200));
          setProcessingStep("notification", {
            status: "complete",
            detail: "Google Chat + email dispatched",
          });
        } else {
          setProcessingStep("notification", { status: "complete", detail: "No notification required" });
        }

        setInvoiceResult(result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Processing failed";
        setUploadError(msg);
        setProcessingStep("extraction", { status: "error", detail: msg });
      } finally {
        setProcessingInvoice(false);
      }
    },
    [sessionId, setInvoiceResult, setProcessingStep, resetProcessingSteps, setProcessingInvoice, setPdfFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div className="flex flex-col h-full gap-4 overflow-y-auto px-4 py-4">
      {/* Upload zone */}
      {!isProcessingInvoice && !currentInvoiceResult && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileInputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center gap-4 p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 ${
            dragOver
              ? "border-primary bg-primary/10 scale-[1.01]"
              : "border-border hover:border-primary/50 hover:bg-secondary/30"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,image/tiff,image/jpeg,image/png"
            onChange={handleFileInput}
            className="hidden"
          />
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Upload className="w-7 h-7 text-primary" />
          </div>
          <div className="text-center">
            <div className="font-semibold text-foreground mb-1">Drop invoice here</div>
            <div className="text-sm text-muted-foreground">PDF, TIFF, JPEG, or PNG · Max 32MB</div>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {["PDF", "TIFF", "JPEG", "PNG"].map((fmt) => (
              <span key={fmt} className="text-xs glass rounded-full px-2.5 py-0.5 text-muted-foreground">
                {fmt}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Processing steps */}
      {(isProcessingInvoice || currentInvoiceResult) && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Processing Pipeline
          </div>
          {processingSteps.map((step) => (
            <StepIndicator
              key={step.id}
              label={step.label}
              status={step.status}
              detail={step.detail}
            />
          ))}
        </div>
      )}

      {/* Results */}
      {currentInvoiceResult && !isProcessingInvoice && (
        <InvoiceResultCard result={currentInvoiceResult} />
      )}

      {/* Error */}
      {uploadError && (
        <div className="glass rounded-xl px-4 py-3 border border-red-500/30 text-red-400 text-sm">
          ⚠ {uploadError}
        </div>
      )}

      {/* Re-upload button */}
      {currentInvoiceResult && !isProcessingInvoice && (
        <button
          onClick={() => {
            setInvoiceResult(null);
            resetProcessingSteps();
            setPdfFile(null);
            setUploadError(null);
          }}
          className="w-full py-2.5 rounded-xl glass border border-border hover:bg-secondary text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Process Another Invoice
        </button>
      )}
    </div>
  );
}
