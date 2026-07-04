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

// ─── Agent metadata with Brand Colors ────────────────────────────────────────
const agentMeta: Record<string, {
  icon: React.ComponentType<any>;
  name: string;
  role: string;
  desc: string;
  output: string;
  color: string;
}> = {
  architect:    { icon: Layers,         name: "Architect",    role: "System Design",       desc: "Analyzing system structure, validating dependencies, and defining architecture blueprint.",          output: "Architecture Blueprint", color: "#10a37f" },
  coder:        { icon: Code2,          name: "Coder",        role: "Implementation",      desc: "Generating structural logic, drafting execution paths, writing clean optimized components.",        output: "Code Artifact",          color: "#3b82f6" },
  security:     { icon: Shield,         name: "Security",     role: "Threat Analysis",     desc: "Performing vulnerability scanning, assessing attack surfaces, verifying authorization checks.",      output: "Risk Assessment",         color: "#ef4444" },
  researcher:   { icon: Search,         name: "Researcher",   role: "Data Retrieval",      desc: "Querying search index, fetching high-quality organic results, validating external facts.",           output: "Research Report",        color: "#a855f7" },
  creative:     { icon: PaletteIcon,    name: "Creative",     role: "Conceptual Thinking", desc: "Synthesizing lateral concepts, brainstorming alternatives, planning creative execution.",            output: "Creative Brief",         color: "#f59e0b" },
  linguist:     { icon: MessageSquare,  name: "Linguist",     role: "Language Polish",     desc: "Calibrating linguistic accuracy, refining tone, checking grammar and multilingual precision.",       output: "Polished Draft",         color: "#10b981" },
  skeptic:      { icon: FlaskConical,   name: "Skeptic",      role: "Logic Validation",    desc: "Challenging assumptions, testing edge cases, detecting logical contradictions.",                    output: "Validation Report",       color: "#f43f5e" },
  psychologist: { icon: Brain,          name: "Psychologist", role: "User Empathy",        desc: "Modeling user intent, tailoring context, aligning response to user expectations.",                  output: "Context Model",          color: "#ec4899" },
  futurist:     { icon: TrendingUp,     name: "Futurist",     role: "Scalability",         desc: "Evaluating scalability, forecasting implications, future-proofing outputs for longevity.",          output: "Future Forecast",         color: "#06b6d4" },
  optimizer:    { icon: Zap,            name: "Optimizer",    role: "Performance",         desc: "Optimizing resource efficiency, reducing computational overhead, minimizing latency.",              output: "Optimization Plan",       color: "#84cc16" },
};

// Fixed agent order to match processOmniRequest execution order
const AGENT_ORDER = [
  "architect", "coder", "security", "researcher", "creative",
  "linguist", "skeptic", "psychologist", "futurist", "optimizer"
];

// ─── Custom palette icon ───────────────────────────────────────────────────
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

// ─── Animated number counter ───────────────────────────────────────────────
function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number>();
  const prevRef = useRef(0);

  useEffect(() => {
    const start = prevRef.current;
    prevRef.current = value;
    const duration = 500;
    const startTime = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(start + (value - start) * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value]);

  return <>{display}</>;
}

// ─── Typewriter Text component for Gradual Thinking ─────────────────────────
function TypewriterText({ text, speed = 15 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    setDisplayed("");
    let idx = 0;
    const interval = setInterval(() => {
      setDisplayed((prev) => prev + text.charAt(idx));
      idx++;
      if (idx >= text.length) {
        clearInterval(interval);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  return <span>{displayed}</span>;
}

// ─── Active step sub-progress simulation ──────────────────────────────────
function ActiveStepProgress({ agentKey, color }: { agentKey: string; color: string }) {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    setPct(0);
    const duration = 12000; // match the 1200ms minDisplayTime in processOmniRequest
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const computed = Math.min(95, Math.round((elapsed / duration) * 100));
      setPct(computed);
      if (elapsed >= duration) clearInterval(interval);
    }, 80);
    return () => clearInterval(interval);
  }, [agentKey]);

  return (
    <>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-mono text-[8px] text-white/30 uppercase tracking-widest">Processing</span>
        <span className="font-mono text-[9px] font-black text-white/70">
          <AnimatedNumber value={pct} />%
        </span>
      </div>
      <div className="h-[3px] bg-white/8 rounded-full overflow-hidden mb-3">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.08 }}
        />
      </div>
    </>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────
export function OmniStatusCard({ state }: OmniStatusCardProps) {
  const [showSources, setShowSources] = useState(false);

  const isComplete    = state.step === "complete";
  const isSynthesizing = state.step === "synthesizing";

  // Derive step statuses directly from real agent state
  const agentRows = AGENT_ORDER.map((key) => {
    const agentData = state.agents[key];
    const status = agentData?.status ?? "loading";
    return { key, agentData, status };
  });

  const completedCount = agentRows.filter(a => a.status === "complete").length;
  const draftingKey    = agentRows.find(a => a.status === "drafting")?.key ?? null;
  const totalAgents    = agentRows.length;

  // Filter rows: only show completed or active (drafting) agents (hide loading ones)
  const visibleAgentRows = agentRows
    .map((row, idx) => ({ ...row, originalIndex: idx }))
    .filter(row => row.status === "complete" || row.status === "drafting");

  // Progress calculation based on real state
  const progressValue = isComplete
    ? 100
    : isSynthesizing
      ? 95
      : Math.round(((completedCount) / totalAgents) * 85);

  const TOTAL_BLOCKS = 48;
  const activeBlocks = Math.round((progressValue / 100) * TOTAL_BLOCKS);

  // Brand color of the active agent
  const activeAgentColor = draftingKey ? agentMeta[draftingKey]?.color : "#ffffff";

  // Source extraction
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
    (text.match(/(https?:\/\/[^\s\)<\,'\"]+)/g) || []).forEach(url => {
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

  // Connector line fill: fills when agent above completes
  const getLineProgress = (index: number) => {
    if (isComplete) return 100;
    const thisAgent  = agentRows[index];
    const nextAgent  = agentRows[index + 1];
    if (!nextAgent) return 0;
    if (thisAgent.status === "complete" && nextAgent.status === "complete") return 100;
    if (thisAgent.status === "complete" && nextAgent.status === "drafting")  return 60;
    if (thisAgent.status === "complete") return 100;
    return 0;
  };

  return (
    <motion.div
      className="relative font-mono text-xs my-2 w-full"
      initial={{ opacity: 0, y: 8, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
    >
      {/* Container is borderless and transparent to span the chat naturally */}
      <div className="w-full bg-transparent border-0 shadow-none relative overflow-hidden">
        <div className="flex flex-col gap-0 divide-y divide-white/5">

          {/* ── SECTION 1: Header ── */}
          <div className="px-0 pt-3 pb-3">
            <div className="flex items-center justify-between mb-1">
              <motion.h2
                key={isComplete ? "done" : isSynthesizing ? "synth" : draftingKey ?? "init"}
                initial={{ opacity: 0, y: -3 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="font-mono text-[13px] font-black tracking-[0.22em] uppercase"
                style={{ color: isComplete ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.7)" }}
              >
                {isComplete
                  ? "◈ SYNTHESIS COMPLETE"
                  : isSynthesizing
                    ? "◈ AGGREGATING OUTPUTS"
                    : draftingKey
                      ? `◈ ${(agentMeta[draftingKey]?.name ?? draftingKey).toUpperCase()} AGENT ACTIVE`
                      : "◈ DISPATCHING AGENTS"}
              </motion.h2>
              <span className="font-mono text-[9px] tracking-[0.2em] text-white/20 uppercase">APEX·OMNI</span>
            </div>
            <p className="font-mono text-[10px] text-white/25 tracking-wider">
              {isComplete
                ? `${totalAgents} cognitive agents completed · ${state.totalDuration ? (state.totalDuration / 1000).toFixed(1) + "s" : "—"}`
                : `${completedCount} / ${totalAgents} agents done · sequential inference pipeline`}
            </p>
          </div>

          {/* ── SECTION 2: Pixel Progress Bar ── */}
          <div className="px-0 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[9px] tracking-[0.2em] text-white/30 uppercase font-bold">
                Cognitive Load
              </span>
              <span className={`font-mono text-[11px] font-black tracking-wider ${isComplete ? "text-white" : "text-white/60"}`}>
                <AnimatedNumber value={progressValue} />%
              </span>
            </div>
            <div className="flex gap-[2px] w-full">
              {Array.from({ length: TOTAL_BLOCKS }).map((_, i) => {
                const on = i < activeBlocks;
                return (
                  <div key={i} className="flex-1 flex flex-col gap-[2px]">
                    <div 
                      className="h-2 transition-all duration-300 rounded-sm"
                      style={{
                        backgroundColor: on
                          ? isComplete
                            ? "#ffffff"
                            : activeAgentColor
                          : "rgba(255,255,255,0.06)"
                      }}
                    />
                    <div className={`h-0.5 ${on ? (isComplete ? "bg-white/35" : "bg-white/10") : "bg-white/4"}`} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── SECTION 3: Vertical Timeline ── */}
          <div className="px-0 py-3 relative">
            <AnimatePresence initial={false}>
              {visibleAgentRows.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-6 text-center text-white/40 font-mono text-[11px]"
                >
                  Initializing cognitive pipeline...
                </motion.div>
              ) : (
                visibleAgentRows.map(({ key, agentData, status, originalIndex }, index) => {
                  const meta = agentMeta[key];
                  if (!meta) return null;
                  const AgentIcon = meta.icon;

                  const isDone    = status === "complete";
                  const isActive  = status === "drafting";
                  const isLast    = index === visibleAgentRows.length - 1;
                  const lineProgress = getLineProgress(originalIndex);

                  return (
                    <motion.div
                      key={key}
                      layout
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{
                        type: "spring",
                        stiffness: 280,
                        damping: 26
                      }}
                      className="relative flex gap-0 mb-1"
                    >
                      {/* ── Left: node + vertical connector ── */}
                      <div className="flex flex-col items-center w-8 shrink-0">
                        {/* Node */}
                        <div className="relative z-10 my-1">
                          {isDone ? (
                            <motion.div
                              initial={{ scale: 0.4, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ type: "spring", stiffness: 600, damping: 22 }}
                              className="w-5 h-5 rounded-full flex items-center justify-center border"
                              style={{ backgroundColor: meta.color, borderColor: meta.color }}
                            >
                              <CheckCircle2 className="w-3 h-3 text-black" strokeWidth={3} />
                            </motion.div>
                          ) : isActive ? (
                            <div className="relative w-5 h-5 flex items-center justify-center">
                              <span className="absolute inset-0 rounded-full animate-ping" style={{ backgroundColor: `${meta.color}25` }} />
                              <div className="w-5 h-5 rounded-full border-2 bg-black flex items-center justify-center" style={{ borderColor: meta.color }}>
                                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: meta.color }} />
                              </div>
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full border border-white/12 bg-transparent flex items-center justify-center">
                              <span className="font-mono text-[8px] font-bold text-white/20">{originalIndex + 1}</span>
                            </div>
                          )}
                        </div>

                        {/* Vertical connector */}
                        {!isLast && (
                          <div className="w-[1px] flex-1 bg-white/6 relative overflow-hidden min-h-[28px]">
                            <motion.div
                              className="absolute top-0 left-0 right-0"
                              style={{ backgroundColor: meta.color }}
                              initial={{ height: "0%" }}
                              animate={{ height: `${lineProgress}%` }}
                              transition={{ duration: 0.5, ease: "easeOut" }}
                            />
                          </div>
                        )}
                      </div>

                      {/* ── Right: content ── */}
                      <div className={`flex-1 min-w-0 pb-3 pl-3 ${isLast ? "pb-1" : ""}`}>
                        {/* Step header */}
                        <div className="flex items-center justify-between py-1">
                          <div className="flex items-center gap-2">
                            <AgentIcon 
                              className={`w-3.5 h-3.5 shrink-0 transition-colors duration-300 ${
                                isActive ? "animate-pulse" : ""
                              }`} 
                              style={{ color: isDone || isActive ? meta.color : "rgba(255,255,255,0.18)" }}
                            />
                            <span 
                              className="font-mono text-[11px] font-bold tracking-wider uppercase transition-colors duration-300"
                              style={{ color: isDone || isActive ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.22)" }}
                            >
                              {meta.name}
                            </span>
                            <span 
                              className="font-mono text-[9px] tracking-wide lowercase transition-colors duration-300 hidden sm:inline"
                              style={{ color: isDone || isActive ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.12)" }}
                            >
                              ({meta.role})
                            </span>
                          </div>

                          {/* Status badge */}
                          <AnimatePresence mode="wait">
                            <motion.span
                              key={status}
                              initial={{ opacity: 0, scale: 0.7 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.15 }}
                              className="font-mono text-[8px] font-black uppercase tracking-widest px-2 py-0.5"
                              style={{
                                backgroundColor: isActive ? meta.color : "rgba(255,255,255,0.06)",
                                color: isActive ? "#000000" : "rgba(255,255,255,0.4)"
                              }}
                            >
                              {isDone ? "done" : isActive ? "live" : String(originalIndex + 1).padStart(2, "0")}
                            </motion.span>
                          </AnimatePresence>
                        </div>

                        {/* Active step expansion */}
                        <AnimatePresence>
                          {isActive && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2, ease: "easeOut" }}
                              className="overflow-hidden"
                            >
                              <div className="mt-1.5 mr-2 p-3.5 border border-white/10 bg-white/3">
                                {/* Description using Typewriter effect */}
                                <p className="font-mono text-[10px] text-white/60 leading-relaxed mb-3">
                                  <TypewriterText text={meta.desc} />
                                  <motion.span
                                    animate={{ opacity: [1, 0, 1] }}
                                    transition={{ repeat: Infinity, duration: 1.0 }}
                                    className="inline-block ml-1"
                                    style={{ color: meta.color }}
                                  >_</motion.span>
                                </p>

                                {/* Sub-progress */}
                                <ActiveStepProgress agentKey={key} color={meta.color} />

                                {/* Output type */}
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[8px] text-white/25 uppercase tracking-wider">Output →</span>
                                  <span className="font-mono text-[8px] font-bold text-white/60 border border-white/15 px-2 py-0.5 bg-white/4">
                                    {meta.output}
                                  </span>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Completed step snippet (expanded summary card for maximum context width) */}
                        {isDone && agentData?.response && (
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-1.5 mr-2 p-3 border border-white/5 bg-white/[0.01] rounded-lg max-w-full hover:border-white/10 transition-all duration-200"
                          >
                            <span className="font-mono text-[8px] uppercase tracking-wider block mb-1" style={{ color: meta.color }}>
                              {meta.name} Insights Summary
                            </span>
                            <p className="font-sans text-[10.5px] text-white/50 leading-relaxed line-clamp-3">
                              {agentData.response}
                            </p>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>

          {/* ── SECTION 4: Footer ── */}
          <div className="px-0 py-3 flex items-center justify-between">
            <div>
              <span className={`font-mono text-[9px] font-black tracking-widest uppercase ${isComplete ? "text-white/60" : "text-white/25"}`}>
                {isComplete
                  ? "◉ PIPELINE COMPLETE"
                  : isSynthesizing
                    ? "◉ SYNTHESIZING OUTPUTS…"
                    : draftingKey
                      ? `◉ RUNNING ${(agentMeta[draftingKey]?.name ?? draftingKey).toUpperCase()}`
                      : "◉ INITIALIZING…"}
              </span>
              {state.totalDuration && isComplete && (
                <span className="ml-3 font-mono text-[9px] text-white/20">
                  {(state.totalDuration / 1000).toFixed(1)}s total
                </span>
              )}
            </div>

            {sources.length > 0 && (
              <button
                onClick={() => setShowSources(true)}
                className="flex items-center gap-1.5 font-mono text-[9px] font-black uppercase tracking-widest px-3 py-1.5 border border-white/15 text-white/55 hover:bg-white hover:text-black transition-all duration-150"
              >
                <Globe className="w-2.5 h-2.5" />
                Sources ({sources.length})
              </button>
            )}
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
                  <button onClick={() => setShowSources(false)} className="p-1 text-white/30 hover:text-white transition-colors">
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
