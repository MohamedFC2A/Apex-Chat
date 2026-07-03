import { useState, useEffect, useRef } from "react";
import {
  Shield, ExternalLink, X, Brain, Zap, Globe, Search, Code2,
  FlaskConical, MessageSquare, TrendingUp, CheckCircle2, Layers
} from "lucide-react";
import type { OmniState } from "@/lib/omni-service";
import { motion, AnimatePresence } from "framer-motion";

interface OmniStatusCardProps {
  state: OmniState;
}

// ─── Agent metadata (B&W only) ─────────────────────────────────────────────
const agentMeta: Record<string, {
  icon: React.ComponentType<any>;
  code: string;
  name: string;
  role: string;
  desc: string;
  output: string;
}> = {
  architect:    { icon: Layers,         code: "ARCH", name: "Architect",    role: "System Design",      desc: "Analyzing system structure, validating dependencies, and defining architecture blueprint.",         output: "Architecture Blueprint" },
  coder:        { icon: Code2,          code: "CODE", name: "Coder",        role: "Implementation",     desc: "Generating structural logic, drafting execution paths, writing clean optimized components.",       output: "Code Artifact" },
  security:     { icon: Shield,         code: "SEC",  name: "Security",     role: "Threat Analysis",    desc: "Performing vulnerability scanning, assessing attack surfaces, verifying authorization checks.",     output: "Risk Assessment" },
  researcher:   { icon: Search,         code: "RSCH", name: "Researcher",   role: "Data Retrieval",     desc: "Querying search index, fetching high-quality organic results, validating external facts.",          output: "Research Report" },
  creative:     { icon: PaletteIcon,    code: "CRTV", name: "Creative",     role: "Conceptual Thinking",desc: "Synthesizing lateral concepts, brainstorming alternatives, planning creative execution.",            output: "Creative Brief" },
  linguist:     { icon: MessageSquare,  code: "LING", name: "Linguist",     role: "Language Polish",    desc: "Calibrating linguistic accuracy, refining tone, checking grammar and multilingual precision.",      output: "Polished Draft" },
  skeptic:      { icon: FlaskConical,   code: "SKPT", name: "Skeptic",      role: "Logic Validation",   desc: "Challenging assumptions, testing edge cases, detecting logical contradictions.",                   output: "Validation Report" },
  psychologist: { icon: Brain,          code: "PSYC", name: "Psychologist", role: "User Empathy",       desc: "Modeling user intent, tailoring context, aligning response to user expectations.",                output: "Context Model" },
  futurist:     { icon: TrendingUp,     code: "FUTR", name: "Futurist",     role: "Scalability",        desc: "Evaluating scalability, forecasting implications, future-proofing outputs for longevity.",        output: "Future Forecast" },
  optimizer:    { icon: Zap,            code: "OPTM", name: "Optimizer",    role: "Performance",        desc: "Optimizing resource efficiency, reducing computational overhead, minimizing latency.",             output: "Optimization Plan" },
};

function PaletteIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 14.7255 3.09032 17.1962 4.85857 19C5.02107 19.1625 5.25301 19.2254 5.47466 19.1659C6.41724 18.913 7.37893 18.6651 8.28636 18.9071C8.98394 19.0931 9.47953 19.6457 9.87834 20.219C10.4578 21.0519 11.1961 21.8488 12 22Z" />
      <circle cx="7.5" cy="10.5" r="1.5" fill="currentColor" />
      <circle cx="11.5" cy="7.5" r="1.5" fill="currentColor" />
      <circle cx="16.5" cy="9.5" r="1.5" fill="currentColor" />
    </svg>
  );
}

// ─── Animated pixel counter ────────────────────────────────────────────────
function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number>();
  useEffect(() => {
    const start = display;
    const end = value;
    const duration = 600;
    const startTime = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value]);
  return <>{display}</>;
}

// ─── Main Component ────────────────────────────────────────────────────────
export function OmniStatusCard({ state }: OmniStatusCardProps) {
  const [showSources, setShowSources] = useState(false);
  const [simActiveIndex, setSimActiveIndex] = useState(0);
  const [activeProgress, setActiveProgress] = useState(0);

  const agents = [
    { key: "architect",    agent: state.agents.architect },
    { key: "coder",        agent: state.agents.coder },
    { key: "security",     agent: state.agents.security },
    { key: "researcher",   agent: state.agents.researcher },
    { key: "creative",     agent: state.agents.creative },
    { key: "linguist",     agent: state.agents.linguist },
    { key: "skeptic",      agent: state.agents.skeptic },
    { key: "psychologist", agent: state.agents.psychologist },
    { key: "futurist",     agent: state.agents.futurist },
    { key: "optimizer",    agent: state.agents.optimizer },
  ].filter(a => a.agent !== undefined);

  const totalAgents = agents.length || 10;
  const isComplete   = state.step === "complete";
  const isSynthesizing = state.step === "synthesizing";

  // ── Progression simulation ──────────────────────────────────────────────
  useEffect(() => {
    if (isComplete) {
      setSimActiveIndex(totalAgents);
      setActiveProgress(100);
      return;
    }
    if (isSynthesizing) {
      setSimActiveIndex(totalAgents - 1);
      setActiveProgress(100);
      return;
    }
    setActiveProgress(0);
    const STEP_DURATION = 1400;
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, Math.round((elapsed / STEP_DURATION) * 100));
      setActiveProgress(pct);
      if (elapsed >= STEP_DURATION) {
        clearInterval(interval);
        setSimActiveIndex(prev => (prev < totalAgents - 1 ? prev + 1 : prev));
      }
    }, 24);
    return () => clearInterval(interval);
  }, [isComplete, isSynthesizing, simActiveIndex, totalAgents]);

  // ── Progress math ───────────────────────────────────────────────────────
  const completedCount = isComplete ? totalAgents : Math.min(totalAgents, simActiveIndex);
  const progressValue  = isComplete
    ? 100
    : isSynthesizing
      ? 90
      : Math.round(((completedCount + activeProgress / 100) / totalAgents) * 88);

  // ── Pixel bar blocks ────────────────────────────────────────────────────
  const TOTAL_BLOCKS = 48;
  const activeBlocks = Math.round((progressValue / 100) * TOTAL_BLOCKS);

  // ── Source extraction ───────────────────────────────────────────────────
  const extractSources = (final?: string, researcher?: string) => {
    const text = (final || "") + "\n" + (researcher || "");
    if (!text.trim()) return [];
    const list: { name: string; url: string }[] = [];
    const seen = new Set<string>();
    const md = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
    let m;
    while ((m = md.exec(text)) !== null) {
      if (!seen.has(m[2])) { seen.add(m[2]); list.push({ name: m[1].trim(), url: m[2].trim() }); }
    }
    (text.match(/(https?:\/\/[^\s\)\><\,'\"]+)/g) || []).forEach(url => {
      if (!seen.has(url)) {
        seen.add(url);
        try { list.push({ name: new URL(url).hostname.replace("www.", ""), url }); }
        catch { list.push({ name: url, url }); }
      }
    });
    return list;
  };

  const sources = state.sources?.length
    ? state.sources
    : extractSources(state.finalResponse, state.agents.researcher?.response);

  // ── Vertical connector line fill (grows as steps complete) ──────────────
  // Each segment between nodes fills when the step above completes
  const getLineProgress = (index: number) => {
    if (isComplete) return 100;
    if (index < simActiveIndex - 1) return 100;
    if (index === simActiveIndex - 1) return activeProgress;
    return 0;
  };

  return (
    <motion.div
      className="relative font-mono text-xs my-4 w-full"
      initial={{ opacity: 0, y: 8, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
    >
      <div className="w-full rounded-none border border-white/8 bg-[#050505] shadow-2xl relative overflow-hidden">

        {/* ── Top accent line (white when done, dim when active) ── */}
        <motion.div
          className="absolute top-0 left-0 right-0 h-[1px]"
          animate={{ backgroundColor: isComplete ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.15)" }}
          transition={{ duration: 0.5 }}
        />

        <div className="flex flex-col gap-0 divide-y divide-white/5">

          {/* ── SECTION 1: Header ──────────────────────────────────── */}
          <div className="px-6 pt-5 pb-4">
            <div className="flex items-center justify-between mb-1">
              <motion.h2
                key={isComplete ? "done" : isSynthesizing ? "synth" : "active"}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="font-mono text-[13px] font-black tracking-[0.22em] uppercase"
                style={{ color: isComplete ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.7)" }}
              >
                {isComplete
                  ? "◈ SYNTHESIS COMPLETE"
                  : isSynthesizing
                    ? "◈ AGGREGATING OUTPUTS"
                    : "◈ PARALLEL INFERENCE ACTIVE"}
              </motion.h2>
              <span className="font-mono text-[9px] tracking-[0.2em] text-white/20 uppercase">
                APEX·OMNI
              </span>
            </div>
            <p className="font-mono text-[10px] text-white/25 tracking-wider">
              {isComplete
                ? `${totalAgents} cognitive agents completed · ${state.totalDuration ? (state.totalDuration / 1000).toFixed(1) + "s" : "—"}`
                : `${completedCount} / ${totalAgents} agents done · scaling compute at inference time`}
            </p>
          </div>

          {/* ── SECTION 2: Pixel progress bar ─────────────────────── */}
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-2.5">
              <span className="font-mono text-[9px] tracking-[0.2em] text-white/30 uppercase font-bold">
                Cognitive Load
              </span>
              <span className={`font-mono text-[11px] font-black tracking-wider ${isComplete ? "text-white" : "text-white/60"}`}>
                <AnimatedNumber value={progressValue} />%
              </span>
            </div>

            {/* Dual-row pixel blocks */}
            <div className="flex gap-[2px] w-full">
              {Array.from({ length: TOTAL_BLOCKS }).map((_, i) => {
                const on = i < activeBlocks;
                const brightness = on
                  ? isComplete
                    ? "bg-white"
                    : i < activeBlocks - 4
                      ? "bg-white/70"
                      : "bg-white/90"
                  : "bg-white/6";
                return (
                  <div key={i} className="flex-1 flex flex-col gap-[2px]">
                    <motion.div
                      className={`h-2 transition-all duration-200 ${brightness}`}
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: on ? 1 : 1 }}
                    />
                    <div className={`h-1 ${on ? (isComplete ? "bg-white/35" : "bg-white/20") : "bg-white/4"}`} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── SECTION 3: Vertical step timeline ─────────────────── */}
          <div className="px-4 py-4 relative">

            {agents.map(({ key }, index) => {
              const meta = agentMeta[key];
              if (!meta) return null;
              const AgentIcon = meta.icon;

              const stepStatus =
                isComplete || index < simActiveIndex ? "done"
                : index === simActiveIndex ? "active"
                : "pending";

              const isDone    = stepStatus === "done";
              const isActive  = stepStatus === "active";
              const isPending = stepStatus === "pending";
              const isLast    = index === agents.length - 1;

              // Per-step sub-progress (only for active step)
              const stepPct = isActive ? activeProgress : isDone ? 100 : 0;

              return (
                <div key={key} className="relative flex gap-0">

                  {/* ── Left: node + vertical connector ── */}
                  <div className="flex flex-col items-center w-8 shrink-0">

                    {/* Node circle */}
                    <div className="relative z-10 my-1">
                      {isDone ? (
                        <motion.div
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: "spring", stiffness: 500, damping: 25 }}
                          className="w-5 h-5 rounded-full bg-white flex items-center justify-center"
                        >
                          <CheckCircle2 className="w-3 h-3 text-black" strokeWidth={3} />
                        </motion.div>
                      ) : isActive ? (
                        <div className="relative w-5 h-5 flex items-center justify-center">
                          {/* Ping ring */}
                          <span className="absolute inset-0 rounded-full bg-white/20 animate-ping" />
                          <div className="w-5 h-5 rounded-full border-2 border-white bg-black flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-white/12 bg-transparent flex items-center justify-center">
                          <span className="font-mono text-[8px] font-bold text-white/20">{index + 1}</span>
                        </div>
                      )}
                    </div>

                    {/* Vertical connector line (fills top→bottom) */}
                    {!isLast && (
                      <div className="w-[1px] flex-1 bg-white/6 relative overflow-hidden min-h-[24px]">
                        <motion.div
                          className="absolute top-0 left-0 right-0 bg-white/40"
                          initial={{ height: "0%" }}
                          animate={{ height: `${getLineProgress(index)}%` }}
                          transition={{ duration: 0.4, ease: "linear" }}
                        />
                      </div>
                    )}
                  </div>

                  {/* ── Right: content ── */}
                  <div className={`flex-1 min-w-0 pb-3 pl-3 ${isLast ? "pb-1" : ""}`}>

                    {/* Step header row */}
                    <div className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <AgentIcon className={`w-3.5 h-3.5 shrink-0 transition-colors duration-300 ${
                          isDone ? "text-white/70" : isActive ? "text-white" : "text-white/18"
                        }`} />
                        <span className={`font-mono text-[11px] font-bold tracking-wider uppercase transition-colors duration-300 ${
                          isDone ? "text-white/65" : isActive ? "text-white" : "text-white/22"
                        }`}>
                          {meta.name}
                        </span>
                        <span className={`font-mono text-[9px] tracking-wide lowercase transition-colors duration-300 ${
                          isDone ? "text-white/25" : isActive ? "text-white/45" : "text-white/12"
                        }`}>
                          ({meta.role})
                        </span>
                      </div>

                      {/* Status badge */}
                      <motion.span
                        key={stepStatus}
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`font-mono text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm ${
                          isDone
                            ? "bg-white/8 text-white/40"
                            : isActive
                              ? "bg-white text-black"
                              : "bg-transparent text-white/12"
                        }`}
                      >
                        {isDone ? "done" : isActive ? "live" : String(index + 1).padStart(2, "0")}
                      </motion.span>
                    </div>

                    {/* ── Active step expansion ── */}
                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.22, ease: "easeOut" }}
                          className="overflow-hidden"
                        >
                          <div className="mt-1.5 mr-2 p-3.5 border border-white/10 bg-white/3 rounded-sm">

                            {/* Description */}
                            <p className="font-mono text-[10px] text-white/55 leading-relaxed mb-3">
                              {meta.desc}
                              <motion.span
                                animate={{ opacity: [1, 0, 1] }}
                                transition={{ repeat: Infinity, duration: 1.0 }}
                                className="inline-block ml-1 text-white/80"
                              >_</motion.span>
                            </p>

                            {/* Sub-progress bar */}
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-mono text-[8px] text-white/30 uppercase tracking-widest">Processing</span>
                              <span className="font-mono text-[9px] font-black text-white/70">
                                <AnimatedNumber value={stepPct} />%
                              </span>
                            </div>
                            <div className="h-[3px] bg-white/8 rounded-full overflow-hidden mb-3">
                              <motion.div
                                className="h-full bg-white rounded-full"
                                animate={{ width: `${stepPct}%` }}
                                transition={{ duration: 0.08 }}
                              />
                            </div>

                            {/* Output type badge */}
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[8px] text-white/25 uppercase tracking-wider">Output →</span>
                              <span className="font-mono text-[8px] font-bold text-white/60 border border-white/15 px-2 py-0.5 rounded-sm bg-white/4">
                                {meta.output}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── SECTION 4: Footer bar ──────────────────────────────── */}
          <div className="px-6 py-3 flex items-center justify-between">
            <div>
              <span className={`font-mono text-[9px] font-black tracking-widest uppercase ${isComplete ? "text-white/60" : "text-white/25"}`}>
                {isComplete
                  ? "◉ PIPELINE COMPLETE"
                  : isSynthesizing
                    ? "◉ SYNTHESIZING…"
                    : `◉ AGENT ${simActiveIndex + 1}/${totalAgents} ACTIVE`}
              </span>
              {state.totalDuration && (
                <span className="ml-3 font-mono text-[9px] text-white/20">
                  {(state.totalDuration / 1000).toFixed(1)}s total
                </span>
              )}
            </div>

            {sources.length > 0 && (
              <button
                onClick={() => setShowSources(true)}
                className="flex items-center gap-1.5 font-mono text-[9px] font-black uppercase tracking-widest px-3 py-1.5 border border-white/15 text-white/55 hover:bg-white hover:text-black transition-all duration-150 rounded-sm"
              >
                <Globe className="w-2.5 h-2.5" />
                Sources ({sources.length})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── SOURCES MODAL ────────────────────────────────────────────── */}
      <AnimatePresence>
        {showSources && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
            onClick={() => setShowSources(false)}
          >
            <motion.div
              initial={{ scale: 0.96, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 10 }}
              onClick={e => e.stopPropagation()}
              className="relative w-full max-w-md bg-[#060606] border border-white/10 shadow-2xl overflow-hidden font-mono"
            >
              <div className="h-[1px] bg-white/20" />
              <div className="p-5">
                <div className="flex items-center justify-between mb-4 border-b border-white/8 pb-3">
                  <div className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-white/50" />
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">
                      Research Sources
                    </span>
                    <span className="text-[9px] text-white/40 border border-white/10 px-2 py-0.5 font-bold">
                      {sources.length}
                    </span>
                  </div>
                  <button onClick={() => setShowSources(false)}
                    className="p-1 text-white/30 hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {sources.map((src: any, idx: number) => (
                    <a key={idx} href={src.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 border border-white/6 hover:border-white/20 hover:bg-white/4 group transition-all">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[8px] text-white/30 font-bold border border-white/10 px-1.5 py-0.5 shrink-0">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <span className="text-[10px] text-white/55 group-hover:text-white/80 transition-colors truncate">
                          {src.title || src.name}
                        </span>
                      </div>
                      <ExternalLink className="w-3 h-3 text-white/20 group-hover:text-white/50 transition-colors shrink-0 ml-2" />
                    </a>
                  ))}
                </div>

                <div className="mt-4 pt-3 border-t border-white/8 flex justify-end">
                  <button onClick={() => setShowSources(false)}
                    className="font-mono text-[9px] uppercase tracking-widest font-black text-white/40 hover:text-white px-4 py-2 border border-white/8 hover:border-white/20 transition-all">
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
