"use client";

import { motion } from "framer-motion";
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Lock,
  ArrowRight,
  RotateCcw,
  AlertTriangle,
  KeyRound,
  FileSpreadsheet,
} from "lucide-react";
import { useEKAStore } from "@/store/eka-store";

export function HITLActionCard() {
  const { hitlDecision, authorizeHITL, rejectHITL, setCanvasTab, setArtifactSubTab } =
    useEKAStore();

  const handleAuthorize = () => {
    authorizeHITL();
    // Switch canvas to artifacts tab to see live sheet row insertion
    setCanvasTab("artifacts");
    setArtifactSubTab("sheets");
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`p-4 rounded-xl border transition-all my-3 ${
        hitlDecision === "AUTHORIZED"
          ? "bg-emerald-950/20 border-emerald-500/40 shadow-lg shadow-emerald-950/20"
          : hitlDecision === "REJECTED"
          ? "bg-rose-950/20 border-rose-500/40 shadow-lg shadow-rose-950/20"
          : "bg-amber-950/20 border-amber-500/50 shadow-lg shadow-amber-950/30"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              hitlDecision === "AUTHORIZED"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : hitlDecision === "REJECTED"
                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
            }`}
          >
            {hitlDecision === "AUTHORIZED" ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : hitlDecision === "REJECTED" ? (
              <XCircle className="w-4 h-4" />
            ) : (
              <ShieldAlert className="w-4 h-4" />
            )}
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <span>AAL 3 Consequential Action Gatekeeper</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Eyes-On Tier
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Deterministic governance policy prevented autonomous execution
            </p>
          </div>
        </div>

        {/* Status Pill */}
        <span
          className={`text-[10px] font-mono font-semibold uppercase px-2.5 py-1 rounded-full border ${
            hitlDecision === "AUTHORIZED"
              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
              : hitlDecision === "REJECTED"
              ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
              : "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse"
          }`}
        >
          {hitlDecision === "AUTHORIZED"
            ? "AUTHORIZED & COMMITTED"
            : hitlDecision === "REJECTED"
            ? "REJECTED & ROLLED BACK"
            : "EXECUTION PAUSED: $4,200.00"}
        </span>
      </div>

      {/* Exception Reason Box */}
      {hitlDecision === "PENDING_REVIEW" && (
        <div className="mt-3 p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/30 text-[11px] text-amber-200/90 leading-snug">
          <span className="font-semibold text-amber-300">Policy Trigger Reason:</span>{" "}
          Invoice amount ($4,200.00) exceeds $1,000.00 auto-processing threshold, and entity extraction confidence is 91% (&lt; 95% requirement).
        </div>
      )}

      {/* Deterministic Math Breakdown Table */}
      <div className="mt-3 p-3 rounded-lg bg-slate-900/80 border border-slate-800">
        <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-2 flex items-center justify-between">
          <span>Deterministic Arithmetic Verification (Python Decimal)</span>
          <span className="text-emerald-400 font-mono text-[10px]">✓ Zero Drift Match</span>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
          <div className="p-1.5 rounded bg-slate-950/60 border border-slate-800">
            <div className="text-[9px] uppercase text-slate-500">Subtotal</div>
            <div className="text-slate-200 font-semibold">$3,900.00</div>
          </div>
          <div className="p-1.5 rounded bg-slate-950/60 border border-slate-800">
            <div className="text-[9px] uppercase text-slate-500">Tax (7.69%)</div>
            <div className="text-slate-200 font-semibold">$300.00</div>
          </div>
          <div className="p-1.5 rounded bg-slate-950/60 border border-slate-800">
            <div className="text-[9px] uppercase text-slate-500">Discount</div>
            <div className="text-slate-200 font-semibold">$0.00</div>
          </div>
          <div className="p-1.5 rounded bg-emerald-950/30 border border-emerald-500/30 text-emerald-300">
            <div className="text-[9px] uppercase text-emerald-400">Total</div>
            <div className="font-bold">$4,200.00</div>
          </div>
        </div>
      </div>

      {/* Policy Warnings List */}
      <div className="mt-2 text-[11px] text-slate-300 space-y-1">
        <div className="flex items-center gap-1.5 text-amber-300">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>Payment terms specified: Net 15 days (Corporate policy mandates Net 30 days pursuant to §8.1)</span>
        </div>
      </div>

      {/* Interactive Actions / Decision State */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
        {hitlDecision === "PENDING_REVIEW" ? (
          <>
            <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
              <Lock className="w-3 h-3 text-amber-400" />
              <span>Requires Manager OAuth 2.0 PKCE sign-off</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={rejectHITL}
                className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-300 hover:text-rose-300 hover:bg-rose-950/30 border border-slate-700 transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reject & Rollback</span>
              </button>
              <button
                onClick={handleAuthorize}
                className="px-4 py-1.5 rounded-md text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm shadow-amber-500/30 transition-all flex items-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Authorize & Post to Ledger (OAuth Sign-off)</span>
              </button>
            </div>
          </>
        ) : hitlDecision === "AUTHORIZED" ? (
          <div className="w-full flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>
                Authorized by <strong className="text-white">Elena Rostova</strong> (OAuth Token #sig-99e2f)
              </span>
            </div>
            <button
              onClick={() => {
                setCanvasTab("artifacts");
                setArtifactSubTab("sheets");
              }}
              className="text-[11px] text-blue-400 hover:underline flex items-center gap-1 font-mono"
            >
              <FileSpreadsheet className="w-3 h-3" />
              <span>View Row in Sheets Ledger</span>
            </button>
          </div>
        ) : (
          <div className="w-full flex items-center gap-2 text-xs text-rose-300">
            <XCircle className="w-4 h-4 text-rose-400" />
            <span>
              Rejected by Manager. Compensating rollback payload committed to AlloyDB audit trail.
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
