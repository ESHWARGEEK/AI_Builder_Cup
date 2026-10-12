"use client";

/**
 * Main workspace page — dual-pane layout:
 *   Left sidebar: Navigation + SSE status indicator
 *   Center pane:  Chat (policy) OR Invoice processor (tabbed)
 *   Right pane:   PDF viewer with bounding-box overlays
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  FileText,
  ShieldCheck,
  ChevronRight,
  Home,
  Wifi,
  WifiOff,
  Activity,
  Settings,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useEKAStore } from "@/store/eka-store";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { InvoicePanel } from "@/components/invoice/InvoicePanel";

const PDFViewer = dynamic(
  () => import("@/components/pdf/PDFViewer").then((mod) => mod.PDFViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">
        Initializing PDF canvas...
      </div>
    ),
  }
);
import type { WorkspaceTab } from "@/store/eka-store";

const NAV_ITEMS: { id: WorkspaceTab; label: string; icon: React.ElementType; badge?: string }[] = [
  { id: "chat", label: "Policy Assistant", icon: MessageSquare },
  { id: "invoice", label: "Invoice Processor", icon: FileText },
];

function Sidebar({
  activeTab,
  setActiveTab,
}: {
  activeTab: WorkspaceTab;
  setActiveTab: (tab: WorkspaceTab) => void;
}) {
  const { messages, currentInvoiceResult } = useEKAStore();

  return (
    <aside className="w-56 shrink-0 glass-strong border-r border-border/50 flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="text-sm font-bold gradient-text">EKA</div>
            <div className="text-[10px] text-muted-foreground">Knowledge Assistant</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-2 mb-2">
          Workspace
        </div>

        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`nav-item w-full ${activeTab === item.id ? "active" : ""}`}
          >
            <item.icon className="w-4 h-4" />
            <span className="flex-1">{item.label}</span>
            {item.id === "chat" && messages.length > 0 && (
              <span className="text-[10px] bg-primary/20 text-primary rounded-full px-1.5 py-0.5">
                {messages.length}
              </span>
            )}
            {item.id === "invoice" && currentInvoiceResult && (
              <span
                className={`w-2 h-2 rounded-full ${
                  currentInvoiceResult.governance_decision === "AUTO_PROCESS"
                    ? "bg-emerald-400"
                    : "bg-red-400"
                }`}
              />
            )}
          </button>
        ))}

        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-2 mt-4 mb-2">
          Governance
        </div>

        <Link href="/audit" className="nav-item">
          <ShieldCheck className="w-4 h-4" />
          <span className="flex-1">Audit Trail</span>
          <ChevronRight className="w-3 h-3 text-muted-foreground" />
        </Link>
      </nav>

      {/* Connection status */}
      <div className="px-4 py-3 border-t border-border/50">
        <div className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-muted-foreground">Backend Connected</span>
        </div>
        <div className="text-[10px] text-muted-foreground mt-1">
          Vertex AI · Document AI · Firestore
        </div>
      </div>

      {/* Bottom actions */}
      <div className="px-3 py-3 border-t border-border/50 space-y-1">
        <Link href="/" className="nav-item">
          <Home className="w-4 h-4" />
          Home
        </Link>
      </div>
    </aside>
  );
}

function TabHeader({
  activeTab,
  setActiveTab,
}: {
  activeTab: WorkspaceTab;
  setActiveTab: (tab: WorkspaceTab) => void;
}) {
  return (
    <div className="flex items-center gap-1 px-4 py-2 border-b border-border/50 shrink-0">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          onClick={() => setActiveTab(item.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
            activeTab === item.id
              ? "bg-primary/15 text-primary border border-primary/20"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          <item.icon className="w-3.5 h-3.5" />
          {item.label}
        </button>
      ))}
    </div>
  );
}

export default function WorkspacePage() {
  const { activeTab, setActiveTab } = useEKAStore();

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Left sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Center pane — Chat/Invoice */}
      <div className="flex flex-col w-[420px] shrink-0 border-r border-border/50">
        <TabHeader activeTab={activeTab} setActiveTab={setActiveTab} />

        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {activeTab === "chat" ? (
              <motion.div
                key="chat"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                <ChatPanel />
              </motion.div>
            ) : (
              <motion.div
                key="invoice"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="h-full overflow-y-auto"
              >
                <InvoicePanel />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Right pane — PDF viewer */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 shrink-0">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Document Viewer</h2>
          <span className="text-xs text-muted-foreground">with entity overlays</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <PDFViewer />
        </div>
      </div>
    </div>
  );
}
