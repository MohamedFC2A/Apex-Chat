import { useState, useCallback, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useChatStore } from "@/lib/store";
import { useSubscriptionStore } from "@/lib/subscription-store";
import { useFeatureToggleStore } from "@/lib/feature-toggle-store";
import { applyGodModeTheme, removeGodModeTheme } from "@/lib/god-mode-theme";
import { ChatMessages } from "@/components/chat-messages";
import { ChatInput } from "@/components/chat-input";
import { ChatHeader } from "@/components/chat/chat-header";
import { SubscriptionBadge } from "@/components/subscription-badge";
import { Button } from "@/components/ui/button";
import { BookOpen, ExternalLink, Copy, Check, Zap, FileDown, Loader2 } from "lucide-react";
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
import { throttledSaveGenerationState, clearGenerationState, getSavedGenerationState } from "@/lib/generation-session";
import { initBroadcastSync, broadcastGenerationStarted, broadcastGenerationEnded } from "@/lib/broadcast-sync";

function calculateQuizProgress(text: string): number {
  const matches = text.match(/"question"\s*:/gi) || [];
  const questionsCount = matches.length;
  let baseProgress = Math.min(5, questionsCount) * 18;
  const lastIndex = text.lastIndexOf('"question"');
  let extraChars = 0;
  if (lastIndex !== -1) {
    extraChars = text.length - lastIndex;
  } else {
    extraChars = text.length;
  }
  const charFactor = Math.min(15, (extraChars / 500) * 15);
  return Math.min(99, Math.round(5 + baseProgress + charFactor));
}

function calculatePdfProgress(text: string): number {
  const matches = text.match(/"title"\s*:/gi) || [];
  const sectionsCount = Math.max(0, matches.length - 1);
  let baseProgress = Math.min(6, sectionsCount) * 15;
  const lastIndex = text.lastIndexOf('"title"');
  let extraChars = 0;
  if (lastIndex !== -1) {
    extraChars = text.length - lastIndex;
  } else {
    extraChars = text.length;
  }
  const charFactor = Math.min(12, (extraChars / 800) * 12);
  return Math.min(99, Math.round(5 + baseProgress + charFactor));
}

export default function ChatPage() {
  const {
    conversations,
    activeConversationId,
    selectedModel,
    setSelectedModel,
    serviceMode,
    setIsGenerating,
    isGenerating,
    sidebarOpen,
    setSidebarOpen,
    reasoningLevel,
    omniStates,
    setOmniState,
    unboundStates,
    setUnboundState,
    createConversation,
    addMessage,
  } = useChatStore();

  const { tier } = useSubscriptionStore();
  const features = useFeatureToggleStore();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeEventSourceRef = useRef<EventSource | null>(null);
  // Tracks whether the user manually stopped generation to prevent auto-restart
  const wasStoppedByUserRef = useRef<boolean>(false);
  // Prevents concurrent/overlapping calls to handleSendMessage
  const isHandlingMessageRef = useRef<boolean>(false);
  // Prevents trying to resume more than once after reload
  const resumeInProgressRef = useRef<boolean>(false);

  const {
    streamingContentMap,
    streamingReasoningMap,
    setStreamingContentForConv,
    setStreamingReasoningForConv,
    activeGenerationId,
    setActiveGenerationId
  } = useChatStore();
  
  const streamingContent = activeConversationId ? streamingContentMap[activeConversationId] || "" : "";
  const streamingReasoning = activeConversationId ? streamingReasoningMap[activeConversationId] || "" : "";

  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [isExportingConversation, setIsExportingConversation] = useState(false);

  const omniState = activeConversationId ? omniStates[activeConversationId] ?? null : null;

  // Apex Coder pipeline state
  const unboundState = activeConversationId ? unboundStates[activeConversationId] ?? null : null;

  const setUnboundStateForConv = useCallback((convId: string, state: UnboundState | null) => {
    setUnboundState(convId, state);
  }, [setUnboundState]);

  const setOmniStateForConv = useCallback((convId: string, state: OmniState | null) => {
    setOmniState(convId, state);
  }, [setOmniState]);

  useEffect(() => {
    const status = getAIClientStatus();

    // Prune any empty conversations from local storage/store on page load
    const state = useChatStore.getState();
    const activeId = state.activeConversationId;
    const nonEmpty = state.conversations.filter(c => c.messages.length > 0 || c.id === activeId);
    if (nonEmpty.length !== state.conversations.length) {
      useChatStore.setState({ conversations: nonEmpty });
    }
  }, []);

  useEffect(() => {
    const isGodModeModel = selectedModel === "apex-coder";
    const currentlyApplied = document.body.classList.contains("god-mode");
    if (isGodModeModel && !currentlyApplied) {
      applyGodModeTheme();
    } else if (!isGodModeModel && currentlyApplied) {
      removeGodModeTheme();
    }
  }, [selectedModel]);

  const handleSendMessage = useCallback(
    async (content: string, displayContent?: string, isRetry = false) => {
      // Prevent concurrent/overlapping message sends
      if (isHandlingMessageRef.current) return;
      isHandlingMessageRef.current = true;
      let conversationId = activeConversationId;
      const store = useChatStore.getState();
      let existingMessages: Message[] = [];

      if (!conversationId) {
        conversationId = createConversation();
      } else {
        const conversation = store.conversations.find(c => c.id === activeConversationId);
        existingMessages = conversation?.messages || [];
      }

      const thisConvId = conversationId!;

      if (isRetry && existingMessages.length > 0) {
        existingMessages = existingMessages.slice(0, -1);
      }

      let assistantMsgId: string = crypto.randomUUID();
      if (isRetry && existingMessages.length > 0) {
        const lastMsg = existingMessages[existingMessages.length - 1];
        if (lastMsg.role === "assistant") {
          assistantMsgId = lastMsg.id;
        }
      }

      if (!isRetry) {
        const userMessage: Message = {
          id: crypto.randomUUID(),
          role: "user",
          content: displayContent || content,
          contextContent: displayContent ? content : undefined,
          timestamp: Date.now(),
        };
        addMessage(thisConvId, userMessage);
      }
      setIsGenerating(true);
      store.setActiveGenerationId(assistantMsgId);
      broadcastGenerationStarted(assistantMsgId, thisConvId);
      setLastError(null);
      setStreamingContentForConv(thisConvId, "");
      setStreamingReasoningForConv(thisConvId, "");

      const isQuiz = detectQuizIntent(content);
      const isPdf = detectPdfIntent(content);

      if (isQuiz) {
        store.setActiveQuizProgress({ current: 5, total: 100 });
      } else if (isPdf) {
        store.setActivePdfProgress({ current: 5, total: 100 });
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const compactHistory = buildCompactConversationHistory(existingMessages);
        const userMemoryContext: any[] = [];

        let response: ChatResponse;
        const isGodModeModel = selectedModel === "apex-coder";

        if (selectedModel === "apex-omni") {
          let lastReportedState: OmniState | null = null;
          const existingOmniState = omniStates[thisConvId] || null;
          response = await processOmniRequest(
            content,
            (state) => {
              if (controller.signal.aborted) return;
              lastReportedState = state;
              setOmniStateForConv(thisConvId, state);
              if (state.finalResponse) {
                setStreamingContentForConv(thisConvId, state.finalResponse);
              }
            },
            compactHistory,
            existingOmniState,
            controller.signal
          );

          if ((response as any).error) {
            throw new Error((response as any).message || (response as any).error);
          }

          // Force full-state complete update inside DB and store
          const resolvedState = lastReportedState;
          if (resolvedState && !controller.signal.aborted) {
            setOmniStateForConv(thisConvId, {
              ...(resolvedState as OmniState),
              step: "complete",
              finalResponse: response.content,
              totalDuration: (response as any).totalDuration || undefined,
            });
          }
        } else if (selectedModel === "apex-coder") {
          // ── Apex Coder: route through the new multi-agent pipeline ──
          const currentUnboundState = unboundStates[thisConvId];
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
              isFollowUp,
              assistantMsgId,
              thisConvId
            );

            if (result.hasQuestion) {
              // Pause the generation process on the client UI, keeping unboundStates active
              setIsGenerating(false);
              store.setActiveGenerationId(null);
              clearGenerationState();
              broadcastGenerationEnded(assistantMsgId);
            } else {
              // Complete normally
              const unboundMessage: Message = {
                id: assistantMsgId,
                role: "assistant",
                content: result.content || (streamingContentMap[thisConvId] || ""),
                model: selectedModel,
                timestamp: Date.now(),
              };
              addMessage(thisConvId!, unboundMessage);
              setIsGenerating(false);
              store.setActiveGenerationId(null);
              clearGenerationState();
              broadcastGenerationEnded(assistantMsgId);
              setStreamingContentForConv(thisConvId, "");
              setStreamingReasoningForConv(thisConvId, "");
            }
          } catch (unboundErr: any) {
            // Fall back to standard sendAIMessage if pipeline fails
            console.warn("[Unbound] Pipeline failed, falling back:", unboundErr.message);
            setUnboundStateForConv(thisConvId, null);
            response = await sendAIMessage(
              content,
              selectedModel,
              compactHistory,
              serviceMode,
              true,
              features,
              reasoningLevel,
              (chunkText, chunkReasoning) => {
                if (controller.signal.aborted) return;
                setStreamingContentForConv(thisConvId, chunkText);
                setStreamingReasoningForConv(thisConvId, chunkReasoning);
                throttledSaveGenerationState(thisConvId, chunkText, chunkReasoning, assistantMsgId);
                if (isQuiz) {
                  const currentProgress = calculateQuizProgress(chunkText);
                  store.setActiveQuizProgress({ current: currentProgress, total: 100 });
                } else if (isPdf) {
                  const currentProgress = calculatePdfProgress(chunkText);
                  store.setActivePdfProgress({ current: currentProgress, total: 100 });
                }
              },
              userMemoryContext,
              assistantMsgId,
              controller.signal
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
              if (controller.signal.aborted) return;
              setStreamingContentForConv(thisConvId, chunkText);
              setStreamingReasoningForConv(thisConvId, chunkReasoning);
              throttledSaveGenerationState(thisConvId, chunkText, chunkReasoning, assistantMsgId);
              if (isQuiz) {
                const currentProgress = calculateQuizProgress(chunkText);
                store.setActiveQuizProgress({ current: currentProgress, total: 100 });
              } else if (isPdf) {
                const currentProgress = calculatePdfProgress(chunkText);
                store.setActivePdfProgress({ current: currentProgress, total: 100 });
              }
            },
            userMemoryContext,
            assistantMsgId,
            controller.signal
          );

          if ((response as any).error) {
            throw new Error((response as any).message || (response as any).error);
          }
        }

        const assistantMessage: Message = {
          id: assistantMsgId,
          role: "assistant",
          content: response.content,
          model: selectedModel,
          reasoningContent: response.reasoningContent,
          timestamp: Date.now(),
          omniState: selectedModel === "apex-omni" ? (omniStates[thisConvId] || undefined) : undefined,
        };
        addMessage(thisConvId!, assistantMessage);
        setIsGenerating(false);
        store.setActiveGenerationId(null);
        setStreamingContentForConv(thisConvId, "");
        setStreamingReasoningForConv(thisConvId, "");
      } catch (error: any) {
        // Detect all AbortError variants (user-initiated stop)
        const isAbort =
          error.name === "AbortError" ||
          error.message === "Aborted" ||
          error.message === "signal is aborted without reason" ||
          error.message === "The user aborted a request." ||
          error.message?.includes("aborted");
        if (isAbort) {
          clearGenerationState();
          setIsGenerating(false);
          store.setActiveGenerationId(null);
          setStreamingContentForConv(thisConvId, "");
          setStreamingReasoningForConv(thisConvId, "");
          return;
        }
        setLastError(error.message || "Failed to process message");
        setOmniStateForConv(thisConvId, null);
        clearGenerationState();
        setIsGenerating(false);
        store.setActiveGenerationId(null);
        setStreamingContentForConv(thisConvId, "");
        setStreamingReasoningForConv(thisConvId, "");

        const isOffline = !navigator.onLine || error.message?.includes("Failed to fetch") || error.message?.includes("network");
        if (isOffline) {
          toast({
            title: "عذراً، انقطع الاتصال بالإنترنت",
            description: "سيتم إعادة محاولة إرسال رسالتك تلقائياً فور استعادة الاتصال بالإنترنت، لا داعي لإعادة إرسالها.",
            variant: "destructive",
          });

          const retryOnConnect = () => {
            toast({
              title: "تم استعادة الاتصال بالإنترنت",
              description: "جاري استئناف إرسال الرسالة المعلقة تلقائياً...",
            });
            handleSendMessage(content, displayContent, true);
          };
          window.addEventListener("online", retryOnConnect, { once: true });
          return;
        }

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
        clearGenerationState();
        isHandlingMessageRef.current = false;
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
        store.setActiveQuizProgress(null);
        store.setActivePdfProgress(null);
      }
    },
    [activeConversationId, selectedModel, serviceMode, tier, features, setIsGenerating, toast, setLocation, reasoningLevel, setOmniStateForConv, setUnboundStateForConv, setStreamingContentForConv, setStreamingReasoningForConv, streamingContentMap, createConversation, addMessage]
  );

  // NOTE: The auto-retry useEffect was REMOVED because it caused a race condition:
  // addMessage() triggers a re-render, the useEffect would fire with isGenerating=false
  // (before setIsGenerating(true) committed), see the last message is "user", and call
  // handleSendMessage again — aborting the first in-flight request → AbortError loop.
  // The ChatInput component sends messages directly via handleSendMessage; no retry needed.

  // Beforeunload handler: Alert user if a generation is active and save current state
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const { isGenerating, activeGenerationId, streamingContentMap, streamingReasoningMap } = useChatStore.getState();
      if (isGenerating && activeGenerationId) {
        try {
          const data = {
            activeGenerationId,
            isGenerating: true,
            streamingContent: streamingContentMap,
            streamingReasoning: streamingReasoningMap,
            savedAt: Date.now(),
          };
          sessionStorage.setItem('apexchat-generation-live', JSON.stringify(data));
        } catch (_) {}

        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Broadcast sync to prevent multiple tabs from resuming the same generation
  useEffect(() => {
    const cleanup = initBroadcastSync(
      (genId) => {
        const store = useChatStore.getState();
        if (store.activeGenerationId === genId && resumeInProgressRef.current) {
          console.log('[Broadcast] Another tab claimed resume, yielding');
          resumeInProgressRef.current = false;
          store.setActiveGenerationId(null);
          store.setIsGenerating(false);
          clearGenerationState();
        }
      },
      (genId) => {
        console.log('[Broadcast] Generation ended in another tab:', genId);
      }
    );

    return cleanup;
  }, []);

  // Resume stream generation after page reload
  useEffect(() => {
    const store = useChatStore.getState();
    const activeGenId = store.activeGenerationId;
    const activeConvId = store.activeConversationId;

    if (!activeGenId || !activeConvId) return;
    if (resumeInProgressRef.current) return;
    if (wasStoppedByUserRef.current) {
      store.setActiveGenerationId(null);
      store.setIsGenerating(false);
      clearGenerationState();
      return;
    }

    resumeInProgressRef.current = true;

    console.log(`[Resume] Attempting to resume generation ${activeGenId} for conversation ${activeConvId}`);

    const conversation = store.conversations.find(c => c.id === activeConvId);
    if (!conversation) {
      store.setActiveGenerationId(null);
      store.setIsGenerating(false);
      clearGenerationState();
      resumeInProgressRef.current = false;
      return;
    }

    // Restore previously saved stream text from sessionStorage
    const savedState = getSavedGenerationState();
    if (savedState && savedState.activeGenerationId === activeGenId) {
      const content = savedState.streamingContent[activeConvId];
      const reasoning = savedState.streamingReasoning[activeConvId];
      if (content) setStreamingContentForConv(activeConvId, content);
      if (reasoning) setStreamingReasoningForConv(activeConvId, reasoning);
      console.log('[Resume] Restored saved streaming content');
    }

    // Double-check stream generation status with server
    fetch(`/api/chat/status/${activeGenId}`)
      .then(r => r.json())
      .then((data: { status: string; content?: string; reasoningContent?: string }) => {
        if (data.status === 'generating' || data.status === 'completed') {
          setIsGenerating(true);
          broadcastGenerationStarted(activeGenId, activeConvId);

          const lastMsg = conversation.messages.find(m => m.id === activeGenId);
          const model = lastMsg?.model || selectedModel;

          if (model === "apex-omni") {
            const userMsgIdx = conversation.messages.findIndex(m => m.id === activeGenId) - 1;
            const userMsg = userMsgIdx >= 0 ? conversation.messages[userMsgIdx] : null;
            if (userMsg) {
              const queryText = userMsg.contextContent || userMsg.content;
              const existingOmniState = omniStates[activeConvId] || null;

              if (abortControllerRef.current) {
                abortControllerRef.current.abort();
              }
              const controller = new AbortController();
              abortControllerRef.current = controller;

              (async () => {
                try {
                  const compactHistory = buildCompactConversationHistory(conversation.messages.slice(0, userMsgIdx));
                  const response = await processOmniRequest(
                    queryText,
                    (state) => {
                      if (controller.signal.aborted) return;
                      setOmniStateForConv(activeConvId, state);
                      const currentMsg = useChatStore.getState().conversations
                        .find(c => c.id === activeConvId)?.messages
                        .find(m => m.id === activeGenId);

                      const updatedMsg: Message = {
                        id: activeGenId,
                        role: "assistant",
                        content: state.finalResponse || currentMsg?.content || "",
                        reasoningContent: currentMsg?.reasoningContent || "",
                        model: "apex-omni",
                        timestamp: currentMsg?.timestamp || Date.now(),
                      };
                      addMessage(activeConvId, updatedMsg);
                    },
                    compactHistory,
                    existingOmniState,
                    controller.signal
                  );

                  if (!controller.signal.aborted) {
                    setOmniStateForConv(activeConvId, {
                      ...existingOmniState,
                      step: "complete",
                      finalResponse: response.content,
                    });

                    const finalMsg: Message = {
                      id: activeGenId,
                      role: "assistant",
                      content: response.content,
                      model: "apex-omni",
                      timestamp: Date.now()
                    };
                    addMessage(activeConvId, finalMsg);
                  }
                } catch (err: any) {
                  if (err.message !== "Aborted") {
                    console.error("[Resume] Omni resume failed:", err);
                  }
                } finally {
                  if (abortControllerRef.current === controller) {
                    abortControllerRef.current = null;
                  }
                  setIsGenerating(false);
                  store.setActiveGenerationId(null);
                  clearGenerationState();
                  broadcastGenerationEnded(activeGenId);
                  resumeInProgressRef.current = false;
                }
              })();
            } else {
              setIsGenerating(false);
              store.setActiveGenerationId(null);
              clearGenerationState();
              resumeInProgressRef.current = false;
            }
          } else {
            // Standard SSE stream resume
            setStreamingContentForConv(activeConvId, "");
            setStreamingReasoningForConv(activeConvId, "");

            if (activeEventSourceRef.current) {
              activeEventSourceRef.current.close();
            }

            if (data.status === 'completed') {
              setIsGenerating(false);
              store.setActiveGenerationId(null);
              clearGenerationState();
              broadcastGenerationEnded(activeGenId);

              if (data.content) {
                const finalMsg: Message = {
                  id: activeGenId,
                  role: "assistant",
                  content: data.content,
                  reasoningContent: data.reasoningContent || "",
                  model: lastMsg?.model || selectedModel,
                  timestamp: Date.now(),
                };
                addMessage(activeConvId, finalMsg);
              }
              resumeInProgressRef.current = false;
              return;
            }

            const eventSource = new EventSource(`/api/chat/stream/${activeGenId}`);
            activeEventSourceRef.current = eventSource;

            eventSource.onmessage = (event) => {
              if (event.data === "[DONE]") {
                eventSource.close();
                if (activeEventSourceRef.current === eventSource) {
                  activeEventSourceRef.current = null;
                }
                setIsGenerating(false);
                store.setActiveGenerationId(null);
                clearGenerationState();
                broadcastGenerationEnded(activeGenId);
                resumeInProgressRef.current = false;

                const currentConv = useChatStore.getState().conversations.find(c => c.id === activeConvId);
                const currentMsg = currentConv?.messages.find(m => m.id === activeGenId);
                const finalMsg: Message = {
                  id: activeGenId,
                  role: "assistant",
                  content: currentMsg?.content || "",
                  reasoningContent: currentMsg?.reasoningContent || "",
                  model: currentMsg?.model || selectedModel,
                  timestamp: Date.now()
                };
                addMessage(activeConvId, finalMsg);
                return;
              }

              try {
                const chunk = JSON.parse(event.data);
                if (chunk.error) {
                  console.error("Server stream returned error:", chunk.error);
                  eventSource.close();
                  if (activeEventSourceRef.current === eventSource) {
                    activeEventSourceRef.current = null;
                  }
                  setIsGenerating(false);
                  store.setActiveGenerationId(null);
                  clearGenerationState();
                  broadcastGenerationEnded(activeGenId);
                  resumeInProgressRef.current = false;
                  setLastError(chunk.error);
                  return;
                }

                if (model === "apex-coder") {
                  if (chunk.type === "content" && chunk.content) {
                    setStreamingContentForConv(activeConvId, prev => prev + chunk.content);
                  } else if (chunk.type === "final" && chunk.content) {
                    setStreamingContentForConv(activeConvId, chunk.content);
                  } else if (chunk.type === "phase" && chunk.phase) {
                    const phaseData = chunk.phase;
                    const curState = useChatStore.getState().unboundStates[activeConvId];
                    if (curState) {
                      const updatedPhases = [...curState.phases];
                      const idx = updatedPhases.findIndex(p => p.phase === phaseData.phase);
                      if (idx !== -1) {
                        updatedPhases[idx] = phaseData;
                      }
                      setUnboundStateForConv(activeConvId, {
                        ...curState,
                        phases: updatedPhases,
                        currentPhase: phaseData.phase,
                      });
                    }
                  } else if (chunk.type === "question") {
                    const curState = useChatStore.getState().unboundStates[activeConvId];
                    if (curState) {
                      const updatedPhases = [...curState.phases];
                      const idx = updatedPhases.findIndex(p => p.phase === 2);
                      if (idx !== -1) {
                        updatedPhases[idx].status = "running";
                        updatedPhases[idx].detail = "waiting for input";
                      }
                      setUnboundStateForConv(activeConvId, {
                        ...curState,
                        phases: updatedPhases,
                        currentPhase: 2,
                        questions: chunk.questions,
                        spec: chunk.spec,
                        searchResults: chunk.searchResults,
                        isRunning: false,
                      });
                    }
                    eventSource.close();
                    if (activeEventSourceRef.current === eventSource) {
                      activeEventSourceRef.current = null;
                    }
                    setIsGenerating(false);
                    store.setActiveGenerationId(null);
                    clearGenerationState();
                    broadcastGenerationEnded(activeGenId);
                    resumeInProgressRef.current = false;
                    return;
                  } else if (chunk.type === "workTree" && chunk.workTree) {
                    const curState = useChatStore.getState().unboundStates[activeConvId];
                    if (curState) {
                      setUnboundStateForConv(activeConvId, {
                        ...curState,
                        workTree: chunk.workTree,
                      });
                    }
                  }
                } else {
                  setStreamingContentForConv(activeConvId, prev => chunk.content ? prev + chunk.content : prev);
                  setStreamingReasoningForConv(activeConvId, prev => chunk.reasoningContent ? prev + chunk.reasoningContent : prev);
                }
              } catch (_) {}
            };

            eventSource.onerror = (err) => {
              console.warn("EventSource connection error, retrying...", err);
            };
          }
        } else {
          console.log('[Resume] Generation not found on server, cleaning up');
          store.setActiveGenerationId(null);
          store.setIsGenerating(false);
          clearGenerationState();
          resumeInProgressRef.current = false;
        }
      })
      .catch(() => {
        store.setActiveGenerationId(null);
        store.setIsGenerating(false);
        clearGenerationState();
        resumeInProgressRef.current = false;
      });
  }, [activeConversationId]);

  const handleStopGenerating = useCallback(async () => {
    // Mark as user-stopped to prevent auto-restart loop
    wasStoppedByUserRef.current = true;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (activeEventSourceRef.current) {
      activeEventSourceRef.current.close();
      activeEventSourceRef.current = null;
    }
    const store = useChatStore.getState();
    const activeId = store.activeGenerationId;
    setIsGenerating(false);
    store.setActiveGenerationId(null);
    clearGenerationState();
    if (activeId) {
      broadcastGenerationEnded(activeId);
    }
    if (activeConversationId) {
      setStreamingContentForConv(activeConversationId, "");
      setStreamingReasoningForConv(activeConversationId, "");
      if (activeId) {
        await fetch(`/api/chat/stop/${activeId}`, { method: "POST" }).catch(err => console.error(err));
      }
    }
    // Reset stop flag after a short delay so future messages can be sent normally
    setTimeout(() => { wasStoppedByUserRef.current = false; }, 500);
  }, [activeConversationId, setStreamingContentForConv, setStreamingReasoningForConv, setIsGenerating]);

  const handleSelectUnboundChoices = useCallback(async (choices: Array<{ questionId: string; title: string; description: string; theme: string }>) => {
    if (!activeConversationId) return;
    const store = useChatStore.getState();
    const conversation = store.conversations.find(c => c.id === activeConversationId);
    const existingMessages = conversation?.messages || [];
    const thisConvId = activeConversationId;
    const currentUnboundState = unboundStates[thisConvId];
    if (!currentUnboundState) return;

    const nextState = {
      ...currentUnboundState,
      isRunning: true,
      selectedChoices: choices,
      questions: null,
    };
    
    const p2Idx = nextState.phases.findIndex((p: any) => p.phase === 2);
    if (p2Idx !== -1) {
      nextState.phases[p2Idx].status = "done";
      nextState.phases[p2Idx].detail = `Selected ${choices.length} design styles`;
    }

    const newAssistantMsgId = crypto.randomUUID();
    setIsGenerating(true);
    store.setActiveGenerationId(newAssistantMsgId);
    broadcastGenerationStarted(newAssistantMsgId, thisConvId);
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
        choices,
        false,
        newAssistantMsgId,
        thisConvId
      );

      const unboundMessage: Message = {
        id: newAssistantMsgId,
        role: "assistant",
        content: result.content || (streamingContentMap[thisConvId] || ""),
        model: selectedModel,
        timestamp: Date.now(),
      };
      addMessage(thisConvId!, unboundMessage);
      setIsGenerating(false);
      store.setActiveGenerationId(null);
      clearGenerationState();
      broadcastGenerationEnded(newAssistantMsgId);
      setStreamingContentForConv(thisConvId, "");
      setStreamingReasoningForConv(thisConvId, "");
    } catch (err: any) {
      setLastError(err.message || "Failed to resume pipeline");
      setIsGenerating(false);
      store.setActiveGenerationId(null);
      clearGenerationState();
      broadcastGenerationEnded(newAssistantMsgId);
    }
  }, [activeConversationId, unboundStates, setUnboundStateForConv, addMessage, selectedModel, setStreamingContentForConv, setStreamingReasoningForConv, streamingContentMap]);

  const handleModelSelect = (model: AIModel) => setSelectedModel(model);
  const isGodMode = selectedModel === "apex-coder";
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

      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await response.json();
        if (data.fallbackHtml && data.html) {
          toast({
            title: "تصدير مباشر عبر المتصفح",
            description: "سيتم فتح نافذة الطباعة الخاصة بالمتصفح تلقائياً. يرجى اختيار 'حفظ بتنسيق PDF'.",
          });
          const printWindow = window.open("", "_blank");
          if (printWindow) {
            printWindow.document.write(data.html);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
              printWindow.print();
            }, 1000);
          }
          return;
        }
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
      {/* Subtle static grid background */}
      <div 
        className="absolute inset-0 pointer-events-none z-0 opacity-25"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.012) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.012) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px, 48px 48px",
          backgroundPosition: "center center, center center",
        }}
      />

      {/* ══════════ HEADER ══════════ */}
      <ChatHeader
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(true)}
        selectedModel={selectedModel}
        onSelectModel={handleModelSelect}
        isGenerating={isGenerating}
        isModelLocked={!!activeConversation && activeConversation.messages.length > 0}
      />

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
