import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AIModel, ServiceMode, ReasoningLevel, Message, Conversation } from "@shared/schema";
import { debouncedSaveConversation, fetchConversationsFromCloud, mergeConversations, deleteConversation as cloudDeleteConversation } from "./cloud-sync";

interface ChatState {
  // Current settings
  selectedModel: AIModel;
  serviceMode: ServiceMode;
  reasoningLevel: ReasoningLevel;

  // Conversations
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Message[];

  // UI State
  sidebarOpen: boolean;
  isGenerating: boolean;
  
  // Cloud Sync State
  isSyncing: boolean;
  lastSyncAt: string | null;

  activeQuizProgress: { current: number; total: number } | null;
  activePdfProgress: { current: number; total: number } | null;
  omniStates: Record<string, any>; // Persisted omniStates
  activeGenerationId: string | null;
  streamingContentMap: Record<string, string>;
  streamingReasoningMap: Record<string, string>;

  // Actions
  setSelectedModel: (model: AIModel) => void;
  setServiceMode: (mode: ServiceMode) => void;
  setReasoningLevel: (level: ReasoningLevel) => void;
  setSidebarOpen: (open: boolean) => void;
  setIsGenerating: (generating: boolean) => void;
  setActiveGenerationId: (id: string | null) => void;
  setActiveQuizProgress: (progress: { current: number; total: number } | null) => void;
  setActivePdfProgress: (progress: { current: number; total: number } | null) => void;
  setOmniState: (convId: string, state: any) => void;
  setStreamingContentForConv: (convId: string, contentOrFn: string | ((prev: string) => string)) => void;
  setStreamingReasoningForConv: (convId: string, reasoningOrFn: string | ((prev: string) => string)) => void;

  // Conversation actions
  createConversation: () => string;
  setActiveConversation: (id: string | null) => void;
  addMessage: (conversationId: string, message: Message) => void;
  updateConversationTitle: (id: string, title: string) => void;
  deleteConversation: (id: string) => void;
  getActiveConversation: () => Conversation | undefined;
  getMessages: () => Message[];
  
  // Cloud Sync Actions
  loadFromCloud: (userId: string) => Promise<void>;
  syncToCloud: (userId: string, conversation: Conversation) => void;
  setConversations: (conversations: Conversation[]) => void;
  clearStore: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      selectedModel: "apex-flash",
      serviceMode: "standard",
      reasoningLevel: "none",
      conversations: [],
      activeConversationId: null,
      messages: [], // Add this line
      sidebarOpen: true,
      isGenerating: false,
      activeQuizProgress: null,
      activePdfProgress: null,
      omniStates: {},
      activeGenerationId: null,
      streamingContentMap: {},
      streamingReasoningMap: {},
      
      // Cloud Sync State
      isSyncing: false,
      lastSyncAt: null,

      setSelectedModel: (model) => {
        set((state) => {
          const activeId = state.activeConversationId;
          let updatedConversations = state.conversations;
          if (activeId) {
            updatedConversations = state.conversations.map((conv) =>
              conv.id === activeId ? { ...conv, model, updatedAt: Date.now() } : conv
            );
            const updatedConv = updatedConversations.find(c => c.id === activeId);
            if (updatedConv) {
              import("./auth-store").then(({ useAuthStore }) => {
                const user = useAuthStore.getState().user;
                if (user?.uid) {
                  debouncedSaveConversation(user.uid, updatedConv);
                }
              });
            }
          }
          return { selectedModel: model, conversations: updatedConversations };
        });
      },
      setServiceMode: (mode) => set({ serviceMode: mode }),
      setReasoningLevel: (level) => set({ reasoningLevel: level }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setIsGenerating: (generating) => set({ isGenerating: generating }),
      setActiveGenerationId: (id) => set({ activeGenerationId: id }),
      setStreamingContentForConv: (convId, contentOrFn) => {
        set((state) => {
          const current = state.streamingContentMap[convId] || "";
          const nextContent = typeof contentOrFn === "function" ? contentOrFn(current) : contentOrFn;
          return { streamingContentMap: { ...state.streamingContentMap, [convId]: nextContent } };
        });
      },
      setStreamingReasoningForConv: (convId, reasoningOrFn) => {
        set((state) => {
          const current = state.streamingReasoningMap[convId] || "";
          const nextReasoning = typeof reasoningOrFn === "function" ? reasoningOrFn(current) : reasoningOrFn;
          return { streamingReasoningMap: { ...state.streamingReasoningMap, [convId]: nextReasoning } };
        });
      },
      setActiveQuizProgress: (progress) => {
        const current = get().activeQuizProgress;
        if (!current && !progress) return;
        if (current && progress && current.current === progress.current && current.total === progress.total) return;
        set({ activeQuizProgress: progress });
      },
      setActivePdfProgress: (progress) => {
        const current = get().activePdfProgress;
        if (!current && !progress) return;
        if (current && progress && current.current === progress.current && current.total === progress.total) return;
        set({ activePdfProgress: progress });
      },
      setOmniState: (convId, state) => {
        set((s) => {
          const next = { ...s.omniStates };
          if (state === null) {
            delete next[convId];
          } else {
            next[convId] = state;
          }
          return { omniStates: next };
        });
      },

      createConversation: () => {
        const id = crypto.randomUUID();
        const newConversation: Conversation = {
          id,
          title: "New Chat",
          messages: [],
          model: get().selectedModel,
          mode: get().serviceMode,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((state) => {
          const activeId = state.activeConversationId;
          let updatedConversations = state.conversations;

          // Prune previous active conversation if it had no messages
          if (activeId) {
            const prevConv = state.conversations.find((c) => c.id === activeId);
            if (prevConv && prevConv.messages.length === 0) {
              updatedConversations = state.conversations.filter((c) => c.id !== activeId);
              import("./auth-store").then(({ useAuthStore }) => {
                const user = useAuthStore.getState().user;
                if (user?.uid) {
                  cloudDeleteConversation(user.uid, activeId);
                }
              });
            }
          }

          return {
            conversations: [newConversation, ...updatedConversations],
            activeConversationId: id,
          };
        });
        return id;
      },

      setActiveConversation: (id) => {
        set((state) => {
          const activeId = state.activeConversationId;
          let updatedConversations = state.conversations;

          // Prune previous active conversation if it had no messages
          if (activeId && activeId !== id) {
            const prevConv = state.conversations.find((c) => c.id === activeId);
            if (prevConv && prevConv.messages.length === 0) {
              updatedConversations = state.conversations.filter((c) => c.id !== activeId);
              import("./auth-store").then(({ useAuthStore }) => {
                const user = useAuthStore.getState().user;
                if (user?.uid) {
                  cloudDeleteConversation(user.uid, activeId);
                }
              });
            }
          }

          const conv = updatedConversations.find((c) => c.id === id);
          const nextModel = conv?.model || state.selectedModel;
          return {
            conversations: updatedConversations,
            activeConversationId: id,
            selectedModel: nextModel,
            activeQuizProgress: null,
          };
        });
      },

      addMessage: (conversationId, message) => {
        set((state) => {
          const updatedConversations = state.conversations.map((conv) =>
            conv.id === conversationId
              ? {
                ...conv,
                messages: [...conv.messages, message],
                updatedAt: Date.now(),
                title:
                  conv.messages.length === 0 && message.role === "user"
                    ? message.content.slice(0, 40) + (message.content.length > 40 ? "..." : "")
                    : conv.title,
              }
              : conv
          );
          
          // Trigger cloud sync for the updated conversation
          const updatedConv = updatedConversations.find(c => c.id === conversationId);
          if (updatedConv) {
            import("./auth-store").then(({ useAuthStore }) => {
              const user = useAuthStore.getState().user;
              if (user?.uid) {
                debouncedSaveConversation(user.uid, updatedConv);
              }
            });
          }
          
          return { conversations: updatedConversations };
        });
      },

      updateConversationTitle: (id, title) => {
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === id ? { ...conv, title } : conv
          ),
        }));
      },

      deleteConversation: (id) => {
        const state = get();
        
        // Trigger cloud delete (fire and forget)
        import("./auth-store").then(({ useAuthStore }) => {
          const user = useAuthStore.getState().user;
          if (user?.uid) {
            cloudDeleteConversation(user.uid, id);
          }
        });
        
        const newConversations = state.conversations.filter((c) => c.id !== id);
        const nextOmniStates = { ...state.omniStates };
        delete nextOmniStates[id];

        set({
          conversations: newConversations,
          omniStates: nextOmniStates,
          activeConversationId:
            state.activeConversationId === id
              ? newConversations[0]?.id || null
              : state.activeConversationId,
        });
      },

      getActiveConversation: () => {
        const state = get();
        return state.conversations.find((c) => c.id === state.activeConversationId);
      },

      getMessages: () => {
        const activeConv = get().conversations.find((c) => c.id === get().activeConversationId);
        return activeConv?.messages || [];
      },
      
      // CLOUD SYNC ACTIONS
      loadFromCloud: async (userId) => {
        if (!userId) return;
        
        set({ isSyncing: true });
        
        try {
          const cloudConversations = await fetchConversationsFromCloud(userId);
          const localConversations = get().conversations;
          
          // Merge cloud and local, preferring most recent
          const merged = mergeConversations(localConversations, cloudConversations);
          
          // Prune empty conversations (except the currently active one)
          const activeId = get().activeConversationId;
          const prunedMerged = merged.filter(c => c.messages.length > 0 || c.id === activeId);
          
          set({ 
            conversations: prunedMerged,
            isSyncing: false,
            lastSyncAt: new Date().toISOString()
          });
        } catch (error) {
          // Graceful degradation - don't crash on sync errors
          console.warn("[Store] Failed to load from cloud, using local cache:", error);
          set({ isSyncing: false });
          // Keep local conversations, don't clear them
        }
      },
      
      syncToCloud: (userId, conversation) => {
        if (!userId) return;
        debouncedSaveConversation(userId, conversation);
      },
      
      setConversations: (conversations) => {
        set({ conversations });
      },
      clearStore: () => {
        set({ conversations: [], activeConversationId: null, messages: [], omniStates: {} });
      },
    }),
    {
      name: "apexchat-storage",
      partialize: (state) => ({
        selectedModel: state.selectedModel,
        serviceMode: state.serviceMode,
        reasoningLevel: state.reasoningLevel,
        conversations: state.conversations,
        activeConversationId: state.activeConversationId,
        messages: state.messages,
        omniStates: state.omniStates
      }),
    }
  )
);
