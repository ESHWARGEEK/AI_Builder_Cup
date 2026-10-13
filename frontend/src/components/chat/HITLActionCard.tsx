"use client";

import { motion } from "framer-motion";
import { useEKAStore } from "@/store/eka-store";

export function HITLActionCard() {
  const { hitlDecision, authorizeHITL, rejectHITL, setCanvasTab, setArtifactSubTab } =
    useEKAStore();

  const handleAuthorize = () => {
    authorizeHITL();
    setCanvasTab("artifacts");
    setArtifactSubTab("sheets");
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`rounded border p-5 relative overflow-hidden flex flex-col gap-4 my-3 transition-all ${
        hitlDecision === "AUTHORIZED"
          ? "border-emerald-800/50 bg-obsidian text-executive-primary"
          : hitlDecision === "REJECTED"
          ? "border-red-800/50 bg-obsidian text-executive-primary"
          : "border-amber-800/50 bg-obsidian text-executive-primary"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <div className="text-[13px] font-medium text-white flex items-center gap-2">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                hitlDecision === "AUTHORIZED"
                  ? "bg-emerald-400"
                  : hitlDecision === "REJECTED"
                  ? "bg-red-400"
                  : "bg-amber-400"
              }`}
            />
            <span>AAL 3 Consequential Action Gatekeeper</span>
          </div>
          <div className="text-[10px] text-executive-dim font-mono">
            Deterministic Safety Circuit • Human Authorization Required
          </div>
        </div>

        <span
          className={`px-2 py-0.5 rounded border font-mono text-[9px] uppercase tracking-widest ${
            hitlDecision === "AUTHORIZED"
              ? "border-emerald-800/50 text-emerald-300 bg-emerald-950/20"
              : hitlDecision === "REJECTED"
              ? "border-red-800/50 text-red-300 bg-red-950/20"
              : "border-amber-800/50 text-amber-300 bg-amber-950/20 animate-pulse"
          }`}
        >
          {hitlDecision === "AUTHORIZED"
            ? "COMMITTED"
            : hitlDecision === "REJECTED"
            ? "ROLLED BACK"
            : "HITL HOLD"}
        </span>
      </div>

      {/* Description */}
      <div className="text-[12px] text-executive-muted leading-relaxed font-sans">
        Invoice total of <span className="text-white font-medium font-mono">$4,200.00</span> exceeds autonomous commit boundary threshold (<span className="text-executive-dim font-mono">$1,000.00</span>) and requires discretionary signing.
      </div>

      {/* Deterministic Validation Matrix */}
      <div className="rounded border border-obsidian-border bg-obsidian-subtle p-3.5 font-mono text-[11px]">
        <div className="text-[9px] uppercase tracking-wider text-executive-dim mb-2 flex justify-between items-center">
          <span>Deterministic Validation Matrix (Python Decimal)</span>
          <span className="text-executive-dim">SAP Ledger Match</span>
        </div>
        <div className="flex items-center justify-between text-executive-muted py-0.5">
          <span>Dell PowerEdge R750 + Rail Kit</span>
          <span className="text-white font-mono">$3,900.00</span>
        </div>
        <div className="flex items-center justify-between text-executive-muted py-0.5">
          <span>Statutory VAT (7.692%)</span>
          <span className="text-white font-mono">$300.00</span>
        </div>
        <div className="h-px bg-obsidian-border my-2" />
        <div className="flex items-center justify-between font-medium text-[12px]">
          <span className="text-white">Gross Verified Total</span>
          <div className="flex items-center gap-2">
            <span className="text-white font-mono">$4,200.00</span>
            <span className="text-emerald-400 text-[10px]">✓ OK</span>
          </div>
        </div>
      </div>

      {/* Clause Exception Notice */}
      <div className="p-2.5 rounded border border-amber-900/40 bg-obsidian-subtle text-[11px] text-amber-200/90 font-mono flex items-center gap-2">
        <span className="material-symbols-outlined text-[14px] text-amber-400">info</span>
        <span>Clause Exception §8.1: Counter-draft prepared in redline view.</span>
      </div>

      {/* Decision Buttons & Status */}
      {hitlDecision === "PENDING_REVIEW" ? (
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleAuthorize}
            id="authorize-hitl-btn"
            className="flex-1 py-2 px-4 rounded bg-white hover:bg-executive-primary text-obsidian font-medium text-[12px] flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-[0.99]"
          >
            <span className="material-symbols-outlined text-[15px]">key</span>
            <span>Authorize & Commit with Spiffe ID</span>
          </button>
          <button
            onClick={rejectHITL}
            id="rollback-hitl-btn"
            className="py-2 px-4 rounded border border-obsidian-border hover:bg-obsidian-panel text-executive-muted hover:text-white font-medium text-[12px] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[14px]">close</span>
            <span>Reject & Rollback</span>
          </button>
        </div>
      ) : hitlDecision === "AUTHORIZED" ? (
        <div className="p-2.5 rounded border border-emerald-800/40 bg-emerald-950/20 font-mono text-[11px] text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[15px] text-emerald-400">check</span>
            <span>Authorized by Elena Rostova. Committed to AlloyDB Block 0x89F.</span>
          </div>
          <button
            onClick={() => {
              setCanvasTab("artifacts");
              setArtifactSubTab("sheets");
            }}
            className="text-[10px] text-executive-blue hover:underline font-mono"
          >
            View Live Ledger →
          </button>
        </div>
      ) : (
        <div className="p-2.5 rounded border border-red-800/40 bg-red-950/20 font-mono text-[11px] text-red-300 flex items-center gap-2">
          <span className="material-symbols-outlined text-[15px] text-red-400">cancel</span>
          <span>Transaction rejected. Pre-ingest state restored in AlloyDB audit ledger.</span>
        </div>
      )}
    </motion.div>
  );
}
