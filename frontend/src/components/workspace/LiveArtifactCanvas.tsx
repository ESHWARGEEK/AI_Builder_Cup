"use client";

import { useState } from "react";
import { useEKAStore } from "@/store/eka-store";

export function LiveArtifactCanvas() {
  const {
    ledgerRows,
    briefDoc,
    artifactSubTab,
    setArtifactSubTab,
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
    <div className="flex-1 p-5 flex flex-col justify-between overflow-y-auto gap-4 bg-obsidian text-executive-primary h-full">
      <div className="flex flex-col gap-3">
        {/* Header & Block ID */}
        <div className="flex items-center justify-between pb-2 border-b border-obsidian-border">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium text-white">AlloyDB Multi-Region Ledger</span>
            <div className="flex items-center gap-1 bg-obsidian-subtle border border-obsidian-border rounded p-0.5 text-[10px] font-mono">
              <button
                onClick={() => setArtifactSubTab("sheets")}
                className={`px-2 py-0.5 rounded transition-colors ${
                  artifactSubTab === "sheets"
                    ? "bg-white text-obsidian font-semibold"
                    : "text-executive-muted hover:text-white"
                }`}
              >
                Ledger
              </button>
              <button
                onClick={() => setArtifactSubTab("docs")}
                className={`px-2 py-0.5 rounded transition-colors ${
                  artifactSubTab === "docs"
                    ? "bg-white text-obsidian font-semibold"
                    : "text-executive-muted hover:text-white"
                }`}
              >
                Exec Brief
              </button>
            </div>
          </div>
          <span className="font-mono text-[10px] text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            BLOCK 0x89E
          </span>
        </div>

        {artifactSubTab === "sheets" ? (
          <div className="space-y-3">
            {/* Table */}
            <div className="border border-obsidian-border rounded overflow-hidden">
              <table className="w-full text-left font-mono text-[11px]">
                <thead className="bg-obsidian-panel text-executive-dim border-b border-obsidian-border text-[10px]">
                  <tr>
                    <th className="p-2">Time</th>
                    <th className="p-2">Entity</th>
                    <th className="p-2 text-right">Sum</th>
                    <th className="p-2 text-right">State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-obsidian-border bg-obsidian font-variant-numeric">
                  {ledgerRows.map((row) => (
                    <tr key={row.id} className="hover:bg-obsidian-subtle transition-colors">
                      <td className="p-2 text-executive-dim">
                        {row.timestamp ? row.timestamp.substring(11, 16) : "10:41"}
                      </td>
                      <td className="p-2 text-white font-medium truncate max-w-[140px]">
                        {row.vendor_name}
                      </td>
                      <td className="p-2 text-right text-white font-mono">
                        ${row.total_amount_usd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2 text-right">
                        <span
                          className={`text-[10px] ${
                            row.compliance_status === "AUTO_APPROVED" || row.compliance_status === "CLEARED"
                              ? "text-emerald-400"
                              : row.compliance_status === "PENDING_APPROVAL" || row.compliance_status === "HITL_HOLD"
                              ? "text-amber-400"
                              : "text-executive-dim"
                          }`}
                        >
                          {row.compliance_status === "AUTO_APPROVED" || row.compliance_status === "CLEARED"
                            ? "Committed"
                            : row.compliance_status === "PENDING_APPROVAL" || row.compliance_status === "HITL_HOLD"
                            ? "HITL Hold"
                            : "Redline"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {/* Additional reference rows matching Stitch mockup */}
                  {ledgerRows.length <= 1 && (
                    <>
                      <tr className="hover:bg-obsidian-subtle">
                        <td className="p-2 text-executive-dim">09:12</td>
                        <td className="p-2 text-white">Acme SaaS</td>
                        <td className="p-2 text-right text-white font-mono">$780.00</td>
                        <td className="p-2 text-right text-emerald-400">Committed</td>
                      </tr>
                      <tr className="hover:bg-obsidian-subtle">
                        <td className="p-2 text-executive-dim">08:30</td>
                        <td className="p-2 text-white">Initech Corp</td>
                        <td className="p-2 text-right text-white font-mono">$12,450.00</td>
                        <td className="p-2 text-right text-executive-dim">Redline</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-2.5 rounded bg-obsidian-subtle border border-obsidian-border text-[10px] text-executive-dim flex justify-between font-mono">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                SAP S/4HANA connector active
              </span>
              <span>SHA-256 Ledger Consensus OK</span>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded border border-obsidian-border bg-obsidian-subtle p-3.5 font-mono text-[11px] space-y-2">
              <div className="text-[12px] font-semibold text-white">
                {briefDoc.title || "Executive Brief: Dell Enterprise AP Ingest"}
              </div>
              <div className="text-[10px] text-executive-dim">
                Generated: {new Date(briefDoc.created_at).toLocaleString()}
              </div>
              <div className="text-executive-muted whitespace-pre-wrap leading-relaxed text-[11px] pt-2 border-t border-obsidian-border font-mono">
                {briefDoc.markdown_content}
              </div>
            </div>

            <button
              onClick={handleExportBrief}
              className="w-full py-1.5 px-3 rounded border border-obsidian-border bg-obsidian-subtle hover:bg-obsidian-panel text-executive-muted hover:text-white text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[13px]">
                {downloadSuccess ? "check" : "download"}
              </span>
              <span>{downloadSuccess ? "Saved to Downloads" : "Export Executive Brief (.md)"}</span>
            </button>
          </div>
        )}
      </div>

      <div className="p-2 rounded bg-obsidian border border-obsidian-border text-[10px] text-executive-dim font-mono flex items-center justify-between">
        <span>spiffe://corp/agent-core/alloydb</span>
        <span className="text-emerald-400">Sync: 18ms</span>
      </div>
    </div>
  );
}
