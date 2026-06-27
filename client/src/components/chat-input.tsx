import { useState, useRef, useEffect, useCallback } from "react";
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
  Paperclip, ArrowUp, Square, Brain, Search, Code2, Lock, BookOpen, Mic,
  Layers, Shield, Palette, MessageSquare, FlaskConical, Sparkles, Activity, Check, Loader2, Clock 
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

const agentIcons: Record<string, any> = {
  architect: Layers,
  coder: Code2,
  security: Shield,
  researcher: Search,
  creative: Palette,
  linguist: MessageSquare,
  skeptic: FlaskConical,
  psychologist: Brain,
  futurist: Sparkles,
  optimizer: Activity,
};

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
  const { isGenerating, serviceMode, selectedModel, setSelectedModel, activeQuizProgress } = useChatStore();
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

  // ──────────────────────────────────────────────────────────────
  // States for 12 Ambient Border Glow Benefits
  // ──────────────────────────────────────────────────────────────
  const [typingSpeed, setTypingSpeed] = useState<number>(0);
  const [lastTypeTime, setLastTypeTime] = useState<number>(0);
  const [isIdleScreensaver, setIsIdleScreensaver] = useState<boolean>(false);
  const [saveRipple, setSaveRipple] = useState<boolean>(false);
  const [clipboardFlash, setClipboardFlash] = useState<boolean>(false);
  const [voiceActive, setVoiceActive] = useState<boolean>(false);
  const [voiceVol, setVoiceVol] = useState<number>(0);
  const [networkStutter, setNetworkStutter] = useState<boolean>(false);
  const [latencyVal, setLatencyVal] = useState<number>(35);

  // 1. Calculate typing speed and reset idle screensaver
  useEffect(() => {
    if (message.length === 0) {
      setTypingSpeed(0);
      return;
    }
    const now = Date.now();
    setIsIdleScreensaver(false);

    if (lastTypeTime > 0) {
      const diff = now - lastTypeTime;
      if (diff > 0) {
        const speed = 1000 / diff; // keystrokes per second
        setTypingSpeed(prev => Math.min(10, (prev * 0.7) + (speed * 0.3)));
      }
    }
    setLastTypeTime(now);

    // Auto-save ripple simulation
    const saveTimer = setTimeout(() => {
      setSaveRipple(true);
      const rippleTimer = setTimeout(() => setSaveRipple(false), 1200);
      return () => clearTimeout(rippleTimer);
    }, 2000);

    return () => clearTimeout(saveTimer);
  }, [message]);

  // 2. Idle screensaver timer
  useEffect(() => {
    const idleLimit = 35000; // 35 seconds
    const timer = setTimeout(() => {
      if (message.length === 0 && !isGenerating) {
        setIsIdleScreensaver(true);
      }
    }, idleLimit);
    return () => clearTimeout(timer);
  }, [message, isGenerating, lastTypeTime]);

  // 3. Mount clipboard detection flash
  useEffect(() => {
    setClipboardFlash(true);
    const timer = setTimeout(() => setClipboardFlash(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  // 4. Simulate network latency and periodic stutter checks
  useEffect(() => {
    const interval = setInterval(() => {
      const ping = Math.floor(Math.random() * 80) + 20; // 20ms - 100ms
      setLatencyVal(ping);
      if (ping > 85) {
        setNetworkStutter(true);
        setTimeout(() => setNetworkStutter(false), 800);
      }
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // 5. Voice voice active amplitude waves
  useEffect(() => {
    if (!voiceActive) return;
    const interval = setInterval(() => {
      setVoiceVol(Math.random());
    }, 150);
    return () => clearInterval(interval);
  }, [voiceActive]);

  // 6. Voice simulation trigger
  const handleToggleVoice = () => {
    if (voiceActive) {
      setVoiceActive(false);
      setVoiceVol(0);
    } else {
      setVoiceActive(true);
      const voiceSpeech = [
        "اشرح لي خوارزميات الذكاء الاصطناعي الذاتية",
        "كيف أصمم تأثير وهج زجاجي متحرك باستخدام CSS؟",
        "ابني دالة في جافا سكريبت لحساب الكلمات بالدقيقة"
      ];
      setTimeout(() => {
        const txt = voiceSpeech[Math.floor(Math.random() * voiceSpeech.length)];
        setMessage(prev => prev + (prev ? " " : "") + txt);
        setVoiceActive(false);
        setVoiceVol(0);
      }, 3000);
    }
  };

  // Heuristic Tone Analyzer
  const getPromptVibe = () => {
    const text = message.toLowerCase();
    if (/code|function|const|import|class|let|var|css|html|javascript|typescript|python|c\+\+|java|c#|rust|go|react|component|api|database|قاعدة|كود|برمجة/i.test(text)) {
      return "code";
    }
    if (/math|calculate|sum|multiply|divide|equation|formula|matrix|solve|logic|proof|حساب|رياضيات|معادلة|منطق/i.test(text)) {
      return "logic";
    }
    if (/write|story|creative|poem|imagine|design|color|theme|aesthetic|رواية|قصة|شعر|إبداع|تصميم/i.test(text)) {
      return "creative";
    }
    if (/who|what|why|how|where|when|search|find|google|serper|بحث|من|ماذا|كيف|لماذا|أين/i.test(text)) {
      return "search";
    }
    return "default";
  };

  // Guardrail Safety word match
  const getIsUnsafe = () => {
    const text = message.toLowerCase();
    const unsafeWords = ["hack", "exploit", "bypass", "malware", "virus", "hijack", "شتم", "اختراق", "ثغرة", "تخريب"];
    return unsafeWords.some(w => text.includes(w));
  };

  const currentVibe = getPromptVibe();
  const isUnsafe = getIsUnsafe();

  // Prompt quality evaluation
  const promptWordCount = message.trim() === "" ? 0 : message.trim().split(/\s+/).length;
  const isDetailedPrompt = promptWordCount > 8 && message.length > 40;

  // Determine dynamic barState
  let barState: "error" | "active" | "success" | "idle" = "idle";
  if (lastError) {
    barState = "error";
  } else if (isGenerating) {
    barState = "active";
  } else if (successActive) {
    barState = "success";
  }

  // Get styles based on current barState and 12 glow benefits
  const getBarStateClasses = () => {
    // 0. Active Quiz/Exam Progress state (Absolute highest priority)
    if (activeQuizProgress) {
      return {
        container: "border-emerald-500/30 bg-zinc-950/20 shadow-[0_0_15px_rgba(16,185,129,0.04)] transition-all duration-300",
        bar: "bg-gradient-to-r from-emerald-500 to-emerald-400"
      };
    }

    // 1. Error state (highest priority)
    if (barState === "error") {
      return {
        container: "border-rose-500/30 bg-rose-950/[0.01]",
        bar: "bg-rose-500"
      };
    }

    // 2. Active generation state (breathing reasoning pulse or search scanning)
    if (isGenerating) {
      const isSearchActive = selectedModel === "apex-elite" || deepResearch;
      if (isSearchActive) {
        return {
          container: "border-teal-500/25 bg-card/95 shadow-[0_0_8px_rgba(20,184,166,0.04)]",
          bar: "animate-search-laser"
        };
      }
      return {
        container: "border-violet-500/25 bg-card/95 shadow-[0_0_8px_rgba(139,92,246,0.04)]",
        bar: "bg-gradient-to-r from-violet-500 via-pink-500 to-red-500 animate-pulse duration-[2000ms]"
      };
    }

    // 3. Guardrail alert (sensitive word flash)
    if (isUnsafe) {
      return {
        container: "border-red-500/40 bg-red-950/[0.02] shadow-[0_0_10px_rgba(239,68,68,0.08)] animate-pulse duration-[1500ms]",
        bar: "bg-red-500 animate-pulse duration-1000"
      };
    }

    // 4. Voice Active Amplitude Glow
    if (voiceActive) {
      return {
        container: "border-rose-400/50 bg-rose-950/[0.01] transition-all duration-300",
        bar: "bg-rose-400 animate-pulse duration-1000",
        customStyle: {
          boxShadow: `0 0 8px rgba(244, 63, 94, 0.08)`
        }
      };
    }

    // 5. Save ripple confirmation flash
    if (saveRipple) {
      return {
        container: "border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.06)] bg-emerald-950/[0.01] transition-all duration-500",
        bar: "bg-emerald-500 animate-pulse duration-1000"
      };
    }

    // 6. Clipboard context detected flash
    if (clipboardFlash) {
      return {
        container: "border-cyan-500/30 shadow-[0_0_6px_rgba(6,182,212,0.04)] bg-cyan-950/[0.01]",
        bar: "bg-cyan-500"
      };
    }

    // 7. Inactivity sleep screensaver
    if (isIdleScreensaver) {
      return {
        container: "border-zinc-800/80 hover:border-zinc-700 transition-all duration-1000 bg-zinc-950/10",
        bar: "bg-gradient-to-r from-violet-500 via-emerald-500 to-amber-500 animate-gradient bg-[length:300%_300%] opacity-20"
      };
    }

    // 8. Connection Health Ping Alert (Latency Check)
    if (networkStutter) {
      return {
        container: "border-amber-500/30 shadow-[0_0_6px_rgba(245,158,11,0.04)]",
        bar: "bg-amber-500"
      };
    }

    // 9. Length capacity warning
    if (message.length > 1500) {
      return {
        container: "border-orange-500/30 bg-orange-950/[0.01]",
        bar: "bg-orange-500"
      };
    } else if (message.length > 500) {
      return {
        container: "border-amber-500/25 bg-amber-950/[0.01]",
        bar: "bg-amber-500"
      };
    }

    // 10. Typing speed pulse frequency on the top progress line
    let barPulseClass = "";
    if (typingSpeed > 6) {
      barPulseClass = "animate-pulse duration-500";
    } else if (typingSpeed > 2.5) {
      barPulseClass = "animate-pulse duration-1000";
    }

    // 11. Prompt structures: coach quality thickness
    const qualityBorderClass = isDetailedPrompt 
      ? "border-violet-500/30 bg-violet-950/[0.01] shadow-[0_0_6px_rgba(139,92,246,0.03)]" 
      : isGodModeModel
        ? "border-zinc-800 focus-within:border-zinc-700/80"
        : "border-border focus-within:border-primary/25 dark:focus-within:border-white/20";

    // 12. Active model status base color & vibe checks
    let vibeColorBar = "bg-zinc-600";
    let vibeBorderColorClass = "";

    if (currentVibe === "code") {
      vibeColorBar = "bg-emerald-500 animate-gradient bg-[length:200%_200%]";
      vibeBorderColorClass = "focus-within:border-emerald-500/40 focus-within:shadow-[0_0_6px_rgba(16,185,129,0.04)]";
    } else if (currentVibe === "logic") {
      vibeColorBar = "bg-cyan-500 animate-gradient bg-[length:200%_200%]";
      vibeBorderColorClass = "focus-within:border-cyan-500/40 focus-within:shadow-[0_0_6px_rgba(6,182,212,0.04)]";
    } else if (currentVibe === "creative") {
      vibeColorBar = "bg-amber-500 animate-gradient bg-[length:200%_200%]";
      vibeBorderColorClass = "focus-within:border-amber-500/40 focus-within:shadow-[0_0_6px_rgba(245,158,11,0.04)]";
    } else if (currentVibe === "search") {
      vibeColorBar = "bg-teal-500 animate-gradient bg-[length:200%_200%]";
      vibeBorderColorClass = "focus-within:border-teal-500/40 focus-within:shadow-[0_0_6px_rgba(20,184,166,0.04)]";
    }

    if (isGodModeModel) {
      vibeColorBar = "bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 animate-gradient bg-[length:200%_200%]";
      vibeBorderColorClass = "focus-within:border-purple-500/40 focus-within:shadow-[0_0_6px_rgba(168,85,247,0.04)]";
    } else if (selectedModel === "apex-elite") {
      vibeColorBar = "bg-gradient-to-r from-emerald-500 to-teal-500 animate-gradient bg-[length:200%_200%]";
      vibeBorderColorClass = "focus-within:border-emerald-500/40 focus-within:shadow-[0_0_6px_rgba(16,185,129,0.04)]";
    }

    return {
      container: `${qualityBorderClass} ${vibeBorderColorClass} transition-all duration-500`,
      bar: `${vibeColorBar} ${barPulseClass}`
    };
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
      {/* Omni Real-Time Checklist */}
      <AnimatePresence>
        {selectedModel === "apex-omni" && omniState && omniState.step !== "complete" && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.97 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="mb-2.5 p-3 rounded-xl border border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md shadow-xl flex flex-col gap-2"
          >
            {/* Header */}
            <div className="flex items-center justify-between text-xs border-b border-white/[0.05] pb-1.5">
              <div className="flex items-center gap-1.5 font-medium text-amber-400">
                <Brain className="w-3.5 h-3.5 animate-pulse" />
                <span>Apex Omni — Deca-Core Checklist</span>
              </div>
              <div className="text-zinc-500 font-mono text-[10px]">
                {omniState.step === "dispatch" && "Initializing agents..."}
                {omniState.step === "drafting" && "Cognitive drafting..."}
                {omniState.step === "synthesizing" && "Consensus synthesis..."}
              </div>
            </div>

            {/* Grid of Agents */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {Object.entries(omniState.agents).map(([agentKey, agent]) => {
                const IconComponent = agentIcons[agentKey] || Sparkles;
                const status = agent.status;
                
                return (
                  <div 
                    key={agentKey}
                    className={`flex items-center justify-between p-1.5 rounded-lg border text-[11px] transition-all duration-300 ${
                      status === "complete"
                        ? "bg-emerald-500/[0.02] border-emerald-500/20 text-emerald-400"
                        : status === "drafting"
                          ? "bg-amber-500/[0.02] border-amber-500/20 text-amber-400 font-medium animate-pulse"
                          : "bg-white/[0.01] border-white/[0.03] text-zinc-500"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <IconComponent className={`w-3.5 h-3.5 ${
                        status === "complete" 
                          ? "text-emerald-400" 
                          : status === "drafting" 
                            ? "text-amber-400 animate-pulse" 
                            : "text-zinc-600"
                      }`} />
                      <span className="capitalize truncate font-mono">{agentKey}</span>
                    </div>

                    <div className="flex-shrink-0 ml-1">
                      {status === "complete" && (
                        <Check className="w-3 h-3 text-emerald-400" />
                      )}
                      {status === "drafting" && (
                        <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
                      )}
                      {status === "loading" && (
                        <Clock className="w-3 h-3 text-zinc-600" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div 
        className={`relative flex flex-col gap-2 p-2.5 md:p-3 rounded-xl backdrop-blur-md transition-all duration-200 bg-card border ${currentStyles.container}`}
        style={(currentStyles as any).customStyle}
      >
        {activeQuizProgress ? (
          <div 
            className={cn(
              "absolute top-0 h-[2.5px] rounded-t-xl animate-gradient bg-[length:200%_200%] z-10 transition-all duration-300 ease-out", 
              currentStyles.bar,
              typeof document !== "undefined" && (document.documentElement.dir === "rtl" || document.dir === "rtl")
                ? "right-0 left-auto" 
                : "left-0 right-auto"
            )} 
            style={{ width: `${Math.max((activeQuizProgress.current / activeQuizProgress.total) * 100, 5)}%` }}
          />
        ) : (
          <div className={cn("absolute top-0 left-0 right-0 h-[2.5px] rounded-t-xl animate-gradient bg-[length:200%_200%] z-10", currentStyles.bar)} />
        )}
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

          <motion.div 
            whileHover={{ scale: 1.05 }} 
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleVoice}
              className={`flex-shrink-0 w-8 h-8 md:w-10 md:h-10 transition-all ${
                voiceActive 
                  ? "text-red-500 bg-red-500/10 border border-red-500/20" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
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
