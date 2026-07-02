import { useState, useEffect } from "react";
import {
  Shield, ExternalLink, X, Brain, Zap, Globe, Search, Code2,
  FlaskConical, MessageSquare, TrendingUp, CheckCircle2,
  Layers
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { OmniState } from "@/lib/omni-service";
import { motion, AnimatePresence } from "framer-motion";

interface OmniStatusCardProps {
  state: OmniState;
}

// Agent metadata
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
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    specialization: "Structural planning, system architecture, dependency mapping",
    outputType: "Architecture Blueprint",
  },
  coder: {
    icon: Code2,
    shortCode: "CODE",
    name: "Coder",
    role: "Implementation",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    specialization: "Syntax accuracy, code generation, API integration",
    outputType: "Code Artifact",
  },
  security: {
    icon: Shield,
    shortCode: "SEC",
    name: "Security",
    role: "Threat Analysis",
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    specialization: "Vulnerability scanning, threat modeling, attack vectors",
    outputType: "Risk Assessment",
  },
  researcher: {
    icon: Search,
    shortCode: "RSCH",
    name: "Researcher",
    role: "Data Retrieval",
    color: "text-violet-400",
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/30",
    specialization: "Fact validation, citation extraction, source verification",
    outputType: "Research Report",
  },
  creative: {
    icon: PaletteIcon, // custom simple SVG icon defined below or custom Palette
    shortCode: "CRTV",
    name: "Creative",
    role: "Conceptual Thinking",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    specialization: "Novel approaches, lateral thinking, idea synthesis",
    outputType: "Creative Brief",
  },
  linguist: {
    icon: MessageSquare,
    shortCode: "LING",
    name: "Linguist",
    role: "Language Polish",
    color: "text-teal-400",
    bgColor: "bg-teal-500/10",
    borderColor: "border-teal-500/30",
    specialization: "Grammar refinement, tone calibration, multilingual accuracy",
    outputType: "Polished Draft",
  },
  skeptic: {
    icon: FlaskConical,
    shortCode: "SKPT",
    name: "Skeptic",
    role: "Logic Validation",
    color: "text-rose-400",
    bgColor: "bg-rose-500/10",
    borderColor: "border-rose-500/30",
    specialization: "Contradiction detection, edge case analysis, assumption challenge",
    outputType: "Validation Report",
  },
  psychologist: {
    icon: Brain,
    shortCode: "PSYC",
    name: "Psychologist",
    role: "User Empathy",
    color: "text-pink-400",
    bgColor: "bg-pink-500/10",
    borderColor: "border-pink-500/30",
    specialization: "Intent modeling, emotional context, user alignment",
    outputType: "Context Model",
  },
  futurist: {
    icon: TrendingUp,
    shortCode: "FUTR",
    name: "Futurist",
    role: "Scalability",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/30",
    specialization: "Long-term implications, future-proofing, trend extrapolation",
    outputType: "Future Forecast",
  },
  optimizer: {
    icon: Zap,
    shortCode: "OPTM",
    name: "Optimizer",
    role: "Performance",
    color: "text-lime-400",
    bgColor: "bg-lime-500/10",
    borderColor: "border-lime-500/30",
    specialization: "Resource optimization, latency reduction, efficiency gains",
    outputType: "Optimization Plan",
  },
};

// Simple custom Palette icon since palette may not be in lucide
function PaletteIcon(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 14.7255 3.09032 17.1962 4.85857 19C5.02107 19.1625 5.25301 19.2254 5.47466 19.1659C6.41724 18.913 7.37893 18.6651 8.28636 18.9071C8.98394 19.0931 9.47953 19.6457 9.87834 20.219C10.4578 21.0519 11.1961 21.8488 12 22Z" />
      <circle cx="7.5" cy="10.5" r="1.5" fill="currentColor" />
      <circle cx="11.5" cy="7.5" r="1.5" fill="currentColor" />
      <circle cx="16.5" cy="9.5" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function OmniStatusCard({ state }: OmniStatusCardProps) {
  const [showSources, setShowSources] = useState(false);
  const [simActiveIndex, setSimActiveIndex] = useState(0);

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
  ].filter(a => a.agent !== undefined);

  const isComplete = state.step === "complete";
  const isSynthesizing = state.step === "synthesizing";

  const [activeProgress, setActiveProgress] = useState(0);

  // Simulate thinking steps progression with smooth sub-progress
  useEffect(() => {
    if (isComplete) {
      setSimActiveIndex(10);
      setActiveProgress(100);
    } else if (isSynthesizing) {
      setSimActiveIndex(9);
      setActiveProgress(100);
    } else {
      setActiveProgress(0);
      const duration = 1200; // 1.2s per cognitive agent thinking phase
      const startTime = Date.now();
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const pct = Math.min(100, Math.round((elapsed / duration) * 100));
        setActiveProgress(pct);

        if (elapsed >= duration) {
          clearInterval(interval);
          setSimActiveIndex((prev) => {
            if (prev < 9) return prev + 1;
            return prev;
          });
        }
      }, 30);
      return () => clearInterval(interval);
    }
  }, [isComplete, isSynthesizing, simActiveIndex]);

  const completedCount = isComplete ? 10 : Math.min(10, simActiveIndex);
  const totalAgents = 10;

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

  const totalBlocks = 40;
  const activeBlocks = Math.round((progressValue / 100) * totalBlocks);

  const getActiveStatusText = (name: string) => {
    const textMap: Record<string, string> = {
      architect: "Analyzing system structure, validating API dependencies, and defining codebase architecture blueprint.",
      coder: "Generating structural logic, drafting execution paths, and writing clean optimized components.",
      security: "Performing security vulnerability scanning, assessing potential attack surfaces, and verifying authorization checks.",
      researcher: "Quering serper search index, fetching 60 high-quality organic results, and validating external facts.",
      creative: "Synthesizing lateral concepts, brainstorming alternative solutions, and planning creative execution.",
      linguist: "Calibrating linguistic accuracy, refining text tone, and double-checking spelling grammar details.",
      skeptic: "Challenging model assumptions, testing edge cases, and looking for logical contradictions.",
      psychologist: "Empathizing with user intent, tailoring explanations for context, and aligning models.",
      futurist: "Evaluating project scalability, forecasting future implications, and future-proofing outputs.",
      optimizer: "Optimizing code resource efficiency, reducing computational overhead, and planning latency checks."
    };
    return textMap[name.toLowerCase()] || "Processing cognitive reasoning layer...";
  };

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

          {/* Section 5: Vertical Cognitive Timeline Stepper */}
          <div className="flex flex-col gap-0.5 pl-3 mt-4 relative">
            
            {/* Continuous vertical connector line */}
            <div className="absolute left-[9px] top-[14px] bottom-[14px] w-[1px] bg-zinc-900" />
            
            {agents.map(({ key, agent }, index) => {
              const meta = agentMeta[key];
              const AgentIcon = meta.icon;
              
              // Step Status determination
              let stepStatus: "complete" | "active" | "pending" = "pending";
              if (isComplete) {
                stepStatus = "complete";
              } else if (index < simActiveIndex) {
                stepStatus = "complete";
              } else if (index === simActiveIndex) {
                stepStatus = "active";
              }

              const isStepDone = stepStatus === "complete";
              const isStepActive = stepStatus === "active";

              return (
                <div key={key} className="flex flex-col gap-1.5 py-2.5 relative group select-none">
                  {/* Step row header */}
                  <div className="flex items-center gap-4">
                    {/* Circle Indicator on Left */}
                    <div className="z-10 flex items-center justify-center w-5 h-5 rounded-full transition-all duration-300">
                      {isStepDone ? (
                        <div className="w-4 h-4 rounded-full bg-emerald-500/10 border border-emerald-500 flex items-center justify-center text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" />
                        </div>
                      ) : isStepActive ? (
                        <div className="w-4 h-4 rounded-full bg-blue-500/20 border border-blue-500 flex items-center justify-center text-blue-400 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.35)]">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-black border border-zinc-900 flex items-center justify-center text-[9px] text-zinc-600 font-bold font-mono">
                          {index + 1}
                        </div>
                      )}
                    </div>

                    {/* Step Title on Right */}
                    <div className="flex-1 flex items-center justify-between min-w-0 pr-4">
                      <div className="flex items-center gap-2">
                        <AgentIcon className={cn(
                          "w-3.5 h-3.5",
                          isStepDone ? "text-emerald-400" : isStepActive ? "text-blue-400" : "text-zinc-700"
                        )} />
                        <span className={cn(
                          "text-[11px] font-bold font-mono tracking-wider transition-colors duration-300",
                          isStepDone ? "text-zinc-200" : isStepActive ? "text-white" : "text-zinc-500"
                        )}>
                          {meta.name}
                        </span>
                        <span className="text-[9px] text-zinc-600 font-mono lowercase">
                          ({meta.role})
                        </span>
                      </div>

                      {/* Micro-badge for status */}
                      <span className={cn(
                        "text-[8px] font-bold font-mono uppercase tracking-widest",
                        isStepDone ? "text-emerald-500" : isStepActive ? "text-blue-400 animate-pulse" : "text-zinc-700"
                      )}>
                        {isStepDone ? "done" : isStepActive ? "thinking" : "wait"}
                      </span>
                    </div>
                  </div>

                  {/* Expanded Active Details Card (under active step) */}
                  {isStepActive && (
                    <div className="ml-9 mr-4 mt-2 p-3.5 rounded bg-zinc-950 border border-zinc-900 shadow-md">
                      <p className="text-[10px] font-mono text-zinc-350 leading-relaxed">
                        {getActiveStatusText(meta.name)} <span className="animate-pulse">...</span>
                      </p>
                      
                      {/* Animated sub-progress bar */}
                      <div className="mt-3 flex items-center justify-between font-mono text-[8px] text-zinc-550 mb-1.5">
                        <span>COGNITIVE PROCESSING</span>
                        <span className="font-bold text-blue-400">{activeProgress}%</span>
                      </div>
                      <div className="h-1 bg-zinc-900 rounded-full overflow-hidden mb-3">
                        <div 
                          className="h-full bg-blue-500 rounded-full transition-all duration-75 shadow-[0_0_8px_rgba(59,130,246,0.5)]" 
                          style={{ width: `${activeProgress}%` }} 
                        />
                      </div>

                      <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                        <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-wider font-bold">Specialization:</span>
                        <span className="text-[8px] font-mono text-zinc-350 bg-black border border-zinc-900 px-2 py-0.5 rounded">
                          {meta.specialization}
                        </span>
                        <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-wider font-bold ml-auto">Output:</span>
                        <span className="text-[8px] font-mono text-blue-400 bg-blue-500/5 border border-blue-500/20 px-2 py-0.5 rounded font-bold">
                          {meta.outputType}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

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
