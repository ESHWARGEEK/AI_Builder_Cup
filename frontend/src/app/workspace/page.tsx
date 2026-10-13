"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  ShieldAlert,
  FileText,
  FileDiff,
  Table2,
  ChevronRight,
  Database,
  Radio,
  Send,
  Paperclip,
  Mic,
  Sparkles,
  Bot,
  User,
  ExternalLink,
  PlusCircle,
  Copy,
  CheckCheck,
  AlertTriangle,
  History,
  Layers,
  ArrowUpRight,
  Clock,
  Terminal,
} from "lucide-react";
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
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs p-8 text-center">
        <div className="space-y-2">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p>Initializing Document AI canvas & bounding boxes...</p>
        </div>
      </div>
    ),
  }
);

// ── Left Sidebar: Zone 1 ──────────────────────────────────────────────────────

function LeftSidebar() {
  const {
    proxyMode,
    setProxyMode,
    proxyEvents,
    simulateInboundEvent,
    canvasTab,
    setCanvasTab,
  } = useEKAStore();

  const isOOO = proxyMode === "OOO_INTERCEPTING";
  const queuedCount = proxyEvents.filter((e) => e.status === "QUEUED_HITL").length;
  const autoResolvedCount = proxyEvents.filter((e) => e.status === "AUTO_RESOLVED").length;

  return (
    <aside className="w-[260px] shrink-0 bg-[#0B0F19] border-r border-[#1E293B] flex flex-col h-full text-foreground select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-[#1E293B]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-400 p-0.5 shadow-md shadow-blue-500/20">
            <div className="w-full h-full bg-[#0B0F19] rounded-[6px] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
              <span>NexusWork</span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                v2.0
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium">Autonomous Enterprise Agent</div>
          </div>
        </div>
      </div>

      {/* Workspace Proxy Status Widget */}
      <div className="p-3 border-b border-[#1E293B] bg-slate-900/40">
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-xs font-semibold text-slate-200">Proxy Mode</span>
            </div>
            <button
              onClick={() =>
                setProxyMode(isOOO ? "ACTIVE_ATTENDING" : "OOO_INTERCEPTING")
              }
              className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-full transition-colors ${
                isOOO
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-slate-800 text-slate-400 border border-slate-700"
              }`}
            >
              {isOOO ? "OOO Active" : "Direct Mode"}
            </button>
          </div>

          {isOOO ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[11px] text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="font-medium">Autonomous Interceptor Active</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-center text-[10px] font-mono">
                <div className="p-1 rounded bg-slate-950/60 border border-slate-800 text-slate-300">
                  <span className="block text-emerald-400 font-bold">{autoResolvedCount}</span>
                  Auto-Resolved
                </div>
                <div className="p-1 rounded bg-slate-950/60 border border-slate-800 text-slate-300">
                  <span className="block text-amber-400 font-bold">{queuedCount}</span>
                  Queued HITL
                </div>
              </div>
              <button
                onClick={() => simulateInboundEvent()}
                className="w-full text-[10px] py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-1 transition-colors"
              >
                <PlusCircle className="w-3 h-3 text-cyan-400" />
                <span>Simulate Inbound Event</span>
              </button>
            </div>
          ) : (
            <p className="text-[11px] text-slate-400">
              Agent is awaiting direct interactive prompts. Toggle OOO to enable background triaging.
            </p>
          )}
        </div>
      </div>

      {/* Active Sessions & Audits */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        <div>
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 mb-2 flex items-center justify-between">
            <span>Active Audits (Today)</span>
            <span className="text-[9px] font-mono text-slate-500">3 active</span>
          </div>
          <div className="space-y-1">
            <button
              onClick={() => setCanvasTab("redlines")}
              className={`w-full text-left p-2 rounded-lg text-xs transition-colors flex items-start gap-2 border ${
                canvasTab === "redlines"
                  ? "bg-blue-950/40 border-blue-500/40 text-white"
                  : "bg-slate-900/40 border-transparent text-slate-300 hover:bg-slate-900"
              }`}
            >
              <FileDiff className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">Initech EMEA MSA 2026</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-mono">
                    2 Redlines
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">10:14 AM</span>
                </div>
              </div>
            </button>

            <button
              onClick={() => setCanvasTab("docai")}
              className={`w-full text-left p-2 rounded-lg text-xs transition-colors flex items-start gap-2 border ${
                canvasTab === "docai"
                  ? "bg-blue-950/40 border-blue-500/40 text-white"
                  : "bg-slate-900/40 border-transparent text-slate-300 hover:bg-slate-900"
              }`}
            >
              <FileText className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">Dell AP Inv #DELL-US-7721</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                    Awaiting HITL
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">$4,200</span>
                </div>
              </div>
            </button>

            <button
              onClick={() => setCanvasTab("artifacts")}
              className={`w-full text-left p-2 rounded-lg text-xs transition-colors flex items-start gap-2 border ${
                canvasTab === "artifacts"
                  ? "bg-blue-950/40 border-blue-500/40 text-white"
                  : "bg-slate-900/40 border-transparent text-slate-300 hover:bg-slate-900"
              }`}
            >
              <Table2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">Acme SaaS #INV-2026-091</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                    Auto-Approved
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">$450</span>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Grounded Knowledge Datastores */}
        <div>
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 mb-2 flex items-center justify-between">
            <span>Grounded Knowledge Base</span>
            <Database className="w-3 h-3 text-slate-500" />
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] space-y-1.5">
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span className="truncate">Global Travel & Expense Policy 2026</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span className="truncate">Procurement Rules & Boilerplate v4.2</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span className="truncate">EU AI Act & GDPR Chapter V</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Profile & Principal Section */}
      <div className="p-3 border-t border-[#1E293B] bg-slate-950/60 space-y-2">
        <Link
          href="/audit"
          className="w-full text-xs py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 flex items-center justify-between transition-colors"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-medium">Audit Ledger (AlloyDB)</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
        </Link>

        <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-xs font-bold text-indigo-300">
            ER
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-slate-200 truncate">Elena Rostova</div>
            <div className="text-[10px] text-slate-400 truncate">Senior AP & Compliance Lead</div>
          </div>
        </div>

        <div className="text-[9px] font-mono text-slate-500 bg-slate-900/80 p-1.5 rounded border border-slate-800/80 truncate">
          spiffe://corp.internal/agents/nexuswork
        </div>
      </div>
    </aside>
  );
}

// ── Center Stage: Zone 2 ──────────────────────────────────────────────────────

function CenterStage() {
  const {
    messages,
    addMessage,
    isStreamingChat,
    setCanvasTab,
  } = useEKAStore();

  const [promptText, setPromptText] = useState("");
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatScrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptText.trim()) return;

    const userMsg = {
      id: `usr-${Date.now()}`,
      role: "user" as const,
      content: promptText,
      timestamp: new Date(),
    };
    addMessage(userMsg);
    setPromptText("");

    // Simulate grounded agent response
    setTimeout(() => {
      const agentReply = {
        id: `asst-${Date.now()}`,
        role: "assistant" as const,
        content: `**NexusWork Policy Engine Evaluation:**  
Pursuant to **Global Procurement Guidelines §8.1**, all vendor engagements in EMEA exceeding $1,000 must specify Net 30 payment terms and contain capped liability language.

I have evaluated the agreement against our datastores:
* **Payment Terms Check:** Flagged Net 15 requirement as non-standard.
* **Liability Check:** Flagged uncapped clause as **CRITICAL**.
* **Remediation Draft:** Staged in the **Compliance Redline Diff** canvas tab for your immediate review.`,
        timestamp: new Date(),
        citations: [
          { claim_text: "Procurement Guidelines §8.1: Mandatory Net 30 terms", confidence_score: 0.97 },
          { claim_text: "Enterprise Legal Risk Charter §14.2: Maximum 2x fee cap", confidence_score: 0.99 },
        ],
      };
      addMessage(agentReply);
    }, 600);
  };

  return (
    <main className="flex-1 flex flex-col h-full bg-[#0F172A] text-foreground overflow-hidden">
      {/* Top Bar */}
      <div className="h-14 px-5 border-b border-[#1E293B] flex items-center justify-between shrink-0 bg-[#0F172A]/90 backdrop-blur">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Link href="/" className="hover:text-slate-200">
              NexusWork
            </Link>
            <ChevronRight className="w-3 h-3 text-slate-600" />
            <span className="text-slate-300 font-medium">EMEA Master Agreements & AP</span>
          </div>
          <h2 className="text-sm font-semibold text-slate-100 mt-0.5">
            Audit & Extract: Initech Vendor Contract #INV-2026-88
          </h2>
        </div>

        {/* Latency & Governance Telemetry Pill + Stitch Prototype Link */}
        <div className="flex items-center gap-2">
          <a
            href="/stitch.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-indigo-950/60 border border-indigo-500/40 text-indigo-300 hover:text-white flex items-center gap-1.5 transition-colors shadow-sm"
            title="View pixel-perfect Google Stitch generated prototype"
          >
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>Google Stitch Prototype</span>
            <ArrowUpRight className="w-3 h-3 text-indigo-400" />
          </a>
          <div className="text-[10px] font-mono px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-2 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>RAG: 1.2s</span>
            <span className="text-slate-600">|</span>
            <span>DocAI: 4.8s</span>
            <span className="text-slate-600">|</span>
            <span className="text-amber-400 font-medium">AAL 3 "Eyes On" Active</span>
          </div>
        </div>
      </div>

      {/* Chat Stream Viewport */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Pre-seeded Welcome Context Message */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-3 max-w-3xl"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0 text-blue-400">
            <Bot className="w-4 h-4" />
          </div>
          <div className="flex-1 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 text-xs text-slate-200 space-y-2.5 shadow-sm leading-relaxed">
            <div className="font-semibold text-slate-100 flex items-center gap-2">
              <span>NexusWork Autonomous Copilot</span>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
                Grounded Mode
              </span>
            </div>
            <p>
              I have loaded <strong>Initech_EMEA_MSA_2026.pdf</strong> and synchronized invoice line items. Pre-execution compliance scan identified <strong>2 policy violations</strong>. The AAL 3 deterministic gatekeeper has paused execution for high-value items pending human sign-off.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => setCanvasTab("redlines")}
                className="text-[11px] px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 flex items-center gap-1 font-medium transition-colors"
              >
                <FileDiff className="w-3.5 h-3.5" />
                <span>View Redline Clause Diff</span>
              </button>
              <button
                onClick={() => setCanvasTab("artifacts")}
                className="text-[11px] px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-medium transition-colors"
              >
                <Table2 className="w-3.5 h-3.5" />
                <span>View Sheets AP Ledger</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* User Document Upload Thumbnail Message */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-end gap-3 max-w-3xl ml-auto"
        >
          <div className="bg-blue-600/15 border border-blue-500/30 rounded-2xl p-3 text-xs text-slate-200 max-w-md shadow-sm space-y-1.5">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" />
              <span className="font-medium text-white">Invoice_Dell_PowerEdge_R750.pdf</span>
              <span className="text-[10px] text-slate-400 font-mono">(2.4 MB)</span>
            </div>
            <p className="text-[11px] text-slate-300">
              Audit this invoice against corporate AP policy and check EMEA vendor terms.
            </p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center shrink-0 text-indigo-300 font-bold text-xs">
            ER
          </div>
        </motion.div>

        {/* Interactive AAL 3 HITL Action Gatekeeper Card */}
        <HITLActionCard />

        {/* Dynamic User Messages */}
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 max-w-3xl ${
              msg.role === "user" ? "ml-auto justify-end" : ""
            }`}
          >
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0 text-blue-400">
                <Bot className="w-4 h-4" />
              </div>
            )}
            <div
              className={`rounded-2xl p-4 text-xs leading-relaxed space-y-2 shadow-sm ${
                msg.role === "user"
                  ? "bg-blue-600/15 border border-blue-500/30 text-white max-w-md"
                  : "bg-slate-900/90 border border-slate-800 text-slate-200 flex-1"
              }`}
            >
              <div className="whitespace-pre-line">{msg.content}</div>

              {msg.citations && msg.citations.length > 0 && (
                <div className="pt-2 border-t border-slate-800/80 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    <span>Grounded Citations</span>
                  </div>
                  {msg.citations.map((c, i) => (
                    <div
                      key={i}
                      className="text-[10px] font-mono text-cyan-300 bg-cyan-950/30 border border-cyan-800/40 p-1.5 rounded flex items-center justify-between"
                    >
                      <span>{c.claim_text}</span>
                      <span className="text-slate-400">{(c.confidence_score * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {msg.role === "user" && (
              <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center shrink-0 text-indigo-300 font-bold text-xs">
                ER
              </div>
            )}
          </motion.div>
        ))}

        <div ref={chatScrollRef} />
      </div>

      {/* Bottom Multi-Modal Input Bar */}
      <div className="p-4 border-t border-[#1E293B] bg-[#0F172A]/90 shrink-0">
        <form
          onSubmit={handleSendPrompt}
          className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800 focus-within:border-blue-500/60 shadow-lg"
        >
          <button
            type="button"
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            title="Upload invoice or contract document"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <input
            type="text"
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder="Ask policy questions, audit contracts, or instruct proxy..."
            className="flex-1 bg-transparent border-none text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />
          <button
            type="button"
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            title="Voice input"
          >
            <Mic className="w-4 h-4" />
          </button>
          <button
            type="submit"
            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm shadow-blue-600/40"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </main>
  );
}

// ── Right Dynamic Canvas: Zone 3 ──────────────────────────────────────────────

function RightCanvas() {
  const { canvasTab, setCanvasTab, redlines, ledgerRows } = useEKAStore();

  const activeFlagsCount = redlines.filter((r) => !r.applied).length;

  return (
    <aside className="w-[540px] shrink-0 bg-[#0B0F19] border-l border-[#1E293B] flex flex-col h-full overflow-hidden select-none">
      {/* Tab Navigation Header */}
      <div className="h-14 px-4 border-b border-[#1E293B] flex items-center justify-between shrink-0 bg-[#0B0F19]">
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
          {/* Tab 1: Document AI Preview */}
          <button
            onClick={() => setCanvasTab("docai")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              canvasTab === "docai"
                ? "bg-slate-800 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span>Document AI</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300">
              95% Conf
            </span>
          </button>

          {/* Tab 2: Compliance Redline Diff */}
          <button
            onClick={() => setCanvasTab("redlines")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              canvasTab === "redlines"
                ? "bg-rose-950/60 border border-rose-500/40 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileDiff className="w-3.5 h-3.5 text-rose-400" />
            <span>Redline Diff</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                activeFlagsCount > 0
                  ? "bg-rose-500/20 text-rose-300 font-bold"
                  : "bg-emerald-500/20 text-emerald-300"
              }`}
            >
              {activeFlagsCount} Flags
            </span>
          </button>

          {/* Tab 3: Live Workspace Artifacts */}
          <button
            onClick={() => setCanvasTab("artifacts")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              canvasTab === "artifacts"
                ? "bg-emerald-950/60 border border-emerald-500/40 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Table2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Live Artifacts</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
              Sheets Live
            </span>
          </button>
        </div>
      </div>

      {/* Tab Content Canvas Body */}
      <div className="flex-1 overflow-hidden">
        {canvasTab === "docai" && (
          <div className="h-full flex flex-col">
            <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between text-xs text-slate-300">
              <span className="font-mono text-[11px] text-slate-400">
                Parsed: <strong className="text-white">Dell_PowerEdge_R750_INV.pdf</strong>
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">
                ✓ 2D Bounding-Box Polygons Synced
              </span>
            </div>
            <div className="flex-1 overflow-hidden">
              <PDFViewer />
            </div>
          </div>
        )}

        {canvasTab === "redlines" && <RedlineDiffViewer />}

        {canvasTab === "artifacts" && <LiveArtifactCanvas />}
      </div>
    </aside>
  );
}

// ── Main Tri-Pane Page Assembly ───────────────────────────────────────────────

export default function WorkspaceCockpitPage() {
  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#090D16]">
      {/* Zone 1: Left Navigation (260px) */}
      <LeftSidebar />

      {/* Zone 2: Center Stage (Flex-1) */}
      <CenterStage />

      {/* Zone 3: Right Dynamic Canvas (540px) */}
      <RightCanvas />
    </div>
  );
}
