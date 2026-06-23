import { useState, useRef, useEffect, useCallback } from "react";
import { useChatStore } from "@/lib/store";
import { useSubscriptionStore } from "@/lib/subscription-store";
import { useFeatureToggleStore } from "@/lib/feature-toggle-store";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Paperclip, ArrowUp, Square, Brain, Search, Code2, Lock, BookOpen } from "lucide-react";
import { motion } from "framer-motion";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onStopGenerating?: () => void;
  onOpenSources?: () => void;
  hasSources?: boolean;
  sourcesCount?: number;
  lastError?: string | null;
}

export function ChatInput({ 
  onSendMessage, 
  onStopGenerating,
  onOpenSources,
  hasSources = false,
  sourcesCount = 0,
  lastError = null
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isGenerating, serviceMode, selectedModel, setSelectedModel } = useChatStore();
  const { canUseDeepResearch, canUseGodMode } = useSubscriptionStore();
  const {
    thinking,
    deepResearch,
    godMode,
    setDeepResearch,
    setGodMode,
  } = useFeatureToggleStore();

  const isGodModeModel = selectedModel === "apex-unbound";

  // Success indicator logic (transitions from isGenerating: true -> false without error)
  const [successActive, setSuccessActive] = useState(false);
  const prevIsGenerating = useRef(isGenerating);

  useEffect(() => {
    if (prevIsGenerating.current && !isGenerating && !lastError) {
      setSuccessActive(true);
      const timer = setTimeout(() => {
        setSuccessActive(false);
      }, 4000); // Glow green for 4 seconds
      return () => clearTimeout(timer);
    }
    prevIsGenerating.current = isGenerating;
  }, [isGenerating, lastError]);

  // Synchronize selectedModel with deepResearch and godMode states in the toggle store
  useEffect(() => {
    const isSearchModel = selectedModel === "apex-elite";
    const isGodModel = selectedModel === "apex-unbound";

    setDeepResearch(isSearchModel);
    setGodMode(isGodModel);
  }, [selectedModel, setDeepResearch, setGodMode]);

  // Determine dynamic barState
  let barState: "error" | "active" | "success" | "idle" = "idle";
  if (lastError) {
    barState = "error";
  } else if (isGenerating) {
    barState = "active";
  } else if (successActive) {
    barState = "success";
  }

  // Get styles based on current barState
  const getBarStateClasses = () => {
    switch (barState) {
      case "error":
        return {
          container: "border-red-900/50 shadow-[0_0_20px_rgba(239,68,68,0.1)] focus-within:border-red-800",
          bar: "gradient-smooth-transition bar-error"
        };
      case "active":
        return {
          container: "border-amber-900/50 shadow-[0_0_20px_rgba(245,158,11,0.1)] focus-within:border-amber-800",
          bar: "gradient-smooth-transition bar-active"
        };
      case "success":
        return {
          container: "border-emerald-950/40 shadow-[0_0_20px_rgba(16,185,129,0.1)] focus-within:border-emerald-800",
          bar: "gradient-smooth-transition bar-success"
        };
      case "idle":
      default:
        return {
          container: isGodModeModel
            ? "border-zinc-800 focus-within:border-zinc-700/80 shadow-[0_0_20px_rgba(139,92,246,0.06)]"
            : "border-border focus-within:border-primary/40 dark:focus-within:border-white/30 shadow-[0_0_20px_rgba(139,92,246,0.04)]",
          bar: "gradient-smooth-transition bar-idle"
        };
    }
  };

  const currentStyles = getBarStateClasses();

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const newHeight = Math.min(textarea.scrollHeight, 200);
      textarea.style.height = `${newHeight}px`;
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [message, adjustTextareaHeight]);

  const handleSubmit = () => {
    if (message.trim() && !isGenerating) {
      onSendMessage(message.trim());
      setMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const hasText = message.trim().length > 0;

  return (
    <div className="w-full max-w-3xl mx-auto px-2 md:px-4">
      <div className={`relative flex flex-col gap-2 p-2.5 md:p-3 rounded-xl backdrop-blur-md transition-all duration-200 bg-card border ${currentStyles.container}`}>
        <div className={`absolute top-0 left-0 right-0 h-[2.5px] rounded-t-xl animate-gradient bg-[length:200%_200%] z-10 ${currentStyles.bar}`} />
        {/* Main Input Row */}
        <div className="flex items-end gap-1.5 md:gap-2">
          <motion.div 
            whileHover={{ scale: 1.05 }} 
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 text-muted-foreground hover:text-foreground hover:bg-muted"
              disabled={isGenerating}
            >
              <Paperclip className="w-4 h-4" />
            </Button>
          </motion.div>

          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              serviceMode === "dev"
                ? "Describe your code problem..."
                : serviceMode === "education"
                  ? "Ask a question..."
                  : "Message ApexChat..."
            }
            disabled={isGenerating}
            className={`flex-1 resize-none bg-transparent border-0 focus:outline-none focus:ring-0 text-sm text-foreground placeholder:text-muted-foreground/60 leading-relaxed min-h-[24px] max-h-[150px] md:max-h-[200px] py-1 ${
              serviceMode === "dev" ? "font-mono" : ""
            }`}
            rows={1}
          />

          {isGenerating ? (
            <motion.div 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.15 }}
            >
              <Button
                size="icon"
                variant="ghost"
                onClick={onStopGenerating}
                className="flex-shrink-0 w-8 h-8 md:w-9 md:h-9 rounded-full bg-muted hover:bg-muted/80 text-foreground"
              >
                <Square className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </Button>
            </motion.div>
          ) : (
            <motion.div 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.15 }}
            >
              <Button
                size="icon"
                onClick={handleSubmit}
                disabled={!hasText}
                className={`flex-shrink-0 w-8 h-8 md:w-9 md:h-9 rounded-full transition-all ${
                  hasText
                    ? "bg-foreground text-background hover:bg-foreground/90"
                    : "bg-muted text-muted-foreground/40"
                }`}
              >
                <ArrowUp className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </Button>
            </motion.div>
          )}
        </div>

        {/* Embedded Cockpit Toolbar */}
        <div className="flex items-center justify-between border-t border-border pt-1.5 md:pt-2">
          <TooltipProvider>
            <div className="flex items-center gap-0.5 md:gap-1">
              {/* Thinking Toggle (Temporarily Hidden) */}

              {/* Deep Research Toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <motion.div 
                      whileHover={{ scale: canUseDeepResearch() ? 1.1 : 1 }} 
                      whileTap={{ scale: canUseDeepResearch() ? 0.9 : 1 }}
                      transition={{ duration: 0.15 }}
                    >
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
                        className={`h-7 md:h-8 px-2 transition-all ${
                          !canUseDeepResearch()
                            ? "opacity-40 cursor-not-allowed"
                            : selectedModel === "apex-elite"
                              ? "bg-emerald-500 hover:bg-emerald-600 text-white border border-emerald-500 rounded-lg shadow-sm font-semibold"
                              : "text-muted-foreground hover:text-emerald-400 hover:bg-emerald-950/20"
                        }`}
                      >
                        {!canUseDeepResearch() && <Lock className="w-2.5 h-2.5 mr-1" />}
                        <Search className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </Button>
                    </motion.div>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {!canUseDeepResearch()
                      ? "Deep Research: Requires Pro+"
                      : selectedModel === "apex-elite"
                        ? "Deep Research: ON"
                        : "Deep Research: OFF"}
                  </p>
                </TooltipContent>
              </Tooltip>

              {/* God Mode Toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <motion.div 
                      whileHover={{ scale: canUseGodMode() ? 1.1 : 1 }} 
                      whileTap={{ scale: canUseGodMode() ? 0.9 : 1 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (canUseGodMode()) {
                            const isCurrentlyActive = selectedModel === "apex-unbound";
                            setSelectedModel(isCurrentlyActive ? "apex-flash" : "apex-unbound");
                          }
                        }}
                        disabled={!canUseGodMode()}
                        className={`h-7 md:h-8 px-2 transition-all ${
                          !canUseGodMode()
                            ? "opacity-40 cursor-not-allowed"
                            : selectedModel === "apex-unbound"
                              ? "bg-violet-600 hover:bg-violet-700 text-white border border-violet-600 rounded-lg shadow-sm font-semibold"
                              : "text-muted-foreground hover:text-violet-400 hover:bg-violet-950/20"
                        }`}
                      >
                        {!canUseGodMode() && <Lock className="w-2.5 h-2.5 mr-1" />}
                        <Code2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </Button>
                    </motion.div>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {!canUseGodMode()
                      ? "Upgrade to Apex Omni to unlock Code Architect Mode"
                      : selectedModel === "apex-unbound"
                        ? "APEX UNBOUND · Code Architect Active"
                        : "Code Architect Mode: OFF"}
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Status Indicator & Sources Removed */}
          </TooltipProvider>
        </div>
      </div>

      <p className="text-[10px] text-center text-muted-foreground/60 mt-2 md:mt-3">
        ApexChat can make mistakes. Verify important information.
      </p>
    </div>
  );
}
