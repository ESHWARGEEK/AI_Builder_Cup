"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Table2,
  FileText,
  Download,
  PlusCircle,
  ExternalLink,
  ShieldCheck,
  CheckCircle,
  Clock,
  Zap,
} from "lucide-react";
import { useEKAStore } from "@/store/eka-store";
import type { ArtifactSubTab } from "@/store/eka-store";

export function LiveArtifactCanvas() {
  const {
    ledgerRows,
    briefDoc,
    artifactSubTab,
    setArtifactSubTab,
    simulateInboundEvent,
  } = useEKAStore();

  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handleExportBrief = () => {
    const blob = new Blob([briefDoc.markdown_content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "NexusWork_Executive_Brief.md";
    a.click();
    URL.revokeObjectURL(url);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2500);
  };

  return (
    <div className="flex flex-col h-full bg-[#0B0F19] text-foreground p-4 overflow-hidden">
      {/* Header and SubTab Switcher */}
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold tracking-wide uppercase text-slate-200">
              AutoWorkspace Live Artifacts
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Autonomous Google Sheets & Docs artifact outputs
            </p>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setArtifactSubTab("sheets")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              artifactSubTab === "sheets"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Table2 className="w-3.5 h-3.5" />
            <span>Sheets Ledger</span>
            <span className="text-[10px] ml-1 bg-black/30 px-1.5 py-0.2 rounded-full">
              {ledgerRows.length}
            </span>
          </button>
          <button
            onClick={() => setArtifactSubTab("docs")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              artifactSubTab === "docs"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Docs Brief</span>
          </button>
        </div>
      </div>

      {/* Subtab 1: Google Sheets Live AP Ledger Grid */}
      {artifactSubTab === "sheets" && (
        <div className="flex flex-col flex-1 mt-3 overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-[11px] text-slate-400">
                Connected Sheet ID: <span className="text-slate-200">1x9-ap-audit-ledger-2026</span>
              </span>
            </div>
            <button
              onClick={() => simulateInboundEvent()}
              className="text-[11px] px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 transition-colors"
              title="Simulate incoming safe invoice to test automatic ledger row append"
            >
              <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Simulate Auto-Post</span>
            </button>
          </div>

          {/* Spreadsheet Table Container */}
          <div className="flex-1 overflow-x-auto overflow-y-auto border border-slate-800 rounded-lg bg-slate-950/60 shadow-inner">
            <table className="w-full text-left border-collapse font-mono text-[11px]">
              <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px] tracking-wider z-10">
                <tr>
                  <th className="py-2 px-3 border-r border-slate-800">Row</th>
                  <th className="py-2 px-3 border-r border-slate-800">Timestamp</th>
                  <th className="py-2 px-3 border-r border-slate-800">Vendor</th>
                  <th className="py-2 px-3 border-r border-slate-800">Invoice #</th>
                  <th className="py-2 px-3 border-r border-slate-800 text-right">Amount (USD)</th>
                  <th className="py-2 px-3 border-r border-slate-800 text-center">Conf</th>
                  <th className="py-2 px-3 border-r border-slate-800 text-center">Status</th>
                  <th className="py-2 px-3">Approved By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                <AnimatePresence initial={false}>
                  {ledgerRows.map((row, index) => {
                    const isAuto = row.compliance_status === "AUTO_APPROVED";
                    const isPending = row.compliance_status === "PENDING_APPROVAL";
                    const isAuthorized = row.compliance_status === "AUTHORIZED_HITL";

                    return (
                      <motion.tr
                        key={row.id}
                        initial={{ opacity: 0, backgroundColor: "rgba(16, 185, 129, 0.2)" }}
                        animate={{ opacity: 1, backgroundColor: "transparent" }}
                        transition={{ duration: 0.6 }}
                        className="hover:bg-slate-900/60 transition-colors"
                      >
                        <td className="py-2 px-3 border-r border-slate-800 text-slate-500 font-mono">
                          {row.sheet_row_index ?? index + 101}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-800 text-slate-400 whitespace-nowrap">
                          {row.timestamp}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-800 font-sans font-medium text-slate-200">
                          {row.vendor_name}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-800 text-blue-300">
                          {row.invoice_number}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-800 text-right font-mono font-medium text-slate-100">
                          ${row.total_amount_usd.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-800 text-center">
                          <span className="text-[10px] text-slate-300">
                            {(row.confidence_score * 100).toFixed(0)}%
                          </span>
                        </td>
                        <td className="py-2 px-3 border-r border-slate-800 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-sans font-semibold tracking-wide ${
                              isAuto
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                : isAuthorized
                                ? "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                            }`}
                          >
                            {row.compliance_status}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-[10px] text-slate-400 truncate max-w-[150px]">
                          {row.approved_by}
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subtab 2: Google Docs Executive Brief Viewer */}
      {artifactSubTab === "docs" && (
        <div className="flex flex-col flex-1 mt-3 overflow-y-auto pr-1">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] text-slate-400 font-mono">
              Document: <span className="text-blue-400">Initech_EMEA_Executive_Brief.gdoc</span>
            </span>
            <button
              onClick={handleExportBrief}
              className="text-xs px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloadSuccess ? "Downloaded!" : "Export Markdown"}</span>
            </button>
          </div>

          <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs space-y-4 font-sans leading-relaxed shadow-sm">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-slate-100">{briefDoc.title}</h2>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 font-mono">
                <span>AAL 3 Autonomous Brief</span>
                <span>•</span>
                <span>Author: NexusWork Proxy Engine</span>
              </div>
            </div>

            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-blue-400 mb-1">
                Executive Summary
              </h4>
              <p className="text-slate-300 text-[12px]">{briefDoc.summary}</p>
            </div>

            <div className="p-3 rounded bg-amber-950/20 border border-amber-500/30">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 mb-1">
                Compliance Findings
              </h4>
              <p className="text-amber-200/90 whitespace-pre-line text-[11px]">
                {briefDoc.compliance_notes}
              </p>
            </div>

            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400 mb-2">
                Recommended Remediation Actions
              </h4>
              <ul className="space-y-1.5 text-slate-300 text-[11px]">
                {briefDoc.recommended_actions.map((action, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
