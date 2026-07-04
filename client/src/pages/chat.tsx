import { useState, useCallback, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useChatStore } from "@/lib/store";
import { useSubscriptionStore } from "@/lib/subscription-store";
import { useFeatureToggleStore } from "@/lib/feature-toggle-store";
import { applyGodModeTheme, removeGodModeTheme } from "@/lib/god-mode-theme";
import { ChatMessages } from "@/components/chat-messages";
import { ChatInput } from "@/components/chat-input";
import { SubscriptionBadge } from "@/components/subscription-badge";
import { ModelSelector } from "@/components/model-selector";
import { ContextMeter } from "@/components/context-meter";
import { Button } from "@/components/ui/button";
import { PanelLeft, BookOpen, ExternalLink, Copy, Check, Zap, FileDown, Loader2 } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { extractSourcesAndClean } from "@/lib/sources-helper";
import { motion, AnimatePresence } from "framer-motion";
import { sendAIMessage, getAIClientStatus, clientPerformSerperSearch } from "@/lib/ai-client";
import { processOmniRequest, type OmniState } from "@/lib/omni-service";
import { runUnboundService, type UnboundState } from "@/lib/unbound-service";
import { buildCompactConversationHistory, buildRelevantMemoryContext } from "@/lib/context-engine";
import type { Message, ChatResponse, AIModel } from "@shared/schema";
import { detectQuizIntent } from "@shared/mcq";
import { detectPdfIntent } from "@shared/pdf";
import { useToast } from "@/hooks/use-toast";

export default function ChatPage() {
  const isInitialRender = useRef(true);
  const {
    activeConversationId,
    conversations,
    createConversation,
    addMessage,
    selectedModel,
    setSelectedModel,
    serviceMode,
    setIsGenerating,
    isGenerating,
    sidebarOpen,
    setSidebarOpen,
    reasoningLevel,
  } = useChatStore();

  const { tier } = useSubscriptionStore();
  const features = useFeatureToggleStore();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [streamingContentMap, setStreamingContentMap] = useState<Record<string, string>>({});
  const [streamingReasoningMap, setStreamingReasoningMap] = useState<Record<string, string>>({});
  
  const streamingContent = activeConversationId ? streamingContentMap[activeConversationId] || "" : "";
  const streamingReasoning = activeConversationId ? streamingReasoningMap[activeConversationId] || "" : "";

  const setStreamingContentForConv = useCallback((convId: string, contentOrFn: string | ((prev: string) => string)) => {
    setStreamingContentMap(prev => {
      const current = prev[convId] || "";
      const nextContent = typeof contentOrFn === "function" ? contentOrFn(current) : contentOrFn;
      return { ...prev, [convId]: nextContent };
    });
  }, []);

  const setStreamingReasoningForConv = useCallback((convId: string, reasoningOrFn: string | ((prev: string) => string)) => {
    setStreamingReasoningMap(prev => {
      const current = prev[convId] || "";
      const nextReasoning = typeof reasoningOrFn === "function" ? reasoningOrFn(current) : reasoningOrFn;
      return { ...prev, [convId]: nextReasoning };
    });
  }, []);

  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [isExportingConversation, setIsExportingConversation] = useState(false);

  const [omniStateMap, setOmniStateMap] = useState<Record<string, OmniState>>({});
  const omniState = activeConversationId ? omniStateMap[activeConversationId] ?? null : null;

  // Interactive Grid Spotlight Tracking
  const gridRef = useRef<HTMLDivElement>(null);
  const [isMouseActive, setIsMouseActive] = useState(false);
  const mouseTimeoutRef = useRef<number | null>(null);
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Ignore mouse/touch movements if on mobile to keep auto-animation running uninterrupted
      if (window.innerWidth < 768) return;

      setIsMouseActive(true);
      if (mouseTimeoutRef.current) window.clearTimeout(mouseTimeoutRef.current);
      
      mouseTimeoutRef.current = window.setTimeout(() => {
        setIsMouseActive(false);
      }, 4000); // go idle after 4 seconds of inactivity

      const el = gridRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      el.style.setProperty("--mouse-x", `${x}px`);
      el.style.setProperty("--mouse-y", `${y}px`);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (mouseTimeoutRef.current) window.clearTimeout(mouseTimeoutRef.current);
    };
  }, []);

  // JS-based Auto-Animation loop for mobile or idle desktop spotlight (fully cross-browser/iOS compliant)
  useEffect(() => {
    let animationFrameId: number;
    let angle = 0;

    const animateSpotlight = () => {
      const el = gridRef.current;
      const isMobile = window.innerWidth < 768;
      
      if (el && (!isMouseActive || isMobile)) {
        angle += 0.004; // slow, gentle pan speed
        const x = 50 + Math.sin(angle) * 35; // moves between 15% and 85%
        const y = 45 + Math.cos(angle * 1.4) * 20; // moves between 25% and 65%
        
        el.style.setProperty("--mouse-x", `${x}%`);
        el.style.setProperty("--mouse-y", `${y}%`);
      }

      animationFrameId = requestAnimationFrame(animateSpotlight);
    };

    animationFrameId = requestAnimationFrame(animateSpotlight);
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isMouseActive]);

  const getGridSpotlightColors = () => {
    switch (selectedModel) {
      case "apex-unbound":
        return {
          primary: "rgba(168, 85, 247, 0.08)", // purple
          secondary: "rgba(236, 72, 153, 0.04)" // pink
        };
      case "apex-elite":
        return {
          primary: "rgba(16, 185, 129, 0.08)", // emerald
          secondary: "rgba(20, 184, 166, 0.04)" // teal
        };
      case "apex-omni":
        return {
          primary: "rgba(245, 158, 11, 0.08)", // amber
          secondary: "rgba(249, 115, 22, 0.04)" // orange
        };
      case "apex-pro":
        return {
          primary: "rgba(99, 102, 241, 0.08)", // indigo
          secondary: "rgba(59, 130, 246, 0.04)" // blue
        };
      case "apex-flash":
      default:
        return {
          primary: "rgba(139, 92, 246, 0.06)", // violet
          secondary: "rgba(6, 182, 212, 0.03)" // cyan
        };
    }
  };

  const spotlightColors = getGridSpotlightColors();

  // APEX Unbound pipeline state
  const [unboundStateMap, setUnboundStateMap] = useState<Record<string, UnboundState>>({});
  const unboundState = activeConversationId ? unboundStateMap[activeConversationId] ?? null : null;

  const setUnboundStateForConv = useCallback((convId: string, state: UnboundState | null) => {
    setUnboundStateMap(prev => {
      if (state === null) {
        const next = { ...prev };
        delete next[convId];
        return next;
      }
      return { ...prev, [convId]: state };
    });
  }, []);

  const setOmniStateForConv = useCallback((convId: string, state: OmniState | null) => {
    setOmniStateMap(prev => {
      if (state === null) {
        const next = { ...prev };
        delete next[convId];
        return next;
      }
      return { ...prev, [convId]: state };
    });
  }, []);

  useEffect(() => {
    const status = getAIClientStatus();
    console.log("AI Client Status:", status);

    // Prune any empty conversations from local storage/store on page load
    const state = useChatStore.getState();
    const activeId = state.activeConversationId;
    const nonEmpty = state.conversations.filter(c => c.messages.length > 0 || c.id === activeId);
    if (nonEmpty.length !== state.conversations.length) {
      useChatStore.setState({ conversations: nonEmpty });
    }
  }, []);

  useEffect(() => {
    // Smart light vibration feedback on model change for mobile devices
    if (!isInitialRender.current) {
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        try {
          navigator.vibrate([12, 30, 8]);
        } catch (e) {}
      }
    } else {
      isInitialRender.current = false;
    }

    const isGodModeModel = selectedModel === "apex-unbound";
    const currentlyApplied = document.body.classList.contains("god-mode");
    if (isGodModeModel && !currentlyApplied) {
      applyGodModeTheme();
    } else if (!isGodModeModel && currentlyApplied) {
      removeGodModeTheme();
    }
  }, [selectedModel]);

  const handleSendMessage = useCallback(
    async (content: string, displayContent?: string) => {
      let conversationId = activeConversationId;
      const store = useChatStore.getState();
      let existingMessages: Message[] = [];

      if (!conversationId) {
        conversationId = createConversation();
      } else {
        const conversation = store.conversations.find(c => c.id === conversationId);
        existingMessages = conversation?.messages || [];
      }

      const thisConvId = conversationId;
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: displayContent || content,
        contextContent: displayContent ? content : undefined,
        timestamp: Date.now(),
      };

      addMessage(thisConvId, userMessage);
      setIsGenerating(true);
      setLastError(null);
      setStreamingContentForConv(thisConvId, "");
      setStreamingReasoningForConv(thisConvId, "");

      const isQuiz = detectQuizIntent(content);
      const isPdf = detectPdfIntent(content);
      let progressInterval: any;

      if (isQuiz) {
        store.setActiveQuizProgress({ current: 5, total: 100 });
        let currentProgress = 5;
        progressInterval = window.setInterval(() => {
          currentProgress = currentProgress >= 92 ? currentProgress : currentProgress + Math.floor(Math.random() * 4) + 1;
          store.setActiveQuizProgress({ current: currentProgress, total: 100 });
        }, 400);
      } else if (isPdf) {
        store.setActivePdfProgress({ current: 5, total: 100 });
        let currentProgress = 5;
        progressInterval = window.setInterval(() => {
          currentProgress = currentProgress >= 92 ? currentProgress : currentProgress + Math.floor(Math.random() * 4) + 1;
          store.setActivePdfProgress({ current: currentProgress, total: 100 });
        }, 400);
      }

      try {
        const compactHistory = buildCompactConversationHistory(existingMessages);
        const userMemoryContext = buildRelevantMemoryContext(store.conversations, thisConvId, content);

        let response: ChatResponse;
        const isGodModeModel = selectedModel === "apex-unbound";

        if (selectedModel === "apex-omni") {
          let lastReportedState: OmniState | null = null;
          response = await processOmniRequest(
            content,
            (state) => {
              lastReportedState = state;
              setOmniStateForConv(thisConvId, state);
              if (state.finalResponse) {
                setStreamingContentForConv(thisConvId, state.finalResponse);
              }
            },
            compactHistory
          );

          if ((response as any).error) {
            throw new Error((response as any).message || (response as any).error);
          }

          // Force full-state complete update inside DB and store
          const resolvedState = lastReportedState;
          if (resolvedState) {
            setOmniStateForConv(thisConvId, {
              ...(resolvedState as OmniState),
              step: "complete",
              finalResponse: response.content,
              totalDuration: (response as any).totalDuration || undefined,
            });
          }
        } else if (selectedModel === "apex-unbound") {
          // ── APEX Unbound: route through the new multi-agent pipeline ──
          const currentUnboundState = unboundStateMap[thisConvId];
          const previousSpec = currentUnboundState?.spec || null;
          const previousSelectedChoices = currentUnboundState?.selectedChoices || null;
          const isFollowUp = !!previousSpec;

          const initialUnboundState: UnboundState = {
            isRunning: true,
            phases: [
              { phase: 1, name: "Requirements Architecture — Formal Specification", status: "pending" },
              { phase: 2, name: "Requirements Confirmation — Configuration Brief", status: isFollowUp ? "done" : "pending" },
              { phase: 3, name: "Markup Engineering — Semantic DOM", status: "pending" },
              { phase: 4, name: "Interface Contract — Selector Registry", status: "pending" },
              { phase: 5, name: "Presentation and Logic — Parallel Build", status: "pending" },
              { phase: 6, name: "Quality Review — Integration Audit", status: "pending" },
              { phase: 7, name: "Release Packaging — Single Bundle", status: "pending" },
            ],
            content: "",
            error: null,
            currentPhase: 0,
            selectedChoices: previousSelectedChoices,
            spec: previousSpec,
          };

          if (isFollowUp && previousSelectedChoices) {
            const p2Idx = initialUnboundState.phases.findIndex(p => p.phase === 2);
            if (p2Idx !== -1) {
              initialUnboundState.phases[p2Idx].detail = `Selected ${previousSelectedChoices.length} customization choices`;
            }
          }

          setUnboundStateForConv(thisConvId, initialUnboundState);

          try {
            const result = await runUnboundService(
              content,
              compactHistory,
              (state) => setUnboundStateForConv(thisConvId, { ...initialUnboundState, ...state }),
              (chunk, isReplace) => {
                if (isReplace) {
                  setStreamingContentForConv(thisConvId, chunk);
                } else {
                  setStreamingContentForConv(thisConvId, prev => prev + chunk);
                }
              },
              previousSpec,
              currentUnboundState?.searchResults || null,
              previousSelectedChoices,
              isFollowUp
            );

            if (result.hasQuestion) {
              // Pause the generation process on the client UI, keeping unboundStateMap active
              setIsGenerating(false);
            } else {
              // Complete normally
              const unboundMessage: Message = {
                id: crypto.randomUUID(),
                role: "assistant",
                content: result.content || (streamingContentMap[thisConvId] || ""),
                model: selectedModel,
                timestamp: Date.now(),
              };
              addMessage(thisConvId!, unboundMessage);
              setIsGenerating(false);
              setStreamingContentForConv(thisConvId, "");
              setStreamingReasoningForConv(thisConvId, "");
            }
          } catch (unboundErr: any) {
            // Fall back to standard sendAIMessage if pipeline fails
            console.warn("[Unbound] Pipeline failed, falling back:", unboundErr.message);
            response = await sendAIMessage(
              content,
              selectedModel,
              compactHistory,
              serviceMode,
              true,
              features,
              reasoningLevel,
              (chunkText, chunkReasoning) => {
                setStreamingContentForConv(thisConvId, chunkText);
                setStreamingReasoningForConv(thisConvId, chunkReasoning);
              },
              userMemoryContext
            );
            if ((response as any).error) throw new Error((response as any).message || (response as any).error);

            const fallbackMessage: Message = {
              id: crypto.randomUUID(),
              role: "assistant",
              content: response.content || (streamingContentMap[thisConvId] || ""),
              model: selectedModel,
              timestamp: Date.now(),
            };
            addMessage(thisConvId!, fallbackMessage);
            setIsGenerating(false);
            setStreamingContentForConv(thisConvId, "");
            setStreamingReasoningForConv(thisConvId, "");
          }
          return;
        } else {
          response = await sendAIMessage(
            content,
            selectedModel,
            compactHistory,
            serviceMode,
            isGodModeModel,
            features,
            reasoningLevel,
            (chunkText, chunkReasoning) => {
              setStreamingContentForConv(thisConvId, chunkText);
              setStreamingReasoningForConv(thisConvId, chunkReasoning);
            },
            userMemoryContext
          );

          if ((response as any).error) {
            throw new Error((response as any).message || (response as any).error);
          }
        }

        const assistantMessage: Message = {
          id: response.id,
          role: "assistant",
          content: response.content,
          model: selectedModel,
          reasoningContent: response.reasoningContent,
          timestamp: Date.now(),
          omniState: selectedModel === "apex-omni" ? (omniStateMap[thisConvId] || undefined) : undefined,
        };
        addMessage(thisConvId!, assistantMessage);
        setIsGenerating(false);
        setStreamingContentForConv(thisConvId, "");
        setStreamingReasoningForConv(thisConvId, "");
      } catch (error: any) {
        setLastError(error.message || "Failed to process message");
        setOmniStateForConv(thisConvId, null);
        setIsGenerating(false);
        setStreamingContentForConv(thisConvId, "");
        setStreamingReasoningForConv(thisConvId, "");

        if (error.message?.includes("DeepSeek") || error.message?.includes("DEEPSEEK")) {
          toast({ title: "Cloud AI Error", description: error.message || "DeepSeek API request failed.", variant: "destructive" });
          return;
        }
        if (error.status === 403 || error.message?.includes("403") || error.message?.includes("upgrade")) {
          toast({ title: "Premium Model", description: "Please upgrade your subscription to access this model." });
          setTimeout(() => setLocation("/pricing"), 1500);
        } else if (error.message?.includes("Access denied") || error.message?.includes("requires")) {
          toast({ title: "Access Denied", description: error.message, variant: "destructive" });
        } else {
          toast({ title: "Error", description: error.message || "Failed to process message. Please try again.", variant: "destructive" });
        }
      } finally {
        if (progressInterval) {
          window.clearInterval(progressInterval);
        }
        store.setActiveQuizProgress(null);
        store.setActivePdfProgress(null);
      }
    },
    [activeConversationId, createConversation, addMessage, selectedModel, serviceMode, tier, features, setIsGenerating, toast, setLocation, reasoningLevel, setOmniStateForConv, setUnboundStateForConv, setStreamingContentForConv, setStreamingReasoningForConv, streamingContentMap]
  );

  const handleStopGenerating = useCallback(() => {
    setIsGenerating(false);
    if (activeConversationId) {
      setStreamingContentForConv(activeConversationId, "");
      setStreamingReasoningForConv(activeConversationId, "");
    }
  }, [activeConversationId, setStreamingContentForConv, setStreamingReasoningForConv, setIsGenerating]);

  const handleSelectUnboundChoices = useCallback(async (choices: Array<{ questionId: string; title: string; description: string; theme: string }>) => {
    if (!activeConversationId) return;
    const store = useChatStore.getState();
    const conversation = store.conversations.find(c => c.id === activeConversationId);
    const existingMessages = conversation?.messages || [];
    const thisConvId = activeConversationId;
    const currentUnboundState = unboundStateMap[thisConvId];
    if (!currentUnboundState) return;

    const nextState = {
      ...currentUnboundState,
      isRunning: true,
      selectedChoices: choices,
      questions: null,
    };
    
    const p2Idx = nextState.phases.findIndex(p => p.phase === 2);
    if (p2Idx !== -1) {
      nextState.phases[p2Idx].status = "done";
      nextState.phases[p2Idx].detail = `Selected ${choices.length} design styles`;
    }

    setUnboundStateForConv(thisConvId, nextState);
    setIsGenerating(true);
    setLastError(null);

    const userMessages = existingMessages.filter(m => m.role === "user");
    const lastUserMessage = userMessages[userMessages.length - 1];
    const originalQuery = lastUserMessage ? lastUserMessage.content : "";
    const compactHistory = buildCompactConversationHistory(existingMessages);

    try {
      const result = await runUnboundService(
        originalQuery,
        compactHistory,
        (state) => setUnboundStateForConv(thisConvId, { ...nextState, ...state }),
        (chunk, isReplace) => {
          if (isReplace) {
            setStreamingContentForConv(thisConvId, chunk);
          } else {
            setStreamingContentForConv(thisConvId, prev => prev + chunk);
          }
        },
        currentUnboundState.spec,
        currentUnboundState.searchResults,
        choices
      );

      const unboundMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: result.content || (streamingContentMap[thisConvId] || ""),
        model: selectedModel,
        timestamp: Date.now(),
      };
      addMessage(thisConvId!, unboundMessage);
      setIsGenerating(false);
      setStreamingContentForConv(thisConvId, "");
      setStreamingReasoningForConv(thisConvId, "");
    } catch (err: any) {
      setLastError(err.message || "Failed to resume pipeline");
      setIsGenerating(false);
    }
  }, [activeConversationId, unboundStateMap, setUnboundStateForConv, addMessage, selectedModel, setStreamingContentForConv, setStreamingReasoningForConv, streamingContentMap]);

  const handleModelSelect = (model: AIModel) => setSelectedModel(model);
  const isGodMode = selectedModel === "apex-unbound";
  const activeConversation = conversations.find(c => c.id === activeConversationId);

  const handleExportConversation = useCallback(async () => {
    if (!activeConversation || activeConversation.messages.length === 0) return;
    setIsExportingConversation(true);

    try {
      const response = await fetch("/api/export/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exportType: "conversation",
          messages: activeConversation.messages.map((message) => ({
            role: message.role,
            content: message.contextContent || message.content,
            timestamp: message.timestamp,
          })),
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.message || `PDF export failed with status ${response.status}`);
      }

      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") || "";
      let filename = "apex-conversation.pdf";
      const filenameStarMatch = disposition.match(/filename\*=utf-8''([^;\s]+)/i);
      if (filenameStarMatch) {
        filename = decodeURIComponent(filenameStarMatch[1]);
      } else {
        const filenameMatch = disposition.match(/filename="?([^";\n]+)"?/i);
        if (filenameMatch) {
          filename = decodeURIComponent(filenameMatch[1]);
        }
      }
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      toast({
        title: "Conversation exported",
        description: "The full chat was downloaded as PDF.",
      });
    } catch (error) {
      toast({
        title: "Conversation export failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsExportingConversation(false);
    }
  }, [activeConversation, toast]);

  return (
    <div className="chat-shell flex flex-col h-full text-foreground min-h-0 relative overflow-hidden apex-bg">
      {/* Interactive Grid Background */}
      <div 
        ref={gridRef}
        className="absolute inset-0 pointer-events-none z-0 opacity-55 transition-opacity duration-300"
        style={{
          backgroundImage: `
            radial-gradient(circle 280px at var(--mouse-x, 50%) var(--mouse-y, 35%), ${spotlightColors.primary}, transparent 80%),
            radial-gradient(circle 500px at var(--mouse-x, 50%) var(--mouse-y, 35%), ${spotlightColors.secondary}, transparent),
            linear-gradient(rgba(255, 255, 255, 0.012) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.012) 1px, transparent 1px)
          `,
          backgroundSize: "100% 100%, 100% 100%, 48px 48px, 48px 48px",
          backgroundPosition: "0 0, 0 0, center center, center center",
        }}
      />

      {/* ── Ambient glow orbs removed ── */}
      {isGodMode && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-emerald-950/10 via-transparent to-emerald-950/5"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.2 }}
          />
        </div>
      )}
      {/* ══════════ HEADER ══════════ */}
      <motion.header
        className="flex-shrink-0 relative z-20"
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="apex-header-bg px-3 py-2.5 md:px-5 md:py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">

            {/* Left: sidebar toggle + logo + model */}
            <div className="flex flex-1 items-center gap-2 min-w-0">
              {/* Always show on mobile, show only when closed on desktop */}
              {(!sidebarOpen) && (
                <motion.div
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <button
                    onClick={() => setSidebarOpen(true)}
                    className="h-9 w-9 flex-shrink-0 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/8 hover:border-white/15 text-white/50 hover:text-white/80 transition-all duration-150"
                    aria-label="فتح القائمة"
                  >
                    <PanelLeft className="w-4 h-4" />
                  </button>
                </motion.div>
              )}

              {/* Logo mark */}
              <div className="hidden md:flex items-center gap-2 mr-0.5">
                <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-violet-400" strokeWidth={2} />
                </div>
              </div>

              <div className="flex-1 min-w-[160px] sm:flex-none sm:min-w-[200px]">
                <ModelSelector selectedModel={selectedModel} onSelectModel={handleModelSelect} disabled={isGenerating} />
              </div>
            </div>

            {/* Right: live status + theme */}
            <div className="hidden sm:flex items-center gap-2 shrink-0">

              <AnimatePresence>
                {isGenerating && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.85, x: 6 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.85, x: 6 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/12 border border-violet-500/25 text-violet-300"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                    <span className="text-[10px] font-bold tracking-widest uppercase">Live</span>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="hidden sm:block">
                <ContextMeter />
              </div>
            </div>
          </div>
        </div>
        {/* Glowing divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" />
      </motion.header>

      {/* ══════════ MESSAGES ══════════ */}
      <div className="chat-scroll-container flex-1 overflow-y-auto overscroll-contain min-h-0 relative z-10">
        <ChatMessages
          streamingContent={streamingContent}
          streamingReasoning={streamingReasoning}
          omniState={omniState}
          isOmniLoading={selectedModel === "apex-omni" && !!omniState && omniState.step !== "complete"}
          isStreaming={isGenerating}
          onSelectPrompt={handleSendMessage}
          unboundState={unboundState}
          onSelectUnboundChoice={handleSelectUnboundChoices}
        />
      </div>

      {/* ══════════ INPUT ══════════ */}
      <motion.div
        className="flex-shrink-0 relative z-20"
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.45, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        <div className="chat-input-dock bg-background/55 backdrop-blur-2xl pb-3.5 md:pb-4 pt-3">
          {(() => {
            const assistantMessages = activeConversation?.messages.filter(m => m.role === "assistant") || [];
            const lastAssistantMessage = assistantMessages[assistantMessages.length - 1];
            const { sources } = extractSourcesAndClean(lastAssistantMessage?.content || "");
            return (
              <ChatInput
                onSendMessage={handleSendMessage}
                onStopGenerating={handleStopGenerating}
                onOpenSources={() => setSourcesOpen(true)}
                hasSources={sources.length > 0}
                sourcesCount={sources.length}
                lastError={lastError}
                unboundState={unboundState}
                onSelectUnboundChoices={handleSelectUnboundChoices}
                conversationId={activeConversationId}
                omniState={omniState}
              />
            );
          })()}
        </div>
      </motion.div>

      {/* ══════════ SOURCES DRAWER ══════════ */}
      <Drawer open={sourcesOpen} onOpenChange={setSourcesOpen}>
        <DrawerContent className="max-h-[85vh] bg-popover border-t border-border flex flex-col font-sans">
          <div className="mx-auto w-10 h-1 bg-muted rounded-full my-3 flex-shrink-0" />
          <DrawerHeader className="text-right border-b border-border/40 pb-4 font-arabic" dir="rtl">
            <DrawerTitle className="text-xl font-bold flex items-center justify-start gap-2.5 text-foreground font-arabic leading-none">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/12 border border-emerald-500/25 flex items-center justify-center">
                <BookOpen className="w-4.5 h-4.5 text-emerald-400" />
              </div>
              المصادر والمراجع
            </DrawerTitle>
            <DrawerDescription className="text-sm text-muted-foreground mt-1.5">
              المصادر المعتمدة لبناء الإجابة الأخيرة في هذه المحادثة
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 space-y-4 max-w-4xl mx-auto w-full" dir="rtl">
            {(() => {
              const assistantMessages = activeConversation?.messages.filter(m => m.role === "assistant") || [];
              const lastAssistantMessage = assistantMessages[assistantMessages.length - 1];
              const { sources } = extractSourcesAndClean(lastAssistantMessage?.content || "");

              if (sources.length > 0) {
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {sources.map((source, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="p-4 rounded-2xl border border-border/60 bg-card/50 hover:bg-muted/20 hover:border-emerald-500/30 transition-all duration-200 flex flex-col justify-between gap-3 min-w-0 backdrop-blur-sm"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400 font-mono font-bold text-sm shrink-0">
                            {idx + 1}
                          </div>
                          <div className="min-w-0 flex-1 text-right font-arabic">
                            <h4 className="text-sm font-semibold text-foreground truncate">{source.title}</h4>
                            <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">{source.domain}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 border-t border-border/40 pt-3">
                          <Button
                            size="sm" variant="ghost"
                            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5 rounded-lg border border-border/40"
                            onClick={async () => {
                              await navigator.clipboard.writeText(source.url);
                              setCopiedUrl(source.url);
                              setTimeout(() => setCopiedUrl(null), 2000);
                            }}
                          >
                            {copiedUrl === source.url
                              ? <><Check className="w-3.5 h-3.5 text-emerald-500" /><span>تم النسخ</span></>
                              : <><Copy className="w-3.5 h-3.5" /><span>نسخ الرابط</span></>}
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 rounded-lg shadow-md shadow-emerald-900/30"
                            asChild
                          >
                            <a href={source.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-3.5 h-3.5" /><span>زيارة الموقع</span>
                            </a>
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                );
              }

              return (
                <div className="text-center py-16">
                  <div className="w-16 h-16 rounded-2xl bg-muted/20 border border-border/40 flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-7 h-7 text-muted-foreground/30" />
                  </div>
                  <p className="text-sm text-muted-foreground font-arabic">لا توجد مصادر متاحة للإجابة الأخيرة.</p>
                </div>
              );
            })()}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
