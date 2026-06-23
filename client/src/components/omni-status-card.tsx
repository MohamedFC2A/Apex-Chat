import { useState } from "react";
import {
  Shield, BookOpen, Palette, Target, RotateCw,
  Sparkles, ChevronDown, ChevronUp, ExternalLink, X,
  Brain, Zap, Globe, Search, Code2, FlaskConical,
  MessageSquare, TrendingUp, CheckCircle2, Clock,
  Activity, Network, Layers, FileCode2
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { OmniState } from "@/lib/omni-service";
import { motion, AnimatePresence } from "framer-motion";

interface OmniStatusCardProps {
  state: OmniState;
}

// Agent metadata - ZERO emojis, pure icon-based, theme-adaptable text colors
const agentMeta: Record<string, {
  icon: React.ComponentType<any>;
  shortCode: string;
  name: string;
  role: string;
  color: string;
  bgColor: string;
  borderColor: string;
  specialization: string;
  outputType: string;
}> = {
  architect: {
    icon: Layers,
    shortCode: "ARCH",
    name: "Architect",
    role: "System Design",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30 dark:border-emerald-500/40",
    specialization: "Structural planning, system architecture, dependency mapping",
    outputType: "Architecture Blueprint",
  },
  coder: {
    icon: Code2,
    shortCode: "CODE",
    name: "Coder",
    role: "Implementation",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30 dark:border-blue-500/40",
    specialization: "Syntax accuracy, code generation, API integration",
    outputType: "Code Artifact",
  },
  security: {
    icon: Shield,
    shortCode: "SEC",
    name: "Security",
    role: "Threat Analysis",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30 dark:border-red-500/40",
    specialization: "Vulnerability scanning, threat modeling, attack vectors",
    outputType: "Risk Assessment",
  },
  researcher: {
    icon: Search,
    shortCode: "RSCH",
    name: "Researcher",
    role: "Data Retrieval",
    color: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/30 dark:border-violet-500/40",
    specialization: "Fact validation, citation extraction, source verification",
    outputType: "Research Report",
  },
  creative: {
    icon: Palette,
    shortCode: "CRTV",
    name: "Creative",
    role: "Conceptual Thinking",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30 dark:border-amber-500/40",
    specialization: "Novel approaches, lateral thinking, idea synthesis",
    outputType: "Creative Brief",
  },
  linguist: {
    icon: MessageSquare,
    shortCode: "LING",
    name: "Linguist",
    role: "Language Polish",
    color: "text-teal-600 dark:text-teal-400",
    bgColor: "bg-teal-500/10",
    borderColor: "border-teal-500/30 dark:border-teal-500/40",
    specialization: "Grammar refinement, tone calibration, multilingual accuracy",
    outputType: "Polished Draft",
  },
  skeptic: {
    icon: FlaskConical,
    shortCode: "SKPT",
    name: "Skeptic",
    role: "Logic Validation",
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-500/10",
    borderColor: "border-rose-500/30 dark:border-rose-500/40",
    specialization: "Contradiction detection, edge case analysis, assumption challenge",
    outputType: "Validation Report",
  },
  psychologist: {
    icon: Brain,
    shortCode: "PSYC",
    name: "Psychologist",
    role: "User Empathy",
    color: "text-pink-600 dark:text-pink-400",
    bgColor: "bg-pink-500/10",
    borderColor: "border-pink-500/30 dark:border-pink-500/40",
    specialization: "Intent modeling, emotional context, user alignment",
    outputType: "Context Model",
  },
  futurist: {
    icon: TrendingUp,
    shortCode: "FUTR",
    name: "Futurist",
    role: "Scalability",
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/30 dark:border-cyan-500/40",
    specialization: "Long-term implications, future-proofing, trend extrapolation",
    outputType: "Future Forecast",
  },
  optimizer: {
    icon: Zap,
    shortCode: "OPTM",
    name: "Optimizer",
    role: "Performance",
    color: "text-lime-600 dark:text-lime-400",
    bgColor: "bg-lime-500/10",
    borderColor: "border-lime-500/30 dark:border-lime-500/40",
    specialization: "Resource optimization, latency reduction, efficiency gains",
    outputType: "Optimization Plan",
  },
};

// Status pill component - supports theme natively
function StatusPill({ status }: { status: string }) {
  if (status === "complete") {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
        <CheckCircle2 className="w-2.5 h-2.5" />
        Done
      </span>
    );
  }
  if (status === "drafting") {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25 animate-pulse">
        <Activity className="w-2.5 h-2.5" />
        Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
      <Clock className="w-2.5 h-2.5" />
      Queue
    </span>
  );
}

export function OmniStatusCard({ state }: OmniStatusCardProps) {
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [showSources, setShowSources] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  const agents = [
    { key: "architect", agent: state.agents.architect },
    { key: "coder", agent: state.agents.coder },
    { key: "security", agent: state.agents.security },
    { key: "researcher", agent: state.agents.researcher },
    { key: "creative", agent: state.agents.creative },
    { key: "linguist", agent: state.agents.linguist },
    { key: "skeptic", agent: state.agents.skeptic },
    { key: "psychologist", agent: state.agents.psychologist },
    { key: "futurist", agent: state.agents.futurist },
    { key: "optimizer", agent: state.agents.optimizer },
  ];

  const completedCount = agents.filter(a => a.agent.status === "complete").length;
  const activeCount = agents.filter(a => a.agent.status === "drafting").length;
  const totalAgents = agents.length;
  const isComplete = state.step === "complete";
  const isSynthesizing = state.step === "synthesizing";

  // Smart progress calculation
  const progressValue = isComplete
    ? 100
    : isSynthesizing
      ? 88
      : Math.round((completedCount / totalAgents) * 75);

  // Extract sources
  const extractSources = (finalResponse?: string, researcherResponse?: string) => {
    const textToParse = (finalResponse || "") + "\n" + (researcherResponse || "");
    if (!textToParse.trim()) return [];
    const sourcesList: Array<{ name: string; url: string }> = [];
    const seen = new Set<string>();
    const mdRegex = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
    let match;
    while ((match = mdRegex.exec(textToParse)) !== null) {
      const [, name, url] = match;
      if (!seen.has(url)) { seen.add(url); sourcesList.push({ name: name.trim(), url: url.trim() }); }
    }
    const urlRegex = /(https?:\/\/[^\s\)\>\<\,\'\"]+)/g;
    const rawUrls = textToParse.match(urlRegex) || [];
    rawUrls.forEach(url => {
      if (!seen.has(url)) {
        seen.add(url);
        try { sourcesList.push({ name: new URL(url).hostname.replace('www.', ''), url }); }
        catch { sourcesList.push({ name: url, url }); }
      }
    });
    return sourcesList;
  };

  const researcherResponse = state.agents.researcher?.response;
  const sources = extractSources(state.finalResponse, researcherResponse);

  return (
    <motion.div
      className="relative font-mono text-xs my-4 w-full text-foreground"
      initial={{ opacity: 0, y: 6, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <div className="relative rounded-xl border border-border bg-card/85 backdrop-blur-xl shadow-xl overflow-hidden">

        {/* Top accent line - color shifts with state */}
        <div className={cn(
          "absolute top-0 left-0 right-0 h-[2px] transition-all duration-700",
          isComplete
            ? "bg-gradient-to-r from-emerald-600 via-emerald-400 to-emerald-600"
            : "bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600"
        )} />

        {/* Subtle grid background */}
        <div
          className="absolute inset-0 opacity-[0.015] dark:opacity-[0.025] pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(currentColor 1px, transparent 1px),
              linear-gradient(90deg, currentColor 1px, transparent 1px)
            `,
            backgroundSize: "24px 24px",
          }}
        />

        {/* Ambient glow */}
        <div className={cn(
          "absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-20 transition-colors duration-700",
          isComplete ? "bg-emerald-500/10" : "bg-amber-500/10"
        )} />

        <div className="relative z-10 p-4">

          {/* ── HEADER ── */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className={cn(
                "p-1.5 rounded-md border transition-colors duration-500",
                isComplete ? "bg-emerald-500/10 border-emerald-500/20" : "bg-amber-500/10 border-amber-500/20"
              )}>
                <Network className={cn("w-3.5 h-3.5 transition-colors duration-500", isComplete ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400 animate-pulse")} />
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-[0.15em] text-foreground uppercase">
                  Apex Omni — Deca-Core
                </p>
                <p className="text-[8px] text-muted-foreground tracking-widest mt-0.5 uppercase">
                  {isComplete ? "Cognitive Synthesis Complete" : isSynthesizing ? "Aggregating Agent Outputs" : "Parallel Inference Active"}
                </p>
              </div>
            </div>

            {/* Live counters */}
            <div className="flex items-center gap-2">
              {activeCount > 0 && (
                <span className="flex items-center gap-1 text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 animate-pulse" />
                  {activeCount} running
                </span>
              )}
              <span className={cn(
                "text-[9px] font-bold px-2 py-0.5 rounded-full border tracking-wider",
                isComplete
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : "bg-muted text-muted-foreground border-border"
              )}>
                {completedCount}/{totalAgents}
              </span>
              <div className={cn(
                "w-2 h-2 rounded-full border",
                isComplete
                  ? "bg-emerald-500 border-emerald-400 dark:bg-emerald-400 dark:border-emerald-300 shadow-[0_0_6px_rgba(52,211,153,0.7)]"
                  : "bg-amber-500 border-amber-400 dark:bg-amber-400 dark:border-amber-300 animate-pulse shadow-[0_0_6px_rgba(251,191,36,0.7)]"
              )} />
            </div>
          </div>

          {/* ── PIPELINE TRACK ── */}
          <div className="relative mb-4 bg-muted/40 border border-border/60 rounded-lg px-3 py-3 overflow-x-auto scrollbar-none">
            {/* SVG connector rail */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              preserveAspectRatio="none"
            >
              {/* Base dashed rail */}
              <line
                x1="5%" y1="50%" x2="95%" y2="50%"
                className="stroke-muted-foreground/30 dark:stroke-border"
                strokeWidth="1"
                strokeDasharray="3 4"
              />
              {/* Animated progress rail */}
              {!isComplete && (
                <motion.line
                  x1="5%"
                  y1="50%"
                  x2={`${5 + progressValue * 0.9}%`}
                  y2="50%"
                  className="stroke-amber-500 dark:stroke-amber-400"
                  strokeWidth="1.5"
                  strokeDasharray="5 5"
                  animate={{ strokeDashoffset: [0, -20] }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                />
              )}
              {/* Complete rail */}
              {isComplete && (
                <motion.line
                  x1="5%" y1="50%" x2="95%" y2="50%"
                  className="stroke-emerald-500 dark:stroke-emerald-400"
                  strokeWidth="1.5"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              )}
            </svg>

            {/* Agent nodes */}
            <div className="relative z-10 flex items-center justify-between gap-2 min-w-[500px] md:min-w-0">
              {agents.map(({ key, agent }) => {
                const meta = agentMeta[key];
                const AgentIcon = meta.icon;
                const status = agent.status;
                const isActive = status === "drafting";
                const isDone = status === "complete";
                const isPending = status === "loading";

                return (
                  <button
                    key={key}
                    onClick={() => {
                      setPanelOpen(true);
                      setExpandedAgent(expandedAgent === key ? null : key);
                    }}
                    className="flex flex-col items-center gap-1.5 group focus:outline-none flex-shrink-0"
                    title={`${meta.name} — ${meta.role}`}
                  >
                    {/* Node circle */}
                    <div className="relative">
                      {/* Ping ring for active agents */}
                      {isActive && (
                        <span className="absolute -inset-1.5 rounded-full border border-amber-500/50 dark:border-amber-400/60 animate-ping" />
                      )}
                      {/* Selection ring */}
                      {expandedAgent === key && (
                        <span className="absolute -inset-1 rounded-full border border-foreground/30" />
                      )}

                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center border transition-all duration-300",
                        isDone && `${meta.bgColor} ${meta.borderColor} group-hover:scale-110 shadow-sm`,
                        isActive && "bg-amber-500/20 border-amber-500/60 dark:border-amber-400/60 animate-pulse group-hover:scale-110",
                        isPending && "bg-muted border-border/50"
                      )}>
                        <AgentIcon className={cn(
                          "w-3 h-3 transition-colors",
                          isDone && meta.color,
                          isActive && "text-amber-600 dark:text-amber-400",
                          isPending && "text-muted-foreground/50"
                        )} />
                      </div>
                    </div>

                    {/* Label */}
                    <span className={cn(
                      "text-[7px] font-bold tracking-wider uppercase leading-none",
                      isDone && "text-foreground/80 dark:text-zinc-300",
                      isActive && "text-amber-600 dark:text-amber-400",
                      isPending && "text-muted-foreground/60"
                    )}>
                      {meta.shortCode}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── PROGRESS BAR ── */}
          <div className="space-y-1.5 mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Activity className={cn(
                  "w-3 h-3",
                  isComplete ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400 animate-pulse"
                )} />
                <span className="text-[9px] uppercase tracking-widest font-semibold text-muted-foreground">
                  {isComplete ? "Synthesis Complete" : isSynthesizing ? "Synthesizing" : "Processing"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  "text-[10px] font-bold tabular-nums",
                  isComplete ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                )}>
                  {progressValue}%
                </span>
              </div>
            </div>

            {/* Progress track */}
            <div className="relative h-1 bg-muted rounded-full overflow-hidden border border-border/30">
              {/* Animated shimmer on top of progress */}
              {!isComplete && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-background/25 to-transparent"
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ repeat: Infinity, duration: 1.8, ease: "linear" }}
                />
              )}
              <motion.div
                className={cn(
                  "h-full rounded-full",
                  isComplete
                    ? "bg-gradient-to-r from-emerald-600 to-emerald-400"
                    : "bg-gradient-to-r from-amber-600 to-amber-400 dark:from-amber-700 dark:to-amber-400"
                )}
                initial={{ width: 0 }}
                animate={{ width: `${progressValue}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>

            {/* Sub-metrics row */}
            <div className="flex items-center justify-between pt-0.5 flex-wrap gap-1">
              <span className="text-[8px] text-muted-foreground/80 uppercase tracking-wider">
                {completedCount} agents complete · {activeCount} active · {totalAgents - completedCount - activeCount} queued
              </span>
              {sources.length > 0 && (
                <button
                  onClick={() => setShowSources(true)}
                  className="text-[8px] text-violet-600 dark:text-violet-400 hover:text-violet-500 dark:hover:text-violet-300 transition-colors flex items-center gap-1 uppercase tracking-wider font-bold"
                >
                  <BookOpen className="w-2.5 h-2.5" />
                  {sources.length} sources
                </button>
              )}
            </div>
          </div>

          {/* ── TOGGLE BUTTON ── */}
          <button
            onClick={() => setPanelOpen(!panelOpen)}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-2 rounded-lg border text-[9px] font-bold uppercase tracking-widest transition-all duration-200",
              panelOpen
                ? "bg-muted border-border text-foreground hover:bg-muted/80"
                : "bg-muted/30 border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
            )}
          >
            {panelOpen ? (
              <><ChevronUp className="w-3 h-3" /> Collapse Agent Panel</>
            ) : (
              <><ChevronDown className="w-3 h-3" /> Expand Agent Panel</>
            )}
          </button>

          {/* ── EXPANDABLE AGENT PANEL ── */}
          <AnimatePresence>
            {panelOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="mt-3 space-y-2 pt-3 border-t border-border/60">
                  {/* Column headers */}
                  <div className="grid grid-cols-[auto_1fr_auto_auto] gap-3 px-2 pb-1 border-b border-border/30">
                    <span className="text-[8px] text-muted-foreground uppercase tracking-widest">Agent</span>
                    <span className="text-[8px] text-muted-foreground uppercase tracking-widest">Specialization</span>
                    <span className="text-[8px] text-muted-foreground uppercase tracking-widest hidden md:inline">Output</span>
                    <span className="text-[8px] text-muted-foreground uppercase tracking-widest">Status</span>
                  </div>

                  {agents.map(({ key, agent }) => {
                    const meta = agentMeta[key];
                    const AgentIcon = meta.icon;
                    const status = agent.status;
                    const isExpanded = expandedAgent === key;
                    const isDone = status === "complete";
                    const isActive = status === "drafting";

                    return (
                      <div key={key} className={cn(
                        "rounded-lg border transition-all duration-200 overflow-hidden",
                        isExpanded ? `${meta.bgColor} ${meta.borderColor}` : "bg-muted/20 border-border/40 hover:border-border/60"
                      )}>
                        {/* Row */}
                        <button
                          className="w-full grid grid-cols-[auto_1fr_auto_auto] gap-3 items-center px-3 py-2.5 text-left"
                          onClick={() => setExpandedAgent(isExpanded ? null : key)}
                        >
                          {/* Icon + name */}
                          <div className={cn(
                            "p-1.5 rounded-md border",
                            isDone ? `${meta.bgColor} ${meta.borderColor}` : "bg-muted border-border"
                          )}>
                            <AgentIcon className={cn(
                              "w-3 h-3",
                              isDone ? meta.color : isActive ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground/60"
                            )} />
                          </div>

                          {/* Specialization */}
                          <div className="min-w-0">
                            <p className={cn(
                              "text-[10px] font-bold leading-none mb-1",
                              isDone ? "text-foreground/90 dark:text-zinc-200" : isActive ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground"
                            )}>
                              {meta.name}
                            </p>
                            <p className="text-[8px] text-muted-foreground/75 truncate leading-none">
                              {meta.role}
                            </p>
                          </div>

                          {/* Output type */}
                          <span className={cn(
                            "text-[8px] font-mono tracking-tight px-1.5 py-0.5 rounded border whitespace-nowrap hidden md:inline",
                            isDone ? `${meta.bgColor} ${meta.color} ${meta.borderColor}` : "text-muted-foreground/80 bg-muted border-border"
                          )}>
                            {meta.outputType}
                          </span>

                          {/* Status */}
                          <div className="flex items-center gap-1.5">
                            <StatusPill status={status} />
                            {isExpanded
                              ? <ChevronUp className="w-3 h-3 text-muted-foreground/60" />
                              : <ChevronDown className="w-3 h-3 text-muted-foreground/60" />
                            }
                          </div>
                        </button>

                        {/* Expanded content */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="px-3 pb-3 pt-1 border-t border-border/30 space-y-2">
                                {/* Specialization detail */}
                                <div className="flex items-start gap-2">
                                  <Target className="w-3.5 h-3.5 text-muted-foreground/60 mt-0.5 flex-shrink-0" />
                                  <p className="text-[9px] text-muted-foreground leading-relaxed">
                                    {meta.specialization}
                                  </p>
                                </div>

                                {/* Output box */}
                                {status === "complete" && (agent.response || agent.draft) && (
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1.5">
                                      <FileCode2 className="w-2.5 h-2.5 text-muted-foreground/60" />
                                      <span className="text-[8px] text-muted-foreground/60 uppercase tracking-widest font-bold">Agent Output</span>
                                    </div>
                                    <div className="bg-black/90 dark:bg-black/60 border border-border/80 rounded-lg p-2.5 max-h-36 overflow-y-auto">
                                      <pre className={cn(
                                        "text-[9px] leading-relaxed whitespace-pre-wrap break-words font-mono",
                                        meta.color
                                      )}>
                                        {agent.response || agent.draft || "No output recorded."}
                                      </pre>
                                    </div>
                                  </div>
                                )}

                                {status === "drafting" && (
                                  <div className="flex items-center gap-2 py-2">
                                    <RotateCw className="w-3 h-3 text-amber-600 dark:text-amber-400 animate-spin" />
                                    <span className="text-[9px] text-amber-600 dark:text-amber-400">
                                      Analyzing — generating output stream...
                                    </span>
                                  </div>
                                )}

                                {status === "loading" && (
                                  <div className="flex items-center gap-2 py-2">
                                    <Clock className="w-3 h-3 text-muted-foreground/60" />
                                    <span className="text-[9px] text-muted-foreground/60">
                                      Queued — awaiting cognitive dispatch slot
                                    </span>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>

      {/* ── SOURCES MODAL ── */}
      <AnimatePresence>
        {showSources && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowSources(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md bg-card border border-border rounded-xl shadow-2xl overflow-hidden font-mono"
            >
              {/* Top bar */}
              <div className="h-[2px] bg-gradient-to-r from-violet-600 via-violet-400 to-violet-600" />

              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                    <span className="text-[10px] font-bold text-foreground uppercase tracking-widest">
                      Research Sources
                    </span>
                    <span className="text-[9px] text-violet-600 dark:text-violet-400 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded-full font-bold">
                      {sources.length}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowSources(false)}
                    className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-[8px] text-muted-foreground mb-3 leading-relaxed">
                  References extracted and validated by the Researcher agent during cognitive processing.
                </p>

                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {sources.map((source, idx) => (
                    <a
                      key={idx}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border hover:border-violet-500/30 hover:bg-muted/65 group transition-all"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[8px] text-violet-600 dark:text-violet-400 font-bold bg-violet-500/10 border border-violet-500/25 px-1.5 py-0.5 rounded font-mono flex-shrink-0">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <span className="text-[10px] text-foreground/80 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors truncate font-medium">
                          {source.name}
                        </span>
                      </div>
                      <ExternalLink className="w-3 h-3 text-muted-foreground/60 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors flex-shrink-0" />
                    </a>
                  ))}
                </div>

                <div className="mt-4 pt-3 border-t border-border flex justify-end">
                  <button
                    onClick={() => setShowSources(false)}
                    className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-border hover:border-muted-foreground/50 transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
