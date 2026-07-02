import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Brain,
  ChevronDown,
  ChevronUp,
  Activity,
  Shield,
  Code2,
  Search,
  Lightbulb,
  Zap,
  CheckCircle2,
  XCircle,
  Terminal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { OmniProcessView } from "@/components/omni-process-view";
import type { OmniState } from "@/lib/omni-service";
import type { AgentMaskConfiguration } from "@shared/types/v2";

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export interface CognitiveMonitorPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  omniState: OmniState | null;
  isProcessing: boolean;
  pipelineLogs: string[];
  maskConfig: AgentMaskConfiguration | null;
  complexityScore: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// Agent Mask Status Badge
// ──────────────────────────────────────────────────────────────────────────────

const AGENT_META = {
  researchFacts:    { label: "Research Agent",  Icon: Search,    color: "#60a5fa" },
  codeImplementation: { label: "Code Agent",   Icon: Code2,     color: "#34d399" },
  securityAnalysis: { label: "Security Agent",  Icon: Shield,    color: "#f87171" },
  creativeSolutions: { label: "Creative Agent", Icon: Lightbulb, color: "#a78bfa" },
} as const;

function AgentMaskBadge({
  agentKey,
  active,
}: {
  agentKey: keyof AgentMaskConfiguration;
  active: boolean;
}) {
  const { label, Icon, color } = AGENT_META[agentKey];
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded border transition-all duration-300 font-mono text-[10px]",
        active
          ? "bg-zinc-900/50 border-zinc-800 text-zinc-200"
          : "bg-black/40 border-zinc-900 text-zinc-600 opacity-50"
      )}
    >
      <Icon className="w-3 h-3 shrink-0" style={{ color: active ? color : "#52525b" }} />
      <span className="truncate flex-1 font-bold uppercase tracking-wider">{label}</span>
      {active ? (
        <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
      ) : (
        <XCircle className="w-3 h-3 text-zinc-700 shrink-0" />
      )}
    </motion.div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Complexity Bar (Retro Pixel Progress Bar)
// ──────────────────────────────────────────────────────────────────────────────

function ComplexityBar({ score }: { score: number }) {
  const colorClass = score <= 3 ? "bg-emerald-500" : score <= 6 ? "bg-amber-500" : "bg-red-500";
  const textColorClass = score <= 3 ? "text-emerald-400" : score <= 6 ? "text-amber-400" : "text-red-400";
  
  const totalBlocks = 10;
  const activeBlocks = Math.round((score / 10) * totalBlocks);

  return (
    <div className="space-y-1.5 font-mono select-none">
      <div className="flex items-center justify-between text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
        <span>Complexity Score</span>
        <span className={cn("font-bold", textColorClass)}>{score.toFixed(1)}/10</span>
      </div>
      <div className="flex gap-[2px] w-full">
        {Array.from({ length: totalBlocks }).map((_, i) => {
          const isActive = i < activeBlocks;
          return (
            <div
              key={i}
              className={cn(
                "flex-1 h-3 transition-all duration-300",
                isActive ? colorClass : "bg-zinc-900"
              )}
            />
          );
        })}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Pipeline Log Stream
// ──────────────────────────────────────────────────────────────────────────────

function PipelineLogStream({ logs }: { logs: string[] }) {
  if (logs.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Pipeline Trace</p>
      <div className="bg-black/60 rounded border border-zinc-800/80 p-3 space-y-1 max-h-32 overflow-y-auto font-mono scrollbar-none">
        {logs.slice(-20).map((log, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[9px] text-zinc-400 leading-relaxed font-mono"
          >
            <span className="text-zinc-600 mr-1.5">›</span>
            {log.replace(/^\*\*|\*\*$/g, "").replace(/^>\s*/, "").trim()}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Panel Inner Content
// ──────────────────────────────────────────────────────────────────────────────

function MonitorContent({
  maskConfig,
  complexityScore,
  omniState,
  pipelineLogs,
  isProcessing,
  autoCollapseQueued,
  compact = false,
}: {
  maskConfig: AgentMaskConfiguration | null;
  complexityScore: number;
  omniState: OmniState | null;
  pipelineLogs: string[];
  isProcessing: boolean;
  autoCollapseQueued: boolean;
  compact?: boolean;
}) {
  const maskedCount = maskConfig ? Object.values(maskConfig).filter(v => !v).length : 0;
  const totalAgents = maskConfig ? Object.keys(maskConfig).length : 0;

  return (
    <div className={cn("space-y-4", compact && "space-y-3")}>
      {/* Agent Mask Summary */}
      {maskConfig && (
        <div className="flex items-center justify-between text-[9px] font-mono font-bold uppercase tracking-wider">
          <span className="text-zinc-500 flex items-center gap-1">
            <Zap className="w-3 h-3" /> Agent Mask
          </span>
          <span className="text-amber-400 font-mono">
            {maskedCount}/{totalAgents} masked
          </span>
        </div>
      )}

      {/* Agent Mask Grid */}
      {maskConfig && (
        <div className={cn("space-y-1.5", compact && "grid grid-cols-2 gap-1.5 space-y-0")}>
          {(Object.keys(maskConfig) as Array<keyof AgentMaskConfiguration>).map(key => (
            <AgentMaskBadge key={key} agentKey={key} active={maskConfig[key]} />
          ))}
        </div>
      )}

      {/* Complexity Bar */}
      {complexityScore > 0 && <ComplexityBar score={complexityScore} />}

      {/* OmniState Agent Cards */}
      {omniState && !compact && (
        <div>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-2">Agent Grid</p>
          <OmniProcessView state={omniState} isInMonitor />
        </div>
      )}

      {/* Pipeline Log Stream */}
      <PipelineLogStream logs={pipelineLogs} />

      {/* Auto-collapse notice */}
      {!isProcessing && autoCollapseQueued && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[9px] font-mono text-zinc-600 text-center py-1 uppercase tracking-widest font-bold"
        >
          Auto-closing in 5s...
        </motion.p>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main Panel Export
// ──────────────────────────────────────────────────────────────────────────────

export function CognitiveMonitorPanel({
  isOpen,
  onToggle,
  omniState,
  isProcessing,
  pipelineLogs,
  maskConfig,
  complexityScore,
}: CognitiveMonitorPanelProps) {
  const [autoCollapseQueued, setAutoCollapseQueued] = useState(false);

  // Auto-collapse 5s after processing ends
  useEffect(() => {
    if (!isProcessing && isOpen && !autoCollapseQueued) {
      setAutoCollapseQueued(true);
      const timer = setTimeout(() => {
        onToggle();
        setAutoCollapseQueued(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isProcessing, isOpen, onToggle, autoCollapseQueued]);

  useEffect(() => {
    if (isOpen) setAutoCollapseQueued(false);
  }, [isOpen]);

  const hasActivity = isProcessing || (omniState !== null) || pipelineLogs.length > 0;

  const phaseLabel =
    omniState?.step === "dispatch"      ? "Initializing..."
    : omniState?.step === "drafting"    ? "Multi-Agent Drafting"
    : omniState?.step === "synthesizing"? "Synthesizing Intelligence"
    : omniState?.step === "complete"    ? "Pipeline Complete"
    : isProcessing                      ? "Processing..."
    : "Idle";

  return (
    <>
      {/* ── Desktop Floating Toggle Button ── */}
      <AnimatePresence>
        {hasActivity && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 20 }}
            onClick={onToggle}
            className="fixed right-4 top-1/2 -translate-y-1/2 z-50 md:flex hidden flex-col items-center gap-2 px-2.5 py-3 rounded border border-zinc-800 bg-neutral-950 shadow-2xl hover:bg-zinc-900 transition-all duration-200"
            aria-label="Toggle Cognitive Monitor"
          >
            <Brain className={cn("w-4 h-4", isProcessing ? "text-violet-400 animate-pulse" : "text-zinc-500")} />
            <span className="text-[9px] font-bold text-zinc-500 tracking-[0.1em] uppercase [writing-mode:vertical-rl] rotate-180 font-mono">
              Monitor
            </span>
            <Activity className={cn("w-3 h-3", isProcessing ? "text-emerald-400" : "text-zinc-700")} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Mobile Bottom Trigger ── */}
      <AnimatePresence>
        {hasActivity && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={onToggle}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 md:hidden flex items-center gap-2 px-4 py-2 rounded border border-zinc-800 bg-neutral-950 shadow-2xl"
          >
            <Brain className={cn("w-3.5 h-3.5", isProcessing ? "text-violet-400 animate-pulse" : "text-zinc-500")} />
            <span className="text-xs font-bold font-mono text-zinc-300 uppercase tracking-wider">Cognitive Monitor</span>
            {isOpen ? <ChevronDown className="w-3 h-3 text-zinc-500" /> : <ChevronUp className="w-3 h-3 text-zinc-500" />}
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Desktop Right Panel ── */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={onToggle}
              className="fixed inset-0 z-40 bg-black/30 md:block hidden"
            />
            <motion.div
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-80 bg-neutral-950 border-l border-zinc-900 shadow-2xl md:flex hidden flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-zinc-900 shrink-0">
                <div className="flex items-center gap-2.5">
                  <Brain className="w-4 h-4 text-violet-400 shrink-0" />
                  <div>
                    <p className="text-xs font-black text-white uppercase tracking-widest font-mono">Cognitive Monitor</p>
                    <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-mono font-bold">{phaseLabel}</p>
                  </div>
                </div>
                <button onClick={onToggle} className="p-1.5 rounded hover:bg-zinc-900 text-zinc-500 hover:text-white transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-4 scrollbar-none">
                <MonitorContent
                  maskConfig={maskConfig}
                  complexityScore={complexityScore}
                  omniState={omniState}
                  pipelineLogs={pipelineLogs}
                  isProcessing={isProcessing}
                  autoCollapseQueued={autoCollapseQueued}
                />
              </div>

              {/* Footer */}
              <div className="px-4 py-3.5 border-t border-zinc-900 shrink-0 flex items-center gap-2 text-[9px] text-zinc-500 font-mono font-bold uppercase tracking-wider">
                <Terminal className="w-3.5 h-3.5" />
                <span>V2 MONITOR · APEX OMNI</span>
                {isProcessing && (
                  <motion.div
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  />
                )}
              </div>
            </motion.div>

            {/* ── Mobile Bottom Drawer ── */}
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-neutral-950 border-t border-zinc-900 shadow-2xl rounded-t-xl md:hidden flex flex-col max-h-[60vh] overflow-hidden"
            >
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1 bg-zinc-800 rounded-full" />
              </div>
              <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-900 shrink-0">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-violet-400" />
                  <p className="text-xs font-black text-white font-mono uppercase tracking-wider">Cognitive Monitor</p>
                  <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest font-bold">· {phaseLabel}</span>
                </div>
                <button onClick={onToggle} className="p-1.5 rounded hover:bg-zinc-900 text-zinc-500">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 scrollbar-none">
                <MonitorContent
                  maskConfig={maskConfig}
                  complexityScore={complexityScore}
                  omniState={omniState}
                  pipelineLogs={pipelineLogs}
                  isProcessing={isProcessing}
                  autoCollapseQueued={autoCollapseQueued}
                  compact
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
