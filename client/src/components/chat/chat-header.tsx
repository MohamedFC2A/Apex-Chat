import { motion } from "framer-motion";
import { PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AIModel } from "@shared/schema";
import { ModelSelector } from "@/components/model-selector/model-selector";

export interface ChatHeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  selectedModel: AIModel;
  onSelectModel: (model: AIModel) => void;
  isGenerating: boolean;
  isModelLocked: boolean;
}

/**
 * Premium chat header with glass-morphism background,
 * brand badge, sidebar toggle, and model selector.
 * Zero inline styles — all via Tailwind + CSS variables.
 */
export function ChatHeader({
  sidebarOpen,
  onToggleSidebar,
  selectedModel,
  onSelectModel,
  isGenerating,
  isModelLocked,
}: ChatHeaderProps) {
  return (
    <motion.header
      className="flex-shrink-0 relative z-20"
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="apex-header-bg px-3 py-2.5 md:px-5 md:py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          {/* ── Left Section: Sidebar toggle + Brand + Model ── */}
          <div className="flex flex-1 items-center gap-2 min-w-0">
            {/* Sidebar toggle — shown when sidebar is closed */}
            {!sidebarOpen && (
              <motion.div
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.18 }}
              >
                <button
                  onClick={onToggleSidebar}
                  className="h-9 w-9 flex-shrink-0 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/8 hover:border-white/15 text-white/50 hover:text-white/80 transition-all duration-150"
                  aria-label="فتح القائمة"
                >
                  <PanelLeft className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {/* Brand badge — shown when sidebar is open (desktop) */}
            {sidebarOpen && (
              <motion.div
                className="hidden md:flex items-center gap-2 mr-1 shrink-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, rgba(99,102,241,0.3), rgba(168,85,247,0.3))",
                    border: "1px solid rgba(139,92,246,0.3)",
                  }}
                >
                  <span className="font-mono text-[11px] font-black text-white tracking-tighter">
                    ◆
                  </span>
                </div>
                <span
                  className="font-display text-sm font-bold tracking-[0.15em] uppercase hidden lg:inline"
                  style={{
                    background: "linear-gradient(135deg, #818cf8, #c084fc, #e9d5ff)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  APEX
                </span>
              </motion.div>
            )}

            {/* Model Selector */}
            <div className="flex-1 min-w-[160px] sm:flex-none sm:min-w-[200px]">
              <ModelSelector
                selectedModel={selectedModel}
                onSelectModel={onSelectModel}
                disabled={isGenerating}
                isLocked={isModelLocked}
              />
            </div>
          </div>

          {/* ── Right Section: (reserved for future actions) ── */}
          <div className="flex items-center gap-2 shrink-0" />
        </div>
      </div>
    </motion.header>
  );
}
