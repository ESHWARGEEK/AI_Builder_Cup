"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useEKAStore } from "@/store/eka-store";

export function RedlineDiffViewer() {
  const { redlines, applyRedline } = useEKAStore();
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const activeFlagsCount = redlines.filter((r) => !r.applied).length;

  const handleExportDocx = () => {
    const docxContent = `# NexusWork Approved Redline Contract Addendum\n\nGenerated for: Dell EMEA S.A.\nVerified against: Global Procurement Policy §8.1\n\n` +
      redlines.map((r) => `## ${r.clause_type.toUpperCase()}\nStatus: ${r.applied ? "APPLIED" : "PENDING"}\nRevision: ${r.replacement_clause}\n`).join("\n");
    const blob = new Blob([docxContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Dell_EMEA_Approved_Redline.docx";
    a.click();
    URL.revokeObjectURL(url);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2000);
  };

  const handleApplyAll = () => {
    redlines.forEach((r) => {
      if (!r.applied) {
        applyRedline(r.id);
      }
    });
  };

  return (
    <div className="flex-1 p-5 flex flex-col justify-between overflow-y-auto gap-4 bg-obsidian text-executive-primary h-full">
      <div className="flex flex-col gap-4">
        {/* Header & Status Indicator */}
        <div className="flex items-baseline justify-between pb-2 border-b border-obsidian-border">
          <div>
            <div className="text-[12px] font-medium text-white">Clause 14.2 &amp; Policy §8.1</div>
            <div className="text-[10px] text-executive-dim font-mono">Net 30 Alignment</div>
          </div>
          <span
            className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${
              activeFlagsCount > 0
                ? "border-red-900/50 text-red-400 bg-red-950/20"
                : "border-emerald-900/50 text-emerald-400 bg-emerald-950/20"
            }`}
          >
            {activeFlagsCount > 0 ? `${activeFlagsCount} Variance` : "All Aligned"}
          </span>
        </div>

        {/* Dynamic & Static Clauses */}
        <div className="flex flex-col gap-3">
          {redlines.map((redline) => (
            <motion.div
              key={redline.id}
              layout
              className="flex flex-col gap-2 font-mono text-[11px]"
            >
              {/* Vendor clause (-) */}
              <div className="rounded border border-red-900/40 bg-obsidian-subtle p-3">
                <div className="flex items-center justify-between text-[10px] text-red-400 mb-1.5 uppercase tracking-wider">
                  <span>(-) Vendor Clause</span>
                  <span>{redline.clause_type.replace("_", " ")}</span>
                </div>
                <div className="text-executive-muted leading-relaxed font-mono">
                  {redline.original_clause}
                </div>
              </div>

              {/* NexusWork replacement (+) */}
              <div className="rounded border border-emerald-900/40 bg-obsidian-subtle p-3">
                <div className="flex items-center justify-between text-[10px] text-emerald-400 mb-1.5 uppercase tracking-wider">
                  <span>(+) NexusWork Policy Revision</span>
                  <span className="flex items-center gap-1.5">
                    {redline.applied ? (
                      <span className="text-emerald-400 text-[9px] font-bold">✓ APPLIED</span>
                    ) : (
                      <button
                        onClick={() => applyRedline(redline.id)}
                        className="text-[9px] underline text-emerald-300 hover:text-white"
                      >
                        Accept
                      </button>
                    )}
                  </span>
                </div>
                <div className="text-white leading-relaxed font-mono">
                  {redline.replacement_clause}
                </div>
                <div className="mt-1 text-[9px] text-executive-dim">
                  Policy Basis: {redline.citation}
                </div>
              </div>
            </motion.div>
          ))}

          {/* Penalty Variance Reference Box */}
          <div className="rounded border border-obsidian-border bg-obsidian-subtle p-3 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-medium text-executive-muted">Clause 18.1 Penalty Variance</span>
              <span className="text-amber-400 font-mono text-[10px]">Negotiable</span>
            </div>
            <div className="font-mono text-[11px] p-2 rounded bg-obsidian border border-obsidian-border text-executive-dim flex items-center justify-between">
              <span className="text-executive-dim line-through">1.5% monthly late compounding</span>
              <span>→</span>
              <span className="text-white font-medium">EURIBOR + 0.5% simple annual</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex flex-col gap-2 pt-3 border-t border-obsidian-border mt-auto">
        <button
          onClick={handleApplyAll}
          className="w-full py-2 px-3 rounded bg-white hover:bg-executive-primary text-obsidian text-[12px] font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer active:scale-[0.99]"
        >
          <span className="material-symbols-outlined text-[14px]">check</span>
          <span>Apply Approved Redline Draft</span>
        </button>
        <button
          onClick={handleExportDocx}
          className="w-full py-1.5 px-3 rounded border border-obsidian-border bg-transparent hover:bg-obsidian-panel text-executive-muted hover:text-white text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[13px]">
            {downloadSuccess ? "done" : "file_download"}
          </span>
          <span>{downloadSuccess ? "Exported Successfully!" : "Export Clean Version (.docx)"}</span>
        </button>
      </div>
    </div>
  );
}
