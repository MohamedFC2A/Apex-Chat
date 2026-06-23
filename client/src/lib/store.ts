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

  // Actions
  setSelectedModel: (model: AIModel) => void;
  setServiceMode: (mode: ServiceMode) => void;
  setReasoningLevel: (level: ReasoningLevel) => void;
  setSidebarOpen: (open: boolean) => void;
  setIsGenerating: (generating: boolean) => void;

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
      
      // Cloud Sync State
      isSyncing: false,
      lastSyncAt: null,

      setSelectedModel: (model) => set({ selectedModel: model }),
      setServiceMode: (mode) => set({ serviceMode: mode }),
      setReasoningLevel: (level) => set({ reasoningLevel: level }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setIsGenerating: (generating) => set({ isGenerating: generating }),

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
        set((state) => ({
          conversations: [newConversation, ...state.conversations],
          activeConversationId: id,
        }));
        return id;
      },

      setActiveConversation: (id) => set({ activeConversationId: id }),

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
        set({
          conversations: newConversations,
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
          
          set({ 
            conversations: merged,
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
    }),
    {
      name: "apexchat-storage",
      partialize: (state) => ({
        selectedModel: state.selectedModel,
        serviceMode: state.serviceMode,
        reasoningLevel: state.reasoningLevel,
        conversations: state.conversations,
        activeConversationId: state.activeConversationId,
        messages: state.messages
      }),
    }
  )
);
