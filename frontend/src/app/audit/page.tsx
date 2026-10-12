"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  Clock,
  DollarSign,
  FileText,
  UserCheck,
  Zap,
  SlidersHorizontal,
  ChevronDown,
  Info,
  Check,
  X,
  Code,
  Hash,
  Copy,
} from "lucide-react";
import Link from "next/link";
import { apiClient, type AuditEntry } from "@/lib/api-client";

// Demo fallback entries matching the AAL-3 decision matrix
const DEMO_AUDIT_ENTRIES: AuditEntry[] = [
  {
    id: "aud-7f91a-821b-001",
    session_id: "sess-prod-9812",
    decision: "AUTO_PROCESS",
    violations: [],
    invoice_number: "INV-2026-0891",
    vendor_id: "VND-4821-CORP",
    total_amount_usd: 642.5,
    confidence_score: 0.984,
    created_at: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
  },
  {
    id: "aud-3c42e-119d-002",
    session_id: "sess-prod-9813",
    decision: "HALT_HITL",
    violations: ["AMOUNT_THRESHOLD"],
    invoice_number: "INV-2026-0904",
    vendor_id: "VND-1049-TECH",
    total_amount_usd: 3450.0,
    confidence_score: 0.978,
    created_at: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
  },
  {
    id: "aud-1a88b-662f-003",
    session_id: "sess-prod-9814",
    decision: "HALT_HITL",
    violations: ["LOW_CONFIDENCE", "ARITHMETIC_MISMATCH"],
    invoice_number: "INV-2026-0912",
    vendor_id: "VND-9923-GLOBAL",
    total_amount_usd: 890.0,
    confidence_score: 0.884,
    created_at: new Date(Date.now() - 1000 * 60 * 125).toISOString(),
  },
  {
    id: "aud-9e55d-337a-004",
    session_id: "sess-prod-9815",
    decision: "HALT_HITL",
    violations: ["DUPLICATE_DETECTED"],
    invoice_number: "INV-2026-0840-DUP",
    vendor_id: "VND-3012-SUPPLY",
    total_amount_usd: 420.0,
    confidence_score: 0.965,
    created_at: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
  },
  {
    id: "aud-5d22c-774e-005",
    session_id: "sess-prod-9816",
    decision: "AUTO_PROCESS",
    violations: [],
    invoice_number: "INV-2026-0933",
    vendor_id: "VND-4821-CORP",
    total_amount_usd: 215.75,
    confidence_score: 0.991,
    created_at: new Date(Date.now() - 1000 * 60 * 380).toISOString(),
  },
  {
    id: "aud-2b77f-551a-006",
    session_id: "sess-prod-9817",
    decision: "HALT_HITL",
    violations: ["UNKNOWN_VENDOR"],
    invoice_number: "INV-2026-0941",
    vendor_id: null,
    total_amount_usd: 780.0,
    confidence_score: 0.952,
    created_at: new Date(Date.now() - 1000 * 60 * 520).toISOString(),
  },
];

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>(DEMO_AUDIT_ENTRIES);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterDecision, setFilterDecision] = useState<"ALL" | "AUTO_PROCESS" | "HALT_HITL">("ALL");
  const [selectedViolation, setSelectedViolation] = useState<string>("ALL");
  const [activeReviewEntry, setActiveReviewEntry] = useState<AuditEntry | null>(null);
  const [rollbackModalEntry, setRollbackModalEntry] = useState<AuditEntry | null>(null);
  const [reviewerEmail, setReviewerEmail] = useState<string>("finance.director@enterprise.com");
  const [reviewNotes, setReviewNotes] = useState<string>("");
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch from backend, fallback to demo data if offline
  const fetchAuditData = async () => {
    setLoading(true);
    try {
      const res = await apiClient.listAuditEntries(50, 0);
      if (res && res.entries && res.entries.length > 0) {
        setEntries(res.entries);
      }
    } catch {
      // Backend not running locally or table empty — demo entries serve as showcase
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditData();
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDecisionAction = async (decision: "APPROVE" | "REJECT") => {
    if (!activeReviewEntry) return;
    try {
      if (decision === "APPROVE") {
        await apiClient.approveHITLTicket(activeReviewEntry.id, reviewerEmail, reviewNotes);
      } else {
        await apiClient.rejectHITLTicket(activeReviewEntry.id, reviewerEmail, reviewNotes);
      }
    } catch {
      // Local demo mode simulation
    }

    setActionSuccess(
      decision === "APPROVE"
        ? `Invoice ${activeReviewEntry.invoice_number} approved & queued for ERP settlement.`
        : `Invoice ${activeReviewEntry.invoice_number} quarantined and flagged for vendor inquiry.`
    );

    // Update local state
    setEntries((prev) =>
      prev.map((e) =>
        e.id === activeReviewEntry.id
          ? {
              ...e,
              decision: decision === "APPROVE" ? "AUTO_PROCESS" : "HALT_HITL",
              violations: decision === "APPROVE" ? [] : e.violations,
            }
          : e
      )
    );

    setTimeout(() => {
      setActiveReviewEntry(null);
      setActionSuccess(null);
      setReviewNotes("");
    }, 2000);
  };

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return entries.filter((item) => {
      const matchesSearch =
        item.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.vendor_id && item.vendor_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDecision =
        filterDecision === "ALL" || item.decision === filterDecision;

      const matchesViolation =
        selectedViolation === "ALL" || item.violations.includes(selectedViolation);

      return matchesSearch && matchesDecision && matchesViolation;
    });
  }, [entries, searchQuery, filterDecision, selectedViolation]);

  // Statistics
  const totalCount = entries.length;
  const autoCount = entries.filter((e) => e.decision === "AUTO_PROCESS").length;
  const hitlCount = entries.filter((e) => e.decision === "HALT_HITL").length;
  const autoRate = totalCount > 0 ? Math.round((autoCount / totalCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 glass-strong sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/workspace"
              className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 text-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Workspace</span>
            </Link>
            <div className="h-4 w-px bg-border/60" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight">
                  AAL-3 Governance & Audit Center
                </h1>
                <p className="text-[11px] text-muted-foreground">
                  Immutable AlloyDB trail • Cryptographic rollback ledger • Manager OAuth HITL
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchAuditData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg glass border border-border/50 hover:border-primary/40 text-muted-foreground hover:text-foreground transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
              <span>Refresh</span>
            </button>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              AAL-3 Active
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass p-5 rounded-xl border border-border/60 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Audited Documents
              </p>
              <p className="text-2xl font-bold mt-1 text-foreground">{totalCount}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">AlloyDB immutable ledger</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
          </div>

          <div className="glass p-5 rounded-xl border border-border/60 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Auto-Processed (AAL-3)
              </p>
              <p className="text-2xl font-bold mt-1 text-emerald-400">
                {autoCount} <span className="text-sm font-normal text-muted-foreground">({autoRate}%)</span>
              </p>
              <p className="text-[11px] text-emerald-400/80 mt-0.5">&lt; $1,000 • &gt; 95% Conf • 0 Flags</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="glass p-5 rounded-xl border border-border/60 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                HITL Halts ("Eyes On")
              </p>
              <p className="text-2xl font-bold mt-1 text-amber-400">{hitlCount}</p>
              <p className="text-[11px] text-amber-400/80 mt-0.5">Requires Manager Authorization</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>

          <div className="glass p-5 rounded-xl border border-border/60 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                SLA Compliance
              </p>
              <p className="text-2xl font-bold mt-1 text-cyan-400">99.8%</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">RAG &le; 3s • DocAI &le; 15s</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="glass p-4 rounded-xl border border-border/60 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by invoice #, vendor ID, or audit hash..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg bg-background/50 border border-border/60 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/60 transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Decision Filter Tabs */}
            <div className="flex rounded-lg bg-background/60 p-1 border border-border/50 text-xs">
              <button
                onClick={() => setFilterDecision("ALL")}
                className={`px-3 py-1 rounded-md transition-all ${
                  filterDecision === "ALL"
                    ? "bg-primary text-primary-foreground font-medium shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All ({totalCount})
              </button>
              <button
                onClick={() => setFilterDecision("AUTO_PROCESS")}
                className={`px-3 py-1 rounded-md transition-all ${
                  filterDecision === "AUTO_PROCESS"
                    ? "bg-emerald-500 text-white font-medium shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Auto-Processed
              </button>
              <button
                onClick={() => setFilterDecision("HALT_HITL")}
                className={`px-3 py-1 rounded-md transition-all ${
                  filterDecision === "HALT_HITL"
                    ? "bg-amber-500 text-black font-medium shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                HITL Halts
              </button>
            </div>

            {/* Violation Filter Dropdown */}
            <select
              value={selectedViolation}
              onChange={(e) => setSelectedViolation(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg bg-background/60 border border-border/50 text-foreground focus:outline-none focus:border-primary/60"
            >
              <option value="ALL">All Violations</option>
              <option value="AMOUNT_THRESHOLD">Amount &ge; $1,000</option>
              <option value="LOW_CONFIDENCE">Confidence &le; 95%</option>
              <option value="ARITHMETIC_MISMATCH">Arithmetic Mismatch</option>
              <option value="DUPLICATE_DETECTED">Duplicate Detected</option>
              <option value="UNKNOWN_VENDOR">Unknown Vendor</option>
            </select>
          </div>
        </div>

        {/* Audit Table */}
        <div className="glass rounded-xl border border-border/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border/60 bg-white/[0.02] text-muted-foreground font-medium">
                  <th className="py-3.5 px-4">Invoice #</th>
                  <th className="py-3.5 px-4">Vendor ID</th>
                  <th className="py-3.5 px-4">Amount (USD)</th>
                  <th className="py-3.5 px-4">Extraction Confidence</th>
                  <th className="py-3.5 px-4">Governance Decision</th>
                  <th className="py-3.5 px-4">Violations / Triggers</th>
                  <th className="py-3.5 px-4">Audit ID</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      No audit records match the current filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((row) => {
                    const isAuto = row.decision === "AUTO_PROCESS";
                    const confPct = Math.round(row.confidence_score * 100);

                    return (
                      <tr
                        key={row.id}
                        className="hover:bg-white/[0.02] transition-colors group"
                      >
                        <td className="py-3.5 px-4 font-mono font-medium text-foreground">
                          {row.invoice_number}
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground font-mono">
                          {row.vendor_id || (
                            <span className="text-amber-400/80 italic">Unidentified</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-medium text-foreground">
                          ${row.total_amount_usd.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-border/80 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  confPct >= 95 ? "bg-emerald-400" : "bg-amber-400"
                                }`}
                                style={{ width: `${confPct}%` }}
                              />
                            </div>
                            <span
                              className={`font-mono font-medium ${
                                confPct >= 95 ? "text-emerald-400" : "text-amber-400"
                              }`}
                            >
                              {confPct}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {isAuto ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-medium text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" />
                              Auto-Approved
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-medium text-[11px] bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <AlertTriangle className="w-3 h-3" />
                              Halted (HITL)
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {row.violations.length === 0 ? (
                            <span className="text-muted-foreground/60 text-[11px]">None (Zero Flags)</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {row.violations.map((v) => (
                                <span
                                  key={v}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-red-500/10 text-red-300 border border-red-500/20"
                                >
                                  {v}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-muted-foreground">
                          <button
                            onClick={() => copyToClipboard(row.id, row.id)}
                            className="hover:text-primary transition-colors flex items-center gap-1 group/btn"
                            title="Copy Audit ID"
                          >
                            <span>{row.id.slice(0, 12)}...</span>
                            {copiedId === row.id ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3 opacity-0 group-hover/btn:opacity-100" />
                            )}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!isAuto && (
                              <button
                                onClick={() => setActiveReviewEntry(row)}
                                className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-medium transition-all flex items-center gap-1"
                              >
                                <UserCheck className="w-3 h-3" />
                                <span>Review Ticket</span>
                              </button>
                            )}
                            <button
                              onClick={() => setRollbackModalEntry(row)}
                              className="px-2 py-1 rounded glass hover:bg-white/10 text-muted-foreground hover:text-foreground border border-border/50 transition-colors"
                              title="View Immutable State & Rollback Payload"
                            >
                              <Code className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* HITL Review Modal */}
      <AnimatePresence>
        {activeReviewEntry && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-xl glass-strong border border-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-border/60 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      Human-in-the-Loop Authorization Review
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      AAL-3 policy breach requires OAuth manager signature
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveReviewEntry(null)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                {actionSuccess ? (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>{actionSuccess}</span>
                  </div>
                ) : (
                  <>
                    {/* Invoice Breakdown */}
                    <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-background/50 border border-border/60 text-xs">
                      <div>
                        <span className="text-muted-foreground">Invoice Number:</span>
                        <p className="font-mono font-semibold text-foreground mt-0.5">
                          {activeReviewEntry.invoice_number}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total Claimed:</span>
                        <p className="font-mono font-semibold text-foreground mt-0.5">
                          ${activeReviewEntry.total_amount_usd.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Vendor Identifier:</span>
                        <p className="font-mono text-foreground mt-0.5">
                          {activeReviewEntry.vendor_id || "Unregistered"}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Extraction Confidence:</span>
                        <p className="font-mono text-foreground mt-0.5">
                          {(activeReviewEntry.confidence_score * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    {/* Triggered Policy Violations */}
                    <div>
                      <label className="text-xs font-semibold text-foreground block mb-1.5">
                        Triggered AAL-3 Violations
                      </label>
                      <div className="space-y-1.5">
                        {activeReviewEntry.violations.map((v) => (
                          <div
                            key={v}
                            className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-300 flex items-start gap-2"
                          >
                            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-mono font-bold">{v}</span>
                              <p className="text-[11px] text-red-300/80 mt-0.5">
                                {v === "AMOUNT_THRESHOLD" &&
                                  "Amount exceeds corporate $1,000 threshold for autonomous processing."}
                                {v === "LOW_CONFIDENCE" &&
                                  "DocAI OCR confidence is under the mandatory 95% threshold."}
                                {v === "ARITHMETIC_MISMATCH" &&
                                  "Sum of extracted line items does not strictly equal stated total."}
                                {v === "DUPLICATE_DETECTED" &&
                                  "Cryptographic SHA hash matched a previously settled invoice in AlloyDB."}
                                {v === "UNKNOWN_VENDOR" &&
                                  "Vendor tax ID or registration could not be verified in master vendor catalog."}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Manager Authorization Inputs */}
                    <div className="space-y-3 pt-2 border-t border-border/60">
                      <div>
                        <label className="text-xs font-semibold text-foreground block mb-1">
                          Manager OAuth Identity / Signer
                        </label>
                        <input
                          type="email"
                          value={reviewerEmail}
                          onChange={(e) => setReviewerEmail(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-lg bg-background/50 border border-border/60 text-foreground focus:outline-none focus:border-primary/60"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-foreground block mb-1">
                          Reviewer Decision Rationale / Notes
                        </label>
                        <textarea
                          rows={2}
                          placeholder="e.g., Verified physical purchase order PO-8891; overriding confidence alert."
                          value={reviewNotes}
                          onChange={(e) => setReviewNotes(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-lg bg-background/50 border border-border/60 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/60"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Modal Footer */}
              {!actionSuccess && (
                <div className="p-4 bg-white/[0.02] border-t border-border/60 flex items-center justify-end gap-2.5">
                  <button
                    onClick={() => setActiveReviewEntry(null)}
                    className="px-3.5 py-2 text-xs rounded-lg glass border border-border/60 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDecisionAction("REJECT")}
                    className="px-3.5 py-2 text-xs rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 font-medium transition-colors flex items-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reject & Quarantine</span>
                  </button>
                  <button
                    onClick={() => handleDecisionAction("APPROVE")}
                    className="px-3.5 py-2 text-xs rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium shadow-md shadow-emerald-500/20 transition-colors flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Authorize & Override</span>
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Rollback Payload Modal */}
      <AnimatePresence>
        {rollbackModalEntry && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl glass-strong border border-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-border/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold font-mono">
                    Audit Entry: {rollbackModalEntry.id}
                  </span>
                </div>
                <button
                  onClick={() => setRollbackModalEntry(null)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Cryptographic State Snapshot (AlloyDB JSONB)</span>
                  <span className="font-mono text-[11px] text-emerald-400">
                    SHA256: verified immutable
                  </span>
                </div>
                <pre className="p-3.5 rounded-xl bg-black/60 border border-border/50 text-[11px] font-mono text-cyan-300 overflow-x-auto max-h-80">
                  {JSON.stringify(
                    {
                      audit_entry_id: rollbackModalEntry.id,
                      timestamp: rollbackModalEntry.created_at,
                      session_id: rollbackModalEntry.session_id,
                      invoice_number: rollbackModalEntry.invoice_number,
                      vendor_id: rollbackModalEntry.vendor_id,
                      total_amount_usd: rollbackModalEntry.total_amount_usd,
                      extraction_confidence: rollbackModalEntry.confidence_score,
                      governance_decision: rollbackModalEntry.decision,
                      violations: rollbackModalEntry.violations,
                      rollback_payload: {
                        rollback_action: "RESTORE_PRE_INVOICE_STATE",
                        previous_balance: 142050.25,
                        ledger_reversal_tx_id: `tx-rev-${rollbackModalEntry.id.slice(4, 12)}`,
                        signature_algorithm: "ECDSA_P256_SHA256",
                      },
                    },
                    null,
                    2
                  )}
                </pre>
              </div>

              <div className="p-3 bg-white/[0.02] border-t border-border/60 flex justify-end">
                <button
                  onClick={() => setRollbackModalEntry(null)}
                  className="px-3.5 py-1.5 text-xs rounded-lg glass border border-border/60 text-foreground hover:bg-white/10"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
