import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AIModel, ServiceMode, ReasoningLevel, Message, Conversation } from "@shared/schema";

interface ChatState {
  // Current settings
  selectedModel: AIModel;
  serviceMode: ServiceMode;
  reasoningLevel: ReasoningLevel;
  
  // Conversations
  conversations: Conversation[];
  activeConversationId: string | null;
  
  // UI State
  sidebarOpen: boolean;
  isGenerating: boolean;
  
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
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      selectedModel: "gpt-4o",
      serviceMode: "standard",
      reasoningLevel: "none",
      conversations: [],
      activeConversationId: null,
      sidebarOpen: true,
      isGenerating: false,

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
        set((state) => ({
          conversations: state.conversations.map((conv) =>
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
          ),
        }));
      },

      updateConversationTitle: (id, title) => {
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === id ? { ...conv, title } : conv
          ),
        }));
      },

      deleteConversation: (id) => {
        set((state) => {
          const newConversations = state.conversations.filter((c) => c.id !== id);
          return {
            conversations: newConversations,
            activeConversationId:
              state.activeConversationId === id
                ? newConversations[0]?.id || null
                : state.activeConversationId,
          };
        });
      },

      getActiveConversation: () => {
        const state = get();
        return state.conversations.find((c) => c.id === state.activeConversationId);
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
      }),
    }
  )
);
