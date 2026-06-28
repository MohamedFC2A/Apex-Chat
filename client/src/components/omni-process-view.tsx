import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, Brain, Sparkles, Cpu, Lightbulb } from "lucide-react";
import { OmniState, AGENT_CONFIGS_EXPORT } from "@/lib/omni-service";
import { cn } from "@/lib/utils";

interface AgentCardProps {
  agentId: string;
  agent: OmniState["agents"][string];
  isActive: boolean;
}

function AgentCard({ agentId, agent, isActive }: AgentCardProps) {
  const config = AGENT_CONFIGS_EXPORT[agentId as keyof typeof AGENT_CONFIGS_EXPORT];
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ 
        opacity: 1, 
        scale: 1, 
        y: 0,
        transition: { delay: parseInt(agentId) * 0.1 }
      }}
      className={cn(
        "relative p-4 rounded-xl border-2 backdrop-blur-xl transition-all duration-500 overflow-hidden",
        agent.status === "loading" && "border-gray-600/50 bg-gray-900/30",
        agent.status === "drafting" && "border-blue-500/50 bg-blue-950/20",
        agent.status === "complete" && "border-green-500/50 bg-green-950/20 shadow-lg shadow-green-500/20"
      )}
    >
      {/* Background glow effect */}
      <div 
        className="absolute inset-0 opacity-20 blur-xl"
        style={{
          background: agent.status === "complete" 
            ? "radial-gradient(circle, rgba(34, 197, 94, 0.5) 0%, transparent 70%)"
            : agent.status === "drafting"
            ? "radial-gradient(circle, rgba(59, 130, 246, 0.5) 0%, transparent 70%)"
            : "radial-gradient(circle, rgba(156, 163, 175, 0.3) 0%, transparent 70%)"
        }}
      />
      
      {/* Agent header */}
      <div className="relative z-10 flex items-center gap-3 mb-3">
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold"
          style={{ backgroundColor: config.color + "20", color: config.color }}
        >
          {agent.status === "loading" && <Loader2 className="w-5 h-5 animate-spin" />}
          {agent.status === "drafting" && <Brain className="w-5 h-5 animate-pulse" />}
          {agent.status === "complete" && <Check className="w-5 h-5" />}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">{config.name}</h3>
          <p className="text-xs text-gray-400 capitalize">{agent.status}</p>
        </div>
      </div>
      
      {/* Draft content */}
      <AnimatePresence mode="wait">
        {agent.status === "drafting" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="relative z-10"
          >
            <div className="text-xs font-mono text-green-400/80 mb-2">
              {agent.draft}
            </div>
            {/* Matrix-style scrolling effect */}
            <div className="h-8 overflow-hidden relative">
              <motion.div
                className="text-[10px] font-mono text-green-400/40"
                animate={{ y: [0, -32] }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              >
                {Array.from({ length: 8 }, (_, i) => (
                  <div key={i} className="whitespace-nowrap">
                    {Math.random() > 0.5 ? "01001001 01101110 01110011 01101001 01100111 01101000 01110100" : "Processing... Analyzing... Synthesizing..."}
                  </div>
                ))}
              </motion.div>
            </div>
          </motion.div>
        )}
        
        {agent.status === "complete" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 flex items-center gap-2 text-green-400"
          >
            <Check className="w-4 h-4" />
            <span className="text-xs font-medium">Analysis Complete</span>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Pulse animation for active states */}
      {isActive && (agent.status === "loading" || agent.status === "drafting") && (
        <motion.div
          className="absolute inset-0 rounded-xl border-2"
          style={{ borderColor: config.color }}
          animate={{ scale: [1, 1.05, 1], opacity: [1, 0.5, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        />
      )}
    </motion.div>
  );
}

function SynthesisCard({ isSynthesizing }: { isSynthesizing: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ 
        opacity: 1, 
        scale: 1,
        transition: { delay: 0.3 }
      }}
      className={cn(
        "relative p-4 rounded-xl border-2 backdrop-blur-xl transition-all duration-500 overflow-hidden",
        !isSynthesizing && "border-gray-600/50 bg-gray-900/30",
        isSynthesizing && "border-purple-500/50 bg-purple-950/20 shadow-lg shadow-purple-500/20"
      )}
    >
      {/* Background glow effect */}
      <div 
        className="absolute inset-0 opacity-20 blur-xl"
        style={{
          background: isSynthesizing
            ? "radial-gradient(circle, rgba(168, 85, 247, 0.5) 0%, transparent 70%)"
            : "radial-gradient(circle, rgba(156, 163, 175, 0.3) 0%, transparent 70%)"
        }}
      />
      
      {/* Synthesis content */}
      <div className="relative z-10 flex items-center justify-center">
        {isSynthesizing ? (
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <motion.div
                className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center"
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="w-8 h-8 text-white" />
              </motion.div>
              {/* Orbiting particles */}
              {[0, 120, 240].map((angle) => (
                <motion.div
                  key={angle}
                  className="absolute w-3 h-3 bg-white rounded-full"
                  style={{ originX: 0.5, originY: 0.5 }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  initial={{ rotate: angle }}
                >
                  <motion.div
                    className="w-3 h-3 bg-white rounded-full"
                    animate={{ scale: [1, 1.5, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                  />
                </motion.div>
              ))}
            </div>
            <div className="text-center">
              <h3 className="text-sm font-semibold text-white mb-1">Synthesizing</h3>
              <p className="text-xs text-gray-400 animate-pulse">
                Merging insights from all agents...
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-800/50 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Synthesis</h3>
              <p className="text-xs text-gray-400">Waiting for agents...</p>
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
  const isComplete = state.step === "complete";
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={isInMonitor ? "w-full" : "w-full max-w-4xl mx-auto mb-6"}
    >
      {/* Header */}
      <div className="text-center mb-6">
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 backdrop-blur-sm"
        >
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-purple-300">
            {state.step === "dispatch" && "Initializing Neural Network..."}
            {state.step === "drafting" && "Multi-Agent Analysis in Progress..."}
            {state.step === "synthesizing" && "Synthesizing Collective Intelligence..."}
            {state.step === "complete" && "Apex Omni Achieved"}
          </span>
        </motion.div>
      </div>
      
      {/* Agent Grid - 3 agents + synthesis */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
