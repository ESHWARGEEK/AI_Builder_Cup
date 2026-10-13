"use client";

import { motion } from "framer-motion";
import {
  FileDiff,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { useEKAStore } from "@/store/eka-store";

export function RedlineDiffViewer() {
  const { redlines, applyRedline } = useEKAStore();

  const activeFlagsCount = redlines.filter((r) => !r.applied).length;

  return (
    <div className="flex flex-col h-full bg-[#0B0F19] text-foreground p-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <FileDiff className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold tracking-wide uppercase text-slate-200">
              Active Compliance Redline Engine
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Pre-execution audit against Procurement & Legal Policies
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
              activeFlagsCount > 0
                ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
            }`}
          >
            {activeFlagsCount > 0 ? `${activeFlagsCount} Active Flags` : "All Compliant"}
          </span>
        </div>
      </div>

      {/* Intro Context Banner */}
      <div className="mt-3 p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
        <div className="flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-medium text-slate-100">
              Contract Under Audit: Initech Master Services Agreement (EMEA)
            </span>
            <p className="text-[11px] text-slate-400 mt-0.5">
              NexusWork scanned 14 clauses and flagged 2 non-compliant terms. Below are the recommended enterprise replacement clauses.
            </p>
          </div>
        </div>
      </div>

      {/* Redline Cards */}
      <div className="mt-4 space-y-4">
        {redlines.map((redline) => {
          const isCritical = redline.severity === "CRITICAL";

          return (
            <motion.div
              key={redline.id}
              layout
              className={`p-3.5 rounded-lg border transition-all ${
                redline.applied
                  ? "bg-slate-900/40 border-slate-800 opacity-80"
                  : isCritical
                  ? "bg-rose-950/20 border-rose-500/40 shadow-sm shadow-rose-950/30"
                  : "bg-amber-950/20 border-amber-500/40 shadow-sm shadow-amber-950/30"
              }`}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {isCritical ? (
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  )}
                  <span className="text-xs font-semibold capitalize text-slate-100">
                    {redline.clause_type.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-semibold ${
                      isCritical
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    }`}
                  >
                    {redline.severity}
                  </span>
                  {redline.applied && (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Applied
                    </span>
                  )}
                </div>
              </div>

              {/* Policy Rationale & Citation */}
              <p className="text-[11px] text-slate-300 mb-3 leading-relaxed">
                {redline.policy_violation_rationale}
              </p>
              {redline.citation && (
                <div className="mb-3 text-[10px] font-mono text-blue-400 bg-blue-950/30 border border-blue-900/50 px-2 py-1 rounded inline-flex items-center gap-1.5">
                  <ExternalLink className="w-3 h-3" />
                  <span>{redline.citation}</span>
                </div>
              )}

              {/* Git-Style Redline Comparison */}
              <div className="space-y-2 text-xs font-mono">
                {/* Original Clause (Red) */}
                <div className="p-2.5 rounded bg-rose-950/30 border border-rose-500/30 text-rose-200">
                  <div className="text-[10px] uppercase font-bold text-rose-400 mb-1 flex items-center gap-1">
                    <span>[-] Offending Contract Clause</span>
                  </div>
                  <div className="leading-snug text-[11px] select-all">
                    "{redline.original_clause}"
                  </div>
                </div>

                {/* Replacement Boilerplate (Green) */}
                <div className="p-2.5 rounded bg-emerald-950/30 border border-emerald-500/30 text-emerald-200">
                  <div className="text-[10px] uppercase font-bold text-emerald-400 mb-1 flex items-center gap-1">
                    <span>[+] Approved Corporate Replacement</span>
                  </div>
                  <div className="leading-snug text-[11px] select-all">
                    "{redline.replacement_clause}"
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-3 pt-2 border-t border-slate-800/80 flex justify-end">
                {redline.applied ? (
                  <div className="text-[11px] text-emerald-400 flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Replacement applied to staged draft
                  </div>
                ) : (
                  <button
                    onClick={() => applyRedline(redline.id)}
                    className="text-xs px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center gap-1.5 transition-colors shadow-sm shadow-blue-900/40"
                  >
                    <span>Apply Approved Redline Draft</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
