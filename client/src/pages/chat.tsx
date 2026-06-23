import { useState, useCallback, useEffect } from "react";
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
import { PanelLeft, BookOpen, ExternalLink, Copy, Check, Zap } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { extractSourcesAndClean } from "@/lib/sources-helper";
import { motion, AnimatePresence } from "framer-motion";
import { sendAIMessage, getAIClientStatus } from "@/lib/ai-client";
import { processOmniRequest, type OmniState } from "@/lib/omni-service";
import type { Message, ChatResponse, AIModel } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function ChatPage() {
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

  const [streamingContent, setStreamingContent] = useState("");
  const [streamingReasoning, setStreamingReasoning] = useState("");
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const [omniStateMap, setOmniStateMap] = useState<Record<string, OmniState>>({});
  const omniState = activeConversationId ? omniStateMap[activeConversationId] ?? null : null;

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
  }, []);

  useEffect(() => {
    // Smart light vibration feedback on model change for mobile devices
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      try {
        navigator.vibrate([12, 30, 8]);
      } catch (e) {}
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
    async (content: string) => {
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
        content,
        timestamp: Date.now(),
      };

      addMessage(thisConvId, userMessage);
      setIsGenerating(true);
      setLastError(null);
      setStreamingContent("");
      setStreamingReasoning("");

      try {
        const pastConversations = store.conversations.filter(
          c => c.id !== thisConvId && c.messages.length > 0
        );
        const userMemoryContext = pastConversations.slice(0, 5).map(c => {
          const userMessages = c.messages.filter(m => m.role === "user");
          return {
            title: c.title,
            lastQuery: userMessages[userMessages.length - 1]?.content || ""
          };
        });

        let response: ChatResponse;
        const isGodModeModel = selectedModel === "apex-unbound";

        if (selectedModel === "apex-omni") {
          setOmniStateForConv(thisConvId, {
            step: "dispatch",
            agents: {
              architect:    { model: "architect",    status: "loading", draft: "" },
              coder:        { model: "coder",         status: "loading", draft: "" },
              security:     { model: "security",      status: "loading", draft: "" },
              researcher:   { model: "researcher",    status: "loading", draft: "" },
              creative:     { model: "creative",      status: "loading", draft: "" },
              linguist:     { model: "linguist",      status: "loading", draft: "" },
              skeptic:      { model: "skeptic",       status: "loading", draft: "" },
              psychologist: { model: "psychologist",  status: "loading", draft: "" },
              futurist:     { model: "futurist",      status: "loading", draft: "" },
              optimizer:    { model: "optimizer",     status: "loading", draft: "" },
            },
          });

          response = await processOmniRequest(
            content,
            (state) => {
              setOmniStateForConv(thisConvId, state);
              if (state.step === "synthesizing" && state.finalResponse) {
                setStreamingContent(state.finalResponse);
              }
            },
            existingMessages.map(m => ({ role: m.role, content: m.content }))
          );

          if ((response as any).error) {
            throw new Error((response as any).message || (response as any).error);
          }
        } else {
          response = await sendAIMessage(
            content,
            selectedModel,
            existingMessages,
            serviceMode,
            isGodModeModel,
            features,
            reasoningLevel,
            (chunkText, chunkReasoning) => {
              setStreamingContent(chunkText);
              setStreamingReasoning(chunkReasoning);
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
        setStreamingContent("");
        setStreamingReasoning("");
      } catch (error: any) {
        setLastError(error.message || "Failed to process message");
        setOmniStateForConv(thisConvId, null);
        setIsGenerating(false);
        setStreamingContent("");
        setStreamingReasoning("");

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
      }
    },
    [activeConversationId, createConversation, addMessage, selectedModel, serviceMode, tier, features, setIsGenerating, toast, setLocation, reasoningLevel, setOmniStateForConv]
  );

  const handleStopGenerating = useCallback(() => {
    setIsGenerating(false);
    setStreamingContent("");
    setStreamingReasoning("");
  }, [setIsGenerating]);

  const handleModelSelect = (model: AIModel) => setSelectedModel(model);
  const isGodMode = selectedModel === "apex-unbound";

  return (
    <div className="flex flex-col h-full text-foreground min-h-0 relative overflow-hidden apex-bg">

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
            <div className="flex items-center gap-2.5 min-w-0">
              {!sidebarOpen && (
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button
                    variant="ghost" size="icon"
                    onClick={() => setSidebarOpen(true)}
                    className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-foreground hover:bg-white/6 rounded-xl transition-all duration-200"
                  >
                    <PanelLeft className="w-4 h-4" />
                  </Button>
                </motion.div>
              )}

              {/* Logo mark */}
              <div className="hidden md:flex items-center gap-2 mr-0.5">
                <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-violet-400" strokeWidth={2} />
                </div>
              </div>

              <ModelSelector selectedModel={selectedModel} onSelectModel={handleModelSelect} />
            </div>

            {/* Right: live status + theme */}
            <div className="flex items-center gap-2">
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
              <ContextMeter />
            </div>
          </div>
        </div>
        {/* Glowing divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" />
      </motion.header>

      {/* ══════════ MESSAGES ══════════ */}
      <div className="flex-1 overflow-y-auto min-h-0 relative z-10">
        <ChatMessages
          streamingContent={streamingContent}
          streamingReasoning={streamingReasoning}
          omniState={omniState}
          isOmniLoading={selectedModel === "apex-omni" && !!omniState && omniState.step !== "complete"}
          isStreaming={isGenerating}
          onSelectPrompt={handleSendMessage}
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
        <div className="bg-background/55 backdrop-blur-2xl pb-3.5 md:pb-4 pt-3">
          {(() => {
            const activeConversation = conversations.find(c => c.id === activeConversationId);
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
              const activeConversation = conversations.find(c => c.id === activeConversationId);
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
