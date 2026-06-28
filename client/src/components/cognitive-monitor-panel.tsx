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
        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-300",
        active
          ? "bg-white/5 border-white/10 text-zinc-200"
          : "bg-black/20 border-white/5 text-zinc-600 opacity-50"
      )}
    >
      <Icon className="w-3 h-3 shrink-0" style={{ color: active ? color : "#52525b" }} />
      <span className="truncate flex-1">{label}</span>
      {active ? (
        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
      ) : (
        <XCircle className="w-3 h-3 text-zinc-700 shrink-0" />
      )}
    </motion.div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Complexity Bar
// ──────────────────────────────────────────────────────────────────────────────

function ComplexityBar({ score }: { score: number }) {
  const pct = Math.min(100, (score / 10) * 100);
  const color = score <= 3 ? "#34d399" : score <= 6 ? "#fbbf24" : "#f87171";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] text-zinc-400">
        <span>Complexity Score</span>
        <span style={{ color }} className="font-mono font-bold">{score.toFixed(1)}/10</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
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
    <div className="space-y-1">
      <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Pipeline Trace</p>
      <div className="bg-black/30 rounded-lg border border-white/5 p-2 space-y-0.5 max-h-32 overflow-y-auto font-mono">
        {logs.slice(-20).map((log, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[10px] text-zinc-400 leading-relaxed"
          >
            <span className="text-violet-400/60 mr-1">›</span>
            {log.replace(/^\*\*|\*\*$/g, "").replace(/^>\s*/, "").trim()}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Panel Inner Content (shared between desktop + mobile)
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
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-zinc-500 flex items-center gap-1">
            <Zap className="w-3 h-3" /> Agent Mask
          </span>
          <span className="text-amber-400 font-mono font-semibold">
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
          <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider mb-2">Agent Grid</p>
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
          className="text-[10px] text-zinc-600 text-center py-1"
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
            className="fixed right-4 top-1/2 -translate-y-1/2 z-50 md:flex hidden flex-col items-center gap-1.5 px-2.5 py-3 rounded-xl bg-neutral-950/80 backdrop-blur-md border border-white/10 shadow-lg shadow-black/40 hover:bg-neutral-900/80 hover:border-white/20 transition-all duration-200"
            aria-label="Toggle Cognitive Monitor"
          >
            {isProcessing && (
              <motion.div
                className="absolute inset-0 rounded-xl border border-violet-500/40 pointer-events-none"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
            <Brain className={cn("w-4 h-4", isProcessing ? "text-violet-400 animate-pulse" : "text-zinc-400")} />
            <span className="text-[9px] font-medium text-zinc-400 tracking-wider uppercase [writing-mode:vertical-rl] rotate-180">
              Monitor
            </span>
            <Activity className={cn("w-3 h-3", isProcessing ? "text-emerald-400" : "text-zinc-600")} />
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
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 md:hidden flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-950/90 backdrop-blur-md border border-white/10 shadow-lg shadow-black/40"
          >
            <Brain className={cn("w-3.5 h-3.5", isProcessing ? "text-violet-400 animate-pulse" : "text-zinc-400")} />
            <span className="text-xs font-medium text-zinc-300">Cognitive Monitor</span>
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
              className="fixed inset-0 z-40 bg-black/10 md:block hidden"
            />
            <motion.div
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-80 bg-neutral-950/60 backdrop-blur-md border-l border-white/5 shadow-2xl shadow-black/60 md:flex hidden flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Brain className="w-4 h-4 text-violet-400" />
                    {isProcessing && (
                      <motion.div
                        className="absolute -inset-1 rounded-full border border-violet-500/40 pointer-events-none"
                        animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-zinc-100">Apex Cognitive Monitor</p>
                    <p className="text-[10px] text-zinc-500">{phaseLabel}</p>
                  </div>
                </div>
                <button onClick={onToggle} className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-zinc-300 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-4">
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
              <div className="px-4 py-3 border-t border-white/5 shrink-0 flex items-center gap-2 text-[10px] text-zinc-600">
                <Terminal className="w-3 h-3" />
                <span>V2 Cognitive Monitor · Apex Omni</span>
                {isProcessing && (
                  <motion.div
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400"
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
              className="fixed bottom-0 left-0 right-0 z-50 bg-neutral-950/90 backdrop-blur-md border-t border-white/5 shadow-2xl rounded-t-2xl md:hidden flex flex-col max-h-[60vh] overflow-hidden"
            >
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1 bg-white/10 rounded-full" />
              </div>
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 shrink-0">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-violet-400" />
                  <p className="text-xs font-semibold text-zinc-100">Cognitive Monitor</p>
                  <span className="text-[10px] text-zinc-500">· {phaseLabel}</span>
                </div>
                <button onClick={onToggle} className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-500">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
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
