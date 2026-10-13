"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useEKAStore } from "@/store/eka-store";
import { RedlineDiffViewer } from "@/components/compliance/RedlineDiffViewer";
import { LiveArtifactCanvas } from "@/components/workspace/LiveArtifactCanvas";
import { HITLActionCard } from "@/components/chat/HITLActionCard";
import type { CanvasTab } from "@/store/eka-store";

const PDFViewer = dynamic(
  () => import("@/components/pdf/PDFViewer").then((mod) => mod.PDFViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center text-executive-dim text-xs p-8 text-center font-mono">
        <div className="space-y-2">
          <div className="w-5 h-5 border-2 border-executive-blue border-t-transparent rounded-full animate-spin mx-auto" />
          <p>Initializing Document AI canvas &amp; OCR boundaries...</p>
        </div>
      </div>
    ),
  }
);

export default function WorkspacePage() {
  const {
    proxyMode,
    setProxyMode,
    canvasTab,
    setCanvasTab,
    messages,
    addMessage,
    isStreamingChat,
  } = useEKAStore();

  const isOOO = proxyMode === "OOO_INTERCEPTING";
  const toggleProxy = () => {
    setProxyMode(isOOO ? "ACTIVE_ATTENDING" : "OOO_INTERCEPTING");
  };

  const [inputVal, setInputVal] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isStreaming = isStreamingChat;

  const sendMessage = (content: string) => {
    addMessage({
      id: `msg-${Date.now().toString(36)}`,
      role: "user",
      content,
      timestamp: new Date(),
    });
    // Simulate an agent response after a short delay
    setTimeout(() => {
      addMessage({
        id: `msg-${Date.now().toString(36)}-resp`,
        role: "assistant",
        content: `Processing directive: "${content}". NexusWork agent is analyzing against enterprise policy corpus…`,
        timestamp: new Date(),
      });
    }, 800);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || isStreaming) return;
    sendMessage(inputVal.trim());
    setInputVal("");
  };

  return (
    <div className="bg-obsidian font-sans text-executive-primary min-h-screen antialiased flex flex-col selection:bg-executive-blue/20 selection:text-white">
      {/* ========================================================================= */}
      {/* 1. EXECUTIVE MINIMAL HEADER (52px)                                        */}
      {/* ========================================================================= */}
      <header className="h-[52px] bg-obsidian border-b border-obsidian-border flex items-center justify-between px-5 fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-5 h-5 rounded bg-white text-obsidian flex items-center justify-center font-mono text-[11px] font-bold tracking-tighter group-hover:bg-executive-primary transition-colors">
              N
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-medium text-[13px] tracking-tight text-white">NexusWork</span>
              <span className="text-[10px] font-mono tracking-widest uppercase text-executive-dim">
                AP Core
              </span>
            </div>
          </Link>
          <div className="h-3 w-px bg-obsidian-border" />
          <div className="flex items-center gap-2 text-[12px] text-executive-muted font-normal">
            <span>Cockpit</span>
            <span className="text-[10px] text-executive-dim">/</span>
            <span className="text-white font-medium">Autonomous AP Orchestration</span>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <Link
            href="/stitch.html"
            target="_blank"
            className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded border border-obsidian-border text-[10px] font-mono text-executive-dim hover:text-white transition-colors"
          >
            <span>Stitch Preview</span>
            <span className="material-symbols-outlined text-[11px]">open_in_new</span>
          </Link>
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-executive-dim">LEDGER:</span>
            <span className="text-white font-medium tracking-tight">SYNCED #9421-B</span>
          </div>
          <div className="h-3 w-px bg-obsidian-border" />
          <div className="flex items-center gap-2.5">
            <div className="text-right">
              <div className="text-[12px] font-medium text-white leading-tight">Elena Rostova</div>
              <div className="text-[10px] text-executive-dim font-mono leading-tight">
                Senior AP Lead
              </div>
            </div>
            <div className="w-6 h-6 rounded-full bg-obsidian-panel border border-obsidian-border flex items-center justify-center font-mono text-[10px] text-white">
              ER
            </div>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. WORKBENCH CONTAINER                                                    */}
      {/* ========================================================================= */}
      <div className="pt-[52px] flex-1 flex flex-col h-screen">
        {/* Precision Sub-Header Horizon Telemetry Bar (38px) */}
        <div className="h-[38px] px-5 bg-obsidian-subtle border-b border-obsidian-border flex items-center justify-between text-[11px] text-executive-muted shrink-0">
          <div className="flex items-center gap-3 font-mono">
            <span className="text-executive-dim uppercase tracking-wider text-[10px]">Workstream</span>
            <span className="text-white font-medium">#REQ-2026-EMEA-09</span>
            <span className="text-obsidian-divider">—</span>
            <span className="text-executive-dim">Counterparty</span>
            <span className="text-white font-medium">Dell EMEA S.A.</span>
          </div>
          <div className="flex items-center gap-4 font-mono text-[11px]">
            <div className="flex items-center gap-1.5 text-executive-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="text-executive-primary">AAL-3 REQUIREMENT</span>
            </div>
            <div className="text-obsidian-divider">/</div>
            <div className="flex items-center gap-1 text-executive-dim">
              <span className="material-symbols-outlined text-[13px] text-executive-dim">
                verified
              </span>
              <span>ALLOYDB SECURED</span>
            </div>
          </div>
        </div>

        {/* Dynamic 3-Column Swiss Grid Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* ======================================================================= */}
          {/* PANE 1: LEFT NAVIGATION & CONTEXT (240px Fixed)                         */}
          {/* ======================================================================= */}
          <aside className="w-[240px] shrink-0 bg-obsidian border-r border-obsidian-border flex flex-col justify-between overflow-y-auto p-4 gap-5">
            <div className="flex flex-col gap-6">
              {/* OOO Proxy Toggle */}
              <div className="pb-4 border-b border-obsidian-border flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium tracking-tight text-white flex items-center gap-1.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isOOO ? "bg-emerald-400" : "bg-executive-dim"
                      }`}
                    />
                    OOO Proxy
                  </span>
                  <button
                    onClick={toggleProxy}
                    aria-label="Toggle Autonomous Delegation"
                    className={`w-7 h-4 rounded-full relative p-0.5 transition-colors focus:outline-none cursor-pointer ${
                      isOOO ? "bg-emerald-500" : "bg-obsidian-border"
                    }`}
                  >
                    <div
                      className={`w-3 h-3 rounded-full bg-white transition-transform ${
                        isOOO ? "translate-x-3" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
                <p className="text-[10px] text-executive-dim leading-relaxed font-mono">
                  {isOOO ? "Net 30 auto-negotiation active" : "Interactive monitoring mode"}
                </p>
              </div>

              {/* Verification Queue */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between px-0.5 mb-1">
                  <span className="text-[10px] font-mono tracking-wider uppercase text-executive-dim">
                    Verification Queue
                  </span>
                  <span className="text-[10px] font-mono text-executive-dim">3</span>
                </div>

                {/* Queue Item 1 (Selected) */}
                <div className="p-2.5 rounded border border-obsidian-border bg-obsidian-panel relative cursor-pointer">
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-[12px] font-medium text-white truncate">
                      Dell EMEA #7721
                    </span>
                    <span className="text-[9px] font-mono text-amber-400">AAL 3</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-executive-dim font-variant-numeric">
                    <span>$4,200.00</span>
                    <span className="text-amber-400 text-[10px]">Pending HITL</span>
                  </div>
                </div>

                {/* Queue Item 2 */}
                <div
                  onClick={() => setCanvasTab("redlines")}
                  className="p-2.5 rounded hover:bg-obsidian-subtle border border-transparent cursor-pointer transition-all"
                >
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-[12px] font-normal text-executive-muted truncate">
                      Initech MSA 2026
                    </span>
                    <span className="text-[9px] font-mono text-executive-dim">2 Diff</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-executive-dim">
                    <span>Clause 14.2</span>
                    <span className="text-[10px]">Redline</span>
                  </div>
                </div>

                {/* Queue Item 3 */}
                <div
                  onClick={() => setCanvasTab("artifacts")}
                  className="p-2.5 rounded hover:bg-obsidian-subtle border border-transparent cursor-pointer transition-all"
                >
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-[12px] font-normal text-executive-muted truncate">
                      Acme SaaS INV-091
                    </span>
                    <span className="text-[9px] font-mono text-emerald-400">Cleared</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-executive-dim font-variant-numeric">
                    <span>$780.00</span>
                    <span className="text-emerald-400/80 text-[10px]">Auto-settled</span>
                  </div>
                </div>
              </div>

              {/* Grounding Reference */}
              <div className="flex flex-col gap-1.5 pt-4 border-t border-obsidian-border">
                <div className="text-[10px] font-mono uppercase tracking-wider text-executive-dim px-0.5 mb-1">
                  Grounding Reference
                </div>
                <div className="flex items-center justify-between py-1 px-1 text-[11px] text-executive-muted">
                  <span className="truncate">Procurement Policy</span>
                  <span className="text-executive-dim font-mono text-[10px]">§8.1</span>
                </div>
                <div className="flex items-center justify-between py-1 px-1 text-[11px] text-executive-muted">
                  <span className="truncate">Hardware Thresholds</span>
                  <span className="text-executive-dim font-mono text-[10px]">§4.2</span>
                </div>
                <div className="flex items-center justify-between py-1 px-1 text-[11px] text-executive-muted">
                  <span className="truncate">Master Service Terms</span>
                  <span className="text-executive-dim font-mono text-[10px]">v4.2</span>
                </div>
              </div>
            </div>

            {/* Bottom System Identity & Audit Link */}
            <div className="pt-4 border-t border-obsidian-border flex flex-col gap-2 font-mono text-[10px]">
              <div className="px-2 py-1 rounded bg-obsidian border border-obsidian-border text-executive-dim flex items-center justify-between">
                <span className="truncate">spiffe://corp/agent-core</span>
                <span className="text-emerald-400 ml-1">mTLS</span>
              </div>
              <Link
                href="/audit"
                className="w-full flex items-center justify-center gap-1.5 py-1 px-2 rounded border border-obsidian-border text-executive-muted hover:text-white text-[10px] font-sans transition-all"
              >
                <span className="material-symbols-outlined text-[13px] text-executive-dim">
                  history
                </span>
                <span>AlloyDB Audit Trail</span>
              </Link>
            </div>
          </aside>

          {/* ======================================================================= */}
          {/* PANE 2: CENTER STAGE - EXECUTIVE AUDIT WORKSPACE (Flex-1)               */}
          {/* ======================================================================= */}
          <section className="flex-1 bg-obsidian-subtle flex flex-col justify-between overflow-hidden relative">
            {/* Center Stage Header */}
            <div className="px-6 py-3 border-b border-obsidian-border flex items-center justify-between bg-obsidian shrink-0">
              <div className="flex flex-col gap-0.5">
                <div className="text-[13px] font-medium text-white flex items-center gap-2">
                  <span>Dell Enterprise AP Ingest</span>
                  <span className="font-mono text-xs text-executive-dim font-normal">
                    #DELL-US-7721
                  </span>
                </div>
                <div className="text-[11px] text-executive-dim font-mono">
                  Autonomous Proxy • DocAI Confidence 91.2%
                </div>
              </div>
              <div className="font-mono text-[10px] text-executive-dim flex items-center gap-3">
                <span>RAG 1.2s</span>
                <span>•</span>
                <span>Inference 4.8s</span>
              </div>
            </div>

            {/* Scrollable Center Content */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 max-w-4xl mx-auto w-full">
              {/* Attached Document File Chip */}
              <div className="flex justify-end">
                <div
                  onClick={() => setCanvasTab("docai")}
                  className="px-2.5 py-1 rounded border border-obsidian-border bg-obsidian flex items-center gap-2 text-executive-muted cursor-pointer hover:border-executive-dim transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px] text-executive-dim">
                    description
                  </span>
                  <span className="text-[11px] text-white font-mono font-medium">
                    Invoice_Dell_PowerEdge_R750.pdf
                  </span>
                  <span className="text-[10px] text-executive-dim font-mono">2.4 MB</span>
                </div>
              </div>

              {/* Autonomous AP Analysis Box */}
              <div className="rounded border border-obsidian-border bg-obsidian p-4 flex flex-col gap-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-obsidian-border">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px] text-executive-dim">
                      account_tree
                    </span>
                    <span className="text-[12px] font-medium text-white">
                      Autonomous AP Analysis
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-executive-dim">
                    Rule Match: 14 Tokens
                  </span>
                </div>
                <p className="text-[12px] leading-relaxed text-executive-muted">
                  Line items match purchase requisition{" "}
                  <span className="font-mono text-white font-medium">#PR-8812</span>. Line total and
                  calculated VAT are deterministically verified. Identified conflict: Vendor PDF
                  requests <span className="text-white font-medium">Net 15</span>, conflicting with
                  Global Procurement Policy requiring{" "}
                  <span className="text-white font-medium">Net 30</span>.
                </p>
                <div className="flex items-center gap-2 font-mono text-[10px]">
                  <span className="px-1.5 py-0.5 rounded border border-obsidian-border text-executive-dim">
                    §4.2 Hardware Valid
                  </span>
                  <span className="px-1.5 py-0.5 rounded border border-amber-800/40 text-amber-300">
                    §8.1 Payment Terms Conflict
                  </span>
                </div>
              </div>

              {/* AAL 3 Consequential Action Gatekeeper Card */}
              <HITLActionCard />

              {/* Extra Dynamic Chat Messages (if any) */}
              {messages.length > 0 && (
                <div className="space-y-3 pt-2">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`p-3.5 rounded border text-[12px] leading-relaxed ${
                        m.role === "user"
                          ? "bg-obsidian border-obsidian-border text-white ml-8"
                          : "bg-obsidian-panel border-obsidian-border text-executive-primary mr-8"
                      }`}
                    >
                      <div className="text-[10px] font-mono text-executive-dim mb-1 uppercase tracking-wider">
                        {m.role === "user" ? "Directive" : "Agent Response"}
                      </div>
                      <div className="whitespace-pre-wrap">{m.content}</div>
                    </div>
                  ))}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Directive Prompt Bar */}
            <div className="p-4 bg-obsidian border-t border-obsidian-border shrink-0">
              <form
                onSubmit={handleSubmit}
                className="max-w-4xl mx-auto flex items-center gap-2 bg-obsidian-subtle border border-obsidian-border rounded px-3 py-1.5 focus-within:border-white transition-colors"
              >
                <span className="material-symbols-outlined text-[14px] text-executive-dim">
                  terminal
                </span>
                <input
                  type="text"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder="Directive or query for AP agent..."
                  className="flex-1 bg-transparent text-[12px] text-white placeholder:text-executive-dim focus:outline-none font-mono"
                />
                <button
                  type="submit"
                  disabled={!inputVal.trim() || isStreaming}
                  className="px-2 py-0.5 rounded border border-obsidian-border text-executive-muted hover:text-white text-[10px] font-mono uppercase tracking-wider transition-colors disabled:opacity-40"
                >
                  Exec
                </button>
              </form>
            </div>
          </section>

          {/* ======================================================================= */}
          {/* PANE 3: RIGHT DYNAMIC CANVAS (500px Fixed)                              */}
          {/* ======================================================================= */}
          <aside className="w-[500px] shrink-0 bg-obsidian border-l border-obsidian-border flex flex-col justify-between overflow-hidden">
            {/* Top Canvas Tabs */}
            <div className="flex items-center bg-obsidian border-b border-obsidian-border px-4 pt-2 gap-5 shrink-0">
              <button
                onClick={() => setCanvasTab("redlines")}
                className={`pb-2.5 text-[12px] flex items-center gap-1.5 transition-all ${
                  canvasTab === "redlines"
                    ? "font-semibold text-white border-b-2 border-executive-blue"
                    : "font-medium text-executive-dim hover:text-white border-b-2 border-transparent"
                }`}
              >
                <span>Clause Redline</span>
                <span className="px-1.5 py-0.2 rounded border border-amber-800/50 text-amber-300 font-mono text-[9px]">
                  2 VARIANCE
                </span>
              </button>

              <button
                onClick={() => setCanvasTab("docai")}
                className={`pb-2.5 text-[12px] flex items-center gap-1.5 transition-all ${
                  canvasTab === "docai"
                    ? "font-semibold text-white border-b-2 border-executive-blue"
                    : "font-medium text-executive-dim hover:text-white border-b-2 border-transparent"
                }`}
              >
                <span>Document AI</span>
                <span className="text-executive-dim font-mono text-[10px]">91.2%</span>
              </button>

              <button
                onClick={() => setCanvasTab("artifacts")}
                className={`pb-2.5 text-[12px] flex items-center gap-1.5 transition-all ${
                  canvasTab === "artifacts"
                    ? "font-semibold text-white border-b-2 border-executive-blue"
                    : "font-medium text-executive-dim hover:text-white border-b-2 border-transparent"
                }`}
              >
                <span>Live Ledger</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </button>
            </div>

            {/* Dynamic Canvas View Body */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {canvasTab === "redlines" && <RedlineDiffViewer />}

              {canvasTab === "docai" && (
                <div className="flex-1 p-5 flex flex-col justify-between overflow-y-auto gap-4 bg-obsidian text-executive-primary">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between pb-2 border-b border-obsidian-border">
                      <div className="text-[12px] font-medium text-white">Document AI Parsing</div>
                      <span className="font-mono text-[10px] text-executive-dim">
                        Dell_Invoice.pdf
                      </span>
                    </div>

                    <div className="rounded border border-obsidian-border bg-obsidian-subtle p-4 flex flex-col gap-2.5 font-mono text-[11px]">
                      <div className="flex justify-between items-center pb-2 border-b border-obsidian-border">
                        <span className="text-executive-dim">Vendor</span>
                        <span className="text-white font-sans">DELL ENTERPRISE EMEA S.A.</span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b border-obsidian-border">
                        <span className="text-executive-dim">Invoice No.</span>
                        <span className="text-white font-medium">#DELL-US-7721</span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b border-obsidian-border">
                        <span className="text-executive-dim">Line 1: Server Unit</span>
                        <span className="text-white font-mono">$3,400.00</span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b border-obsidian-border">
                        <span className="text-executive-dim">Line 2: ReadyRails II</span>
                        <span className="text-white font-mono">$500.00</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-executive-dim">Terms</span>
                        <span className="text-amber-400">Net 15 Days</span>
                      </div>
                    </div>

                    <div className="h-64 border border-obsidian-border rounded overflow-hidden">
                      <PDFViewer />
                    </div>
                  </div>

                  <div className="p-2 rounded bg-obsidian border border-obsidian-border text-[10px] text-executive-dim flex justify-between font-mono">
                    <span>Schema: AP_ENTERPRISE_V2</span>
                    <span>Tokens: 48</span>
                  </div>
                </div>
              )}

              {canvasTab === "artifacts" && <LiveArtifactCanvas />}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
