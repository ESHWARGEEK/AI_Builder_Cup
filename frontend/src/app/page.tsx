"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  FileText,
  MessageSquare,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Document AI & AP Extraction",
    description:
      "Document AI specialized invoice & contract parser extracts key-value entities with 2D bounding boxes in ≤15s.",
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
    delay: 0.1,
  },
  {
    icon: ShieldCheck,
    title: "Active Compliance & Redlines",
    description:
      "Scans agreements against corporate procurement & GDPR rules, generating automated git-style redline diffs.",
    color: "text-rose-400",
    bg: "bg-rose-500/10 border-rose-500/20",
    delay: 0.2,
  },
  {
    icon: Zap,
    title: "AutoWorkspace Proxy Engine",
    description:
      "Autonomous OOO proxy intercepts incoming tasks, appends live Google Sheets ledger rows, and compiles Docs briefs.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    delay: 0.3,
  },
  {
    icon: ShieldCheck,
    title: "AAL 3 'Eyes On' Governance",
    description:
      "Deterministic 2-decimal arithmetic checks, vendor reconciliation, duplicate blocking, and OAuth manager sign-off.",
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
    delay: 0.4,
  },
];

const governanceRules = [
  {
    condition: "Amount < $1,000 AND confidence > 95% AND no policy flags",
    action: "Auto-Process",
    status: "auto",
  },
  {
    condition: "Amount ≥ $1,000 OR confidence ≤ 95%",
    action: "HALT → HITL Review",
    status: "halt",
  },
  {
    condition: "Duplicate detected (hash or compound key match)",
    action: "HALT → HITL Review",
    status: "halt",
  },
  {
    condition: "Arithmetic mismatch (±$0.01 tolerance)",
    action: "HALT → HITL Review",
    status: "halt",
  },
];

export default function HomePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen overflow-hidden">
      {/* Hero Section */}
      <div className="relative">
        {/* Ambient glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full" />
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-500/5 blur-[80px] rounded-full" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-16">
          {/* Header */}
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 text-sm text-muted-foreground mb-6 border border-primary/20"
            >
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              Powered by Google ADK + Vertex AI
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl md:text-7xl font-bold tracking-tight mb-6"
            >
              <span className="gradient-text">NexusWork</span>
              <br />
              <span className="text-foreground text-4xl md:text-5xl">Autonomous Enterprise Agent</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 text-balance"
            >
              Unified pre-execution compliance auditing, git-style clause redlines,
              AutoWorkspace proxy artifact generation, and AAL 3 "Eyes On" deterministic governance.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <button
                onClick={() => router.push("/workspace")}
                className="group flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3.5 rounded-xl font-semibold text-base transition-all duration-200 glow-blue"
              >
                Open Workspace
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => router.push("/audit")}
                className="flex items-center gap-2 glass hover:bg-secondary px-8 py-3.5 rounded-xl font-semibold text-base transition-all duration-200 border border-border"
              >
                <ShieldCheck className="w-4 h-4 text-primary" />
                Audit Trail
              </button>
            </motion.div>
          </div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16"
          >
            {[
              { label: "RAG SLA", value: "≤ 3s", sub: "Policy queries" },
              { label: "Extraction SLA", value: "≤ 15s", sub: "Document AI" },
              { label: "Auto-Process", value: "< $1K", sub: "95%+ confidence" },
              { label: "Audit Trail", value: "Immutable", sub: "AlloyDB + Firestore" },
            ].map((stat) => (
              <div key={stat.label} className="metric-card text-center">
                <div className="text-2xl font-bold gradient-text">{stat.value}</div>
                <div className="text-sm font-medium text-foreground">{stat.label}</div>
                <div className="text-xs text-muted-foreground">{stat.sub}</div>
              </div>
            ))}
          </motion.div>

          {/* Features grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: feature.delay }}
                className={`glass rounded-2xl p-6 border ${feature.bg} hover:scale-[1.01] transition-transform duration-200`}
              >
                <div
                  className={`w-10 h-10 rounded-xl bg-current/10 flex items-center justify-center mb-4 ${feature.color}`}
                >
                  <feature.icon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>

          {/* AAL-3 Governance Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="glass rounded-2xl overflow-hidden border border-border/50"
          >
            <div className="px-6 py-4 border-b border-border/50 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              <h2 className="font-semibold text-foreground">AAL-3 Governance Matrix</h2>
              <span className="badge-pending ml-auto">Eyes On</span>
            </div>
            <div className="divide-y divide-border/50">
              {governanceRules.map((rule, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4 hover:bg-secondary/30 transition-colors">
                  <div className="flex-1 text-sm text-muted-foreground">{rule.condition}</div>
                  <div className="flex items-center gap-2 shrink-0">
                    {rule.status === "auto" ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="badge-auto">{rule.action}</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                        <span className="badge-halt">{rule.action}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
