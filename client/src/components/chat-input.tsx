import { useState, useRef, useEffect } from "react";
import { useChatStore } from "@/lib/store";
import { useSubscriptionStore } from "@/lib/subscription-store";
import { useFeatureToggleStore } from "@/lib/feature-toggle-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  ArrowUp, Square, Brain, Search, Code2, Lock, Mic, Globe
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { UnboundState } from "@/lib/unbound-service";
import type { OmniState } from "@/lib/omni-service";

type UnboundChoice = {
  questionId: string;
  title: string;
  description: string;
  theme: string;
  config?: Record<string, any>;
};

interface ChatInputProps {
  onSendMessage: (message: string, displayMessage?: string) => void;
  onStopGenerating?: () => void;
  onOpenSources?: () => void;
  hasSources?: boolean;
  sourcesCount?: number;
  lastError?: string | null;
  unboundState?: UnboundState | null;
  onSelectUnboundChoices?: (choices: UnboundChoice[]) => void;
  conversationId?: string | null;
  omniState?: OmniState | null;
}

export function ChatInput({ 
  onSendMessage, 
  onStopGenerating,
  onOpenSources,
  hasSources = false,
  sourcesCount = 0,
  lastError = null,
  unboundState = null,
  onSelectUnboundChoices,
  conversationId = null,
  omniState = null
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Loaded reasoningLevel and setReasoningLevel from store
  const { 
    isGenerating, 
    serviceMode, 
    selectedModel, 
    setSelectedModel, 
    activeQuizProgress, 
    activePdfProgress,
    reasoningLevel,
    setReasoningLevel
  } = useChatStore();

  const { canUseDeepResearch, canUseGodMode } = useSubscriptionStore();
  const {
    thinking,
    deepResearch,
    godMode,
    setDeepResearch,
    setGodMode,
  } = useFeatureToggleStore();

  // Sync state variables
  useEffect(() => {
    const isSearchModel = selectedModel === "apex-elite";
    const isGodModel = selectedModel === "apex-unbound";
    setDeepResearch(isSearchModel);
    setGodMode(isGodModel);
  }, [selectedModel, setDeepResearch, setGodMode]);

  // Self-growing textbox
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const handleSubmit = () => {
    if (isGenerating || message.trim() === "") return;
    onSendMessage(message);
    setMessage("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const hasText = message.trim().length > 0;
  const isArabic = /[\u0600-\u06FF]/.test(message);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-4 md:pb-6 relative z-10">
      
      {/* ── Main Chat Input Area ── */}
      <div 
        className="relative flex flex-col gap-2.5 p-3.5 rounded-xl bg-neutral-950 border border-zinc-900 focus-within:border-zinc-800 transition-all duration-200"
      >
        {/* Progress Bar during PDF/Quiz generation */}
        {(activeQuizProgress || activePdfProgress) && (
          <div 
            className={cn(
              "absolute top-0 h-[2px] rounded-t-xl z-10 transition-all duration-300 ease-out bg-zinc-400", 
              typeof document !== "undefined" && (document.documentElement.dir === "rtl" || document.dir === "rtl")
                ? "right-0 left-auto" 
                : "left-0 right-auto"
            )} 
            style={{ 
              width: `${Math.max(
                activeQuizProgress 
                  ? (activeQuizProgress.current / activeQuizProgress.total) * 100 
                  : (activePdfProgress!.current / activePdfProgress!.total) * 100, 
                5
              )}%` 
            }}
          />
        )}

        {/* Input text box row */}
        <div className="flex items-end gap-2">
          {/* Micro-phone toggle capsule */}
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0 w-8 h-8 rounded-full bg-zinc-900/40 border border-zinc-850 hover:border-zinc-700 hover:bg-zinc-900 text-zinc-400 hover:text-white transition-all duration-200"
              disabled={isGenerating}
            >
              <Mic className="w-4 h-4" />
            </Button>
          </motion.div>

          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isArabic 
                ? "اسأل أي شيء..." 
                : serviceMode === "dev"
                  ? "Describe your code problem..."
                  : serviceMode === "education"
                    ? "Ask a question..."
                    : "Message ApexChat..."
            }
            disabled={isGenerating}
            className={cn(
              "flex-1 resize-none bg-transparent border-0 focus:outline-none focus:ring-0 text-[14.5px] text-zinc-100 placeholder:text-zinc-650 leading-relaxed min-h-[24px] max-h-[150px] md:max-h-[200px] py-1 font-sans",
              isArabic && "text-right"
            )}
            rows={1}
          />

          {/* Submit button */}
          {isGenerating ? (
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
              <Button
                size="icon"
                variant="ghost"
                onClick={onStopGenerating}
                className="flex-shrink-0 w-8 h-8 rounded-full bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:border-zinc-700"
              >
                <Square className="w-3.5 h-3.5" />
              </Button>
            </motion.div>
          ) : (
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
              <Button
                size="icon"
                onClick={handleSubmit}
                disabled={!hasText}
                className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-full transition-all duration-250 border",
                  hasText
                    ? "bg-white border-white text-black hover:bg-zinc-200"
                    : "bg-zinc-950 border-zinc-900 text-zinc-700 cursor-not-allowed"
                )}
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </Button>
            </motion.div>
          )}
        </div>

        {/* Embedded Capsule Toolbar */}
        <div className="flex items-center justify-between border-t border-zinc-900/80 pt-2 mt-1">
          <TooltipProvider>
            <div className="flex items-center gap-1.5 py-0.5">
              
              {/* Capsule: Attach (+) */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 rounded-full border border-zinc-900 bg-zinc-950 text-zinc-400 hover:text-white hover:bg-zinc-900 hover:border-zinc-800 transition-all duration-200"
                    disabled={isGenerating}
                  >
                    <span className="text-sm font-bold font-mono">+</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Attach file</p>
                </TooltipContent>
              </Tooltip>

              {/* Capsule: DeepSearch */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (canUseDeepResearch()) {
                        const isCurrentlyActive = selectedModel === "apex-elite";
                        setSelectedModel(isCurrentlyActive ? "apex-flash" : "apex-elite");
                      }
                    }}
                    disabled={!canUseDeepResearch()}
                    className={cn(
                      "h-8 px-3.5 rounded-full border text-[11px] font-bold transition-all duration-200 flex items-center gap-1.5 font-mono uppercase tracking-wider",
                      selectedModel === "apex-elite"
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                        : "border-zinc-900 bg-zinc-950 text-zinc-400 hover:text-white hover:bg-zinc-900 hover:border-zinc-800"
                    )}
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>DeepSearch</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Deep Web Research Mode</p>
                </TooltipContent>
              </Tooltip>

              {/* Capsule: Think */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const isCurrentlyActive = reasoningLevel === "thinking" || reasoningLevel === "overthinking";
                      setReasoningLevel(isCurrentlyActive ? "none" : "thinking");
                    }}
                    className={cn(
                      "h-8 px-3.5 rounded-full border text-[11px] font-bold transition-all duration-200 flex items-center gap-1.5 font-mono uppercase tracking-wider",
                      (reasoningLevel === "thinking" || reasoningLevel === "overthinking")
                        ? "border-amber-500 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                        : "border-zinc-900 bg-zinc-950 text-zinc-400 hover:text-white hover:bg-zinc-900 hover:border-zinc-800"
                    )}
                  >
                    <Brain className="w-3.5 h-3.5" />
                    <span>Think</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Chain of Thought / System Reasoning</p>
                </TooltipContent>
              </Tooltip>

              {/* Capsule: More (...) */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (canUseGodMode()) {
                        const isCurrentlyActive = selectedModel === "apex-unbound";
                        setSelectedModel(isCurrentlyActive ? "apex-flash" : "apex-unbound");
                      }
                    }}
                    disabled={!canUseGodMode()}
                    className={cn(
                      "w-8 h-8 rounded-full border text-xs font-bold transition-all duration-200 flex items-center justify-center font-mono",
                      selectedModel === "apex-unbound"
                        ? "border-violet-500 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20"
                        : "border-zinc-900 bg-zinc-950 text-zinc-400 hover:text-white hover:bg-zinc-900 hover:border-zinc-800"
                    )}
                  >
                    <span className="text-xs leading-none">...</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>APEX UNBOUND Mode</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Omni-Status Card Sources button helper inside input row if needed */}
            {hasSources && onOpenSources && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onOpenSources}
                className="h-8 px-3 rounded-full border border-zinc-900 bg-zinc-950 hover:bg-zinc-900 text-[11px] font-bold font-mono uppercase tracking-wider text-emerald-400 hover:text-emerald-300 gap-1.5"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Sources ({sourcesCount})</span>
              </Button>
            )}
          </TooltipProvider>
        </div>
      </div>

      <p className="text-[10px] text-center text-zinc-600 mt-2 md:mt-3 select-none">
        ApexChat can make mistakes. Verify important information.
      </p>
    </div>
  );
}
