import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, Brain, Sparkles, Cpu } from "lucide-react";
import { OmniState, AGENT_CONFIGS_EXPORT } from "@/lib/omni-service";
import { cn } from "@/lib/utils";

interface AgentCardProps {
  agentId: string;
  agent: OmniState["agents"][string];
  isActive: boolean;
}

function AgentCard({ agentId, agent, isActive }: AgentCardProps) {
  const config = AGENT_CONFIGS_EXPORT[agentId as keyof typeof AGENT_CONFIGS_EXPORT];
  
  const isDone = agent.status === "complete";
  const isDrafting = agent.status === "drafting";
  const isLoading = agent.status === "loading";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        transition: { delay: parseInt(agentId) * 0.05 }
      }}
      className={cn(
        "relative p-4 rounded border font-mono transition-all duration-300",
        isLoading && "border-zinc-900 bg-neutral-950/40 text-zinc-500",
        isDrafting && "border-amber-500 bg-neutral-950 text-amber-500 animate-pulse",
        isDone && "border-emerald-500 bg-neutral-950 text-emerald-400"
      )}
    >
      {/* Agent header */}
      <div className="relative z-10 flex items-center gap-3 mb-3">
        <div 
          className={cn(
            "w-8 h-8 rounded border flex items-center justify-center font-bold text-xs",
            isDone ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" :
            isDrafting ? "border-amber-500 bg-amber-500/10 text-amber-400 animate-pulse" :
            "border-zinc-900 bg-zinc-950 text-zinc-600"
          )}
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin text-zinc-600" />}
          {isDrafting && <Brain className="w-4 h-4 text-amber-500" />}
          {isDone && <Check className="w-4 h-4 text-emerald-400" />}
        </div>
        <div>
          <h3 className="text-xs font-black text-white uppercase tracking-wider font-mono">{config.name}</h3>
          <p className="text-[8px] uppercase tracking-widest font-mono text-zinc-500 font-bold">{agent.status}</p>
        </div>
      </div>
      
      {/* Draft content */}
      <AnimatePresence mode="wait">
        {isDrafting && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="relative z-10"
          >
            <div className="text-[10px] font-mono text-amber-400/80 mb-2 leading-relaxed">
              {agent.draft}
            </div>
            {/* Simple monospaced text scroll */}
            <div className="h-6 overflow-hidden relative">
              <motion.div
                className="text-[9px] font-mono text-amber-500/30"
                animate={{ y: [0, -20] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
              >
                <div>[01001001] PROCESSING...</div>
                <div>[01101110] ANALYZING...</div>
                <div>[01110011] SYNTHESIZING...</div>
              </motion.div>
            </div>
          </motion.div>
        )}
        
        {isDone && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 flex items-center gap-1.5 text-emerald-400 text-[10px] font-bold tracking-wider"
          >
            <Check className="w-3.5 h-3.5" />
            <span>ANALYSIS COMPLETE</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SynthesisCard({ isSynthesizing }: { isSynthesizing: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.99 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "relative p-5 rounded border font-mono transition-all duration-300",
        isSynthesizing ? "border-amber-500 bg-neutral-950" : "border-zinc-900 bg-neutral-950/40"
      )}
    >
      {/* Synthesis content */}
      <div className="relative z-10 flex items-center justify-center font-mono">
        {isSynthesizing ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded border border-amber-500 bg-amber-500/5 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
            </div>
            <div className="text-center font-mono select-none">
              <h3 className="text-xs font-black text-white uppercase tracking-widest mb-0.5">SYNTHESIZING</h3>
              <p className="text-[9px] text-amber-500 font-bold uppercase tracking-wider animate-pulse">
                Merging insights from all agents...
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 font-mono">
            <div className="w-8 h-8 rounded border border-zinc-900 bg-zinc-950 flex items-center justify-center">
              <Cpu className="w-4 h-4 text-zinc-600" />
            </div>
            <div>
              <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest">SYNTHESIS</h3>
              <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider">Awaiting agents...</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

interface OmniProcessViewProps {
  state: OmniState;
  /** When true, renders inside the CognitiveMonitorPanel — uses full-width layout */
  isInMonitor?: boolean;
}

export function OmniProcessView({ state, isInMonitor = false }: OmniProcessViewProps) {
  const isSynthesizing = state.step === "synthesizing";
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className={isInMonitor ? "w-full font-mono" : "w-full max-w-4xl mx-auto mb-6 font-mono"}
    >
      {/* Header Badge */}
      <div className="text-center mb-5 select-none font-mono">
        <motion.div
          initial={{ scale: 0.98 }}
          animate={{ scale: 1 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-zinc-800 bg-zinc-950"
        >
          <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-[10px] font-black text-white uppercase tracking-widest">
            {state.step === "dispatch" && "Initializing Neural Network..."}
            {state.step === "drafting" && "Multi-Agent Analysis..."}
            {state.step === "synthesizing" && "Synthesizing Intelligence..."}
            {state.step === "complete" && "Apex Omni Achieved"}
          </span>
        </motion.div>
      </div>
      
      {/* Agent Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        {Object.entries(state.agents).map(([agentId, agent]) => (
          <AgentCard
            key={agentId}
            agentId={agentId}
            agent={agent}
            isActive={state.step === "drafting"}
          />
        ))}
      </div>
      
      {/* Synthesis Card */}
      <SynthesisCard isSynthesizing={isSynthesizing} />
    </motion.div>
  );
}
