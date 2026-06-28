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
      <div className="w-full rounded-xl border border-white/5 bg-neutral-950/40 p-4 backdrop-blur-md md:p-6 shadow-xl relative overflow-hidden">
        {/* Subtle top accent line */}
        <div className={cn(
          "absolute top-0 left-0 right-0 h-[1.5px] transition-all duration-700",
          isComplete
            ? "bg-gradient-to-r from-emerald-500/40 via-emerald-400/40 to-emerald-500/40"
            : "bg-gradient-to-r from-amber-500/40 via-amber-400/40 to-amber-500/40"
        )} />

        <div className="relative z-10 flex flex-col gap-4">
          {/* Header & Progress */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <h2 className="font-mono text-xs tracking-widest text-neutral-400 uppercase">
                {isComplete ? "COGNITIVE SYNTHESIS COMPLETE" : isSynthesizing ? "AGGREGATING AGENT OUTPUTS" : "PARALLEL INFERENCE MATRIX"}
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">
                  {completedCount}/{totalAgents} AGENTS COMPLETE
                </span>
                <span className={cn(
                  "text-[10px] font-bold",
                  isComplete ? "text-emerald-400" : "text-amber-400"
                )}>
                  {progressValue}%
                </span>
              </div>
            </div>

            {/* Core Progress Bar */}
            <div className="w-full md:w-64 space-y-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-900 border border-white/5">
                <div
                  className={cn(
                    "h-full transition-all duration-300",
                    isComplete ? "bg-emerald-500" : "bg-amber-500"
                  )}
                  style={{ width: `${progressValue}%` }}
                />
              </div>
            </div>
          </div>

          {/* ── PIPELINE TRACK (Hidden on mobile) ── */}
          <div className="relative bg-neutral-950/20 border border-white/5 rounded-lg px-3 py-3 overflow-x-auto scrollbar-none hidden md:block">
            {/* SVG connector rail */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              preserveAspectRatio="none"
            >
              <line
                x1="5%" y1="50%" x2="95%" y2="50%"
                className="stroke-neutral-800"
                strokeWidth="1"
                strokeDasharray="3 4"
              />
              {!isComplete && (
                <motion.line
                  x1="5%"
                  y1="50%"
                  x2={`${5 + progressValue * 0.9}%`}
                  y2="50%"
                  className="stroke-amber-500/50"
                  strokeWidth="1.5"
                  strokeDasharray="5 5"
                  animate={{ strokeDashoffset: [0, -20] }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                />
              )}
              {isComplete && (
                <motion.line
                  x1="5%" y1="50%" x2="95%" y2="50%"
                  className="stroke-emerald-500/50"
                  strokeWidth="1.5"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              )}
            </svg>

            {/* Agent nodes */}
            <div className="relative z-10 flex items-center justify-between gap-2">
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
                    onClick={() => setExpandedAgent(expandedAgent === key ? null : key)}
                    className="flex flex-col items-center gap-1 group focus:outline-none flex-shrink-0"
                    title={`${meta.name} — ${meta.role}`}
                  >
                    <div className="relative">
                      {isActive && (
                        <span className="absolute -inset-1 rounded-full border border-amber-500/30 animate-ping" />
                      )}
                      {expandedAgent === key && (
                        <span className="absolute -inset-0.5 rounded-full border border-white/20" />
                      )}
                      <div className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center border transition-all duration-300",
                        isDone && `${meta.bgColor} ${meta.borderColor} group-hover:scale-105`,
                        isActive && "bg-amber-500/10 border-amber-500/40 animate-pulse group-hover:scale-105",
                        isPending && "bg-neutral-900 border-white/5"
                      )}>
                        <AgentIcon className={cn(
                          "w-2.5 h-2.5 transition-colors",
                          isDone && meta.color,
                          isActive && "text-amber-500",
                          isPending && "text-neutral-600"
                        )} />
                      </div>
                    </div>
                    <span className={cn(
                      "text-[6.5px] font-bold tracking-wider uppercase leading-none",
                      isDone && "text-neutral-400",
                      isActive && "text-amber-500",
                      isPending && "text-neutral-600"
                    )}>
                      {meta.shortCode}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── LOWER CHECKLIST GRID MATRIX (Deca-Core Checklist) ── */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {agents.map(({ key, agent }) => {
              const meta = agentMeta[key];
              const AgentIcon = meta.icon;
              const status = agent.status;
              const isDone = status === "complete";
              const isActive = status === "drafting";
              const isSelected = expandedAgent === key;

              return (
                <button
                  key={key}
                  onClick={() => setExpandedAgent(isSelected ? null : key)}
                  className={cn(
                    "flex flex-col items-start p-2.5 rounded-lg border text-[11px] text-left transition-all duration-200",
                    isDone
                      ? "bg-emerald-500/[0.02] border-emerald-500/10 text-emerald-400/90 hover:border-emerald-500/30"
                      : isActive
                        ? "bg-amber-500/[0.02] border-amber-500/20 text-amber-400/90 animate-pulse hover:border-amber-500/40"
                        : "bg-white/[0.01] border-white/[0.03] text-zinc-500 hover:border-white/10",
                    isSelected && (isDone ? "border-emerald-500 bg-emerald-500/5" : isActive ? "border-amber-500 bg-amber-500/5" : "border-zinc-500 bg-zinc-800/10")
                  )}
                >
                  <div className="flex items-center gap-1.5 truncate w-full mb-1">
                    <AgentIcon className={cn(
                      "w-3.5 h-3.5 flex-shrink-0",
                      isDone ? "text-emerald-400" : isActive ? "text-amber-400" : "text-zinc-600"
                    )} />
                    <span className="capitalize truncate font-mono font-semibold">{meta.name}</span>
                  </div>
                  <div className="flex items-center justify-between w-full text-[9px] text-muted-foreground/60 mt-auto">
                    <span>{meta.shortCode}</span>
                    <span>{status === "complete" ? "DONE" : status === "drafting" ? "ACTIVE" : "QUEUED"}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Sources and Actions Bar */}
          <div className="flex items-center justify-between border-t border-white/5 pt-2">
            <span className="text-[8px] text-muted-foreground/60 uppercase tracking-wider">
              Parallel execution pool active
            </span>
            {sources.length > 0 && (
              <button
                onClick={() => setShowSources(true)}
                className="text-[8px] text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1 uppercase tracking-wider font-bold"
              >
                <BookOpen className="w-2.5 h-2.5" />
                {sources.length} sources
              </button>
            )}
          </div>

          {/* Expanded Agent Details (Rendered inline below grid) */}
          <AnimatePresence>
            {expandedAgent && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden border-t border-white/5 pt-3"
              >
                {(() => {
                  const meta = agentMeta[expandedAgent];
                  const agentData = state.agents[expandedAgent];
                  const status = agentData?.status;
                  return (
                    <div className={cn("p-3 rounded-lg border", meta.borderColor, meta.bgColor)}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-[10px] text-white tracking-wider font-mono">
                          {meta.name.toUpperCase()} OUTPUT Log
                        </span>
                        <span className="text-[8px] px-1.5 py-0.5 rounded border border-white/10 uppercase tracking-widest font-mono">
                          {status}
                        </span>
                      </div>
                      
                      {status === "complete" && (agentData.response || agentData.draft) ? (
                        <div className="bg-black/40 border border-white/5 rounded p-2.5 max-h-36 overflow-y-auto">
                          <pre className={cn("text-[9px] leading-relaxed whitespace-pre-wrap break-words font-mono", meta.color)}>
                            {agentData.response || agentData.draft}
                          </pre>
                        </div>
                      ) : status === "drafting" ? (
                        <div className="flex items-center gap-2 py-1 text-amber-400 text-[9px] font-mono">
                          <RotateCw className="w-3 h-3 animate-spin" />
                          <span>Generating cognitive stream...</span>
                        </div>
                      ) : (
                        <div className="text-zinc-500 text-[9px] font-mono">
                          Awaiting execution slot...
                        </div>
                      )}
                    </div>
                  );
                })()}
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
