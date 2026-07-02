import { useState } from "react";
import {
  Shield, BookOpen, Palette, ChevronDown, ChevronUp,
  ExternalLink, X, Brain, Zap, Globe, Search, Code2,
  FlaskConical, MessageSquare, TrendingUp, CheckCircle2,
  Clock, Activity, Layers
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { OmniState } from "@/lib/omni-service";
import { motion, AnimatePresence } from "framer-motion";

interface OmniStatusCardProps {
  state: OmniState;
}

// Agent metadata - pure icon-based, theme-adaptable text colors
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

export function OmniStatusCard({ state }: OmniStatusCardProps) {
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [showSources, setShowSources] = useState(false);

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
  const totalAgents = agents.length;
  const isComplete = state.step === "complete";
  const isSynthesizing = state.step === "synthesizing";

  // Smart progress calculation
  const progressValue = isComplete
    ? 100
    : isSynthesizing
      ? 88
      : Math.round((completedCount / totalAgents) * 75);

  // Extract sources helper
  const extractSources = (finalResponse?: string, researcherResponse?: string) => {
    const textToParse = (finalResponse || "") + "\n" + (researcherResponse || "");
    if (!textToParse.trim()) return [];
    const sourcesList: Array<{ name: string; url: string }> = [];
    const seen = new Set<string>();
    const mdRegex = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
    let match;
    while ((match = mdRegex.exec(textToParse)) !== null) {
      const [, name, url] = match;
      if (!seen.has(url)) {
        seen.add(url);
        sourcesList.push({ name: name.trim(), url: url.trim() });
      }
    }
    const urlRegex = /(https?:\/\/[^\s\)\>\<\,\'\"]+)/g;
    const rawUrls = textToParse.match(urlRegex) || [];
    rawUrls.forEach(url => {
      if (!seen.has(url)) {
        seen.add(url);
        try {
          sourcesList.push({ name: new URL(url).hostname.replace('www.', ''), url });
        } catch {
          sourcesList.push({ name: url, url });
        }
      }
    });
    return sourcesList;
  };

  const researcherResponse = state.agents.researcher?.response;
  const sources = state.sources && state.sources.length > 0
    ? state.sources
    : extractSources(state.finalResponse, researcherResponse);

  // Pixel blocks configuration
  const totalBlocks = 40;
  const activeBlocks = Math.round((progressValue / 100) * totalBlocks);

  return (
    <motion.div
      className="relative font-mono text-xs my-4 w-full text-foreground"
      initial={{ opacity: 0, y: 6, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {/* Premium retro terminal card block */}
      <div className="w-full rounded-xl border border-zinc-900 bg-black p-6 shadow-2xl relative overflow-hidden">
        
        {/* Flat colored status header accent */}
        <div className={cn(
          "absolute top-0 left-0 right-0 h-[2px] transition-all duration-700",
          isComplete ? "bg-emerald-500" : "bg-amber-500"
        )} />

        <div className="flex flex-col gap-5">
          {/* Section 1: Retro Header Title */}
          <div>
            <h2 className="font-mono text-[14px] font-black tracking-[0.2em] text-white uppercase select-none">
              {isComplete ? "COGNITIVE SYNTHESIS COMPLETE" : isSynthesizing ? "AGGREGATING AGENT OUTPUTS" : "PARALLEL INFERENCE MATRIX"}
            </h2>
          </div>

          {/* Section 2: Spent / Limit aligned labels */}
          <div className="flex justify-between items-end font-mono text-[10px] tracking-wider text-zinc-400 font-bold">
            <div>
              COMPLETED: <span className="text-white">{completedCount}</span> / <span className="text-zinc-500">{totalAgents} AGENTS</span>
            </div>
            <div>
              PROGRESS: <span className={isComplete ? "text-emerald-400" : "text-amber-400"}>{progressValue}%</span>
            </div>
          </div>

          {/* Section 3: Dual-Row Pixel Grid Progress Bar */}
          <div className="flex gap-[2px] w-full py-1">
            {Array.from({ length: totalBlocks }).map((_, i) => {
              const isActive = i < activeBlocks;
              return (
                <div key={i} className="flex-1 flex flex-col gap-[2px]">
                  <div
                    className={cn(
                      "h-2.5 transition-all duration-300",
                      isActive
                        ? isComplete
                          ? "bg-emerald-500"
                          : "bg-amber-500"
                        : "bg-zinc-900"
                    )}
                  />
                  <div
                    className={cn(
                      "h-2.5 transition-all duration-300",
                      isActive
                        ? isComplete
                          ? "bg-emerald-500"
                          : "bg-amber-500"
                        : "bg-zinc-900"
                    )}
                  />
                </div>
              );
            })}
          </div>

          {/* Section 4: Action button and bottom descriptive warning text */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-zinc-900 pt-4">
            <div className="flex flex-col gap-1">
              <div className={cn(
                "text-[9px] font-bold tracking-widest uppercase font-mono leading-relaxed",
                isComplete ? "text-emerald-500" : "text-amber-500"
              )}>
                {isComplete
                  ? "COGNITIVE SYNTHESIS COMPLETE / APEX OMNI PIPELINE SHUTDOWN SUCCESSFUL"
                  : isSynthesizing
                    ? "AGGREGATING COGNITIVE INPUTS / FINAL RESPONSE SYNTHESIS IN PROGRESS"
                    : "SCALING COMPUTE AT INFERENCE TIME / PARALLEL COGNITIVE AGENTS ACTIVE"}
              </div>
              {state.totalDuration && (
                <div className="text-[9px] font-bold tracking-widest uppercase font-mono text-zinc-500">
                  THINKING TIME: <span className="text-zinc-300">{(state.totalDuration / 1000).toFixed(1)}s</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 items-center">
              {sources.length > 0 && (
                <button
                  onClick={() => setShowSources(true)}
                  className="bg-white text-neutral-950 hover:bg-zinc-200 transition-colors text-[9px] font-extrabold px-3 py-1.5 rounded-full uppercase tracking-wider font-mono flex items-center gap-1.5 shrink-0"
                >
                  <Globe className="w-2.5 h-2.5" />
                  SOURCES ({sources.length})
                </button>
              )}
            </div>
          </div>

          {/* Section 5: Agent Grid Track */}
          <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2 p-3 bg-black border border-zinc-900 rounded-lg">
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
                  className={cn(
                    "flex flex-col items-center justify-center p-2.5 border rounded transition-all font-mono group relative overflow-hidden",
                    isDone
                      ? "border-emerald-500/40 bg-emerald-950/10 text-emerald-400 hover:border-emerald-500"
                      : isActive
                        ? "border-amber-500 bg-amber-950/20 text-amber-400 animate-pulse hover:border-amber-400"
                        : "border-zinc-900 bg-zinc-950/30 text-zinc-600 hover:border-zinc-800"
                  )}
                >
                  <AgentIcon className={cn(
                    "w-4 h-4 mb-2 transition-colors",
                    isDone && "text-emerald-400",
                    isActive && "text-amber-400",
                    isPending && "text-zinc-700"
                  )} />
                  <span className="text-[8px] font-black tracking-wider uppercase font-mono">{meta.shortCode}</span>
                  <div className="mt-1.5 flex items-center gap-1">
                    <div className={cn(
                      "w-1 h-1 rounded-full",
                      isDone ? "bg-emerald-400 animate-pulse" : isActive ? "bg-amber-400 animate-ping" : "bg-zinc-800"
                    )} />
                    <span className="text-[6px] tracking-wider font-bold">
                      {isDone ? "DONE" : isActive ? "RUN" : "WAIT"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Section 6: Expanded Agent Logs */}
          <AnimatePresence>
            {expandedAgent && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden border-t border-zinc-800/80 pt-3"
              >
                {(() => {
                  const meta = agentMeta[expandedAgent];
                  const agentData = state.agents[expandedAgent];
                  const status = agentData?.status;
                  return (
                    <div className={cn("p-4 rounded-lg border bg-zinc-950/90", meta.borderColor)}>
                      <div className="flex items-center justify-between mb-3 border-b border-zinc-800/80 pb-2">
                        <span className="font-extrabold text-[10px] text-white tracking-widest font-mono uppercase">
                          {meta.name} agent log output
                        </span>
                        <span className={cn(
                          "text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider font-mono",
                          status === "complete" ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" : "border-amber-500/30 text-amber-400 bg-amber-500/10"
                        )}>
                          {status}
                        </span>
                      </div>
                      
                      {status === "complete" && (agentData.response || agentData.draft) ? (
                        <div className="bg-neutral-900 border border-zinc-800/60 rounded p-3 max-h-36 overflow-y-auto">
                          <pre className={cn("text-[9px] leading-relaxed whitespace-pre-wrap break-words font-mono text-zinc-300")}>
                            {agentData.response || agentData.draft}
                          </pre>
                        </div>
                      ) : status === "drafting" ? (
                        <div className="flex items-center gap-2 py-2 text-amber-400 text-[9px] font-mono">
                          <Activity className="w-3.5 h-3.5 animate-spin" />
                          <span>Generating cognitive stream...</span>
                        </div>
                      ) : (
                        <div className="text-zinc-600 text-[9px] font-mono py-1">
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
              className="relative w-full max-w-md bg-black border border-zinc-900 rounded shadow-2xl overflow-hidden font-mono"
            >
              {/* Modal top header accent */}
              <div className="h-[2px] bg-zinc-800" />

              <div className="p-5">
                <div className="flex items-center justify-between mb-4 border-b border-zinc-900 pb-3">
                  <div className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="text-[10px] font-extrabold text-white uppercase tracking-widest">
                      Research Sources
                    </span>
                    <span className="text-[9px] text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded font-bold">
                      {sources.length}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowSources(false)}
                    className="p-1 rounded hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-[8px] text-zinc-500 mb-4 leading-relaxed uppercase tracking-wider font-bold">
                  References extracted and validated by the Researcher agent during cognitive processing.
                </p>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {sources.map((source: any, idx: number) => (
                    <a
                      key={idx}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded bg-black border border-zinc-900 hover:border-zinc-800 hover:bg-zinc-900/40 group transition-all"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[8px] text-zinc-400 font-bold bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded font-mono flex-shrink-0">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <span className="text-[10px] text-zinc-300 group-hover:text-white transition-colors truncate font-semibold">
                          {source.title || source.name}
                        </span>
                      </div>
                      <ExternalLink className="w-3 h-3 text-zinc-500 group-hover:text-white transition-colors flex-shrink-0" />
                    </a>
                  ))}
                </div>

                <div className="mt-5 pt-3 border-t border-zinc-900 flex justify-end">
                  <button
                    onClick={() => setShowSources(false)}
                    className="text-[9px] uppercase tracking-widest font-extrabold text-zinc-400 hover:text-white px-4 py-2 rounded border border-zinc-900 hover:border-zinc-800 transition-all font-mono"
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
