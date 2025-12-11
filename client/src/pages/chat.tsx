import { useState, useCallback } from "react";
import { useChatStore } from "@/lib/store";
import { ChatMessages } from "@/components/chat-messages";
import { ChatInput } from "@/components/chat-input";
import { apiRequest } from "@/lib/queryClient";
import type { Message, ChatResponse } from "@shared/schema";

export default function ChatPage() {
  const {
    activeConversationId,
    createConversation,
    addMessage,
    selectedModel,
    serviceMode,
    reasoningLevel,
    setIsGenerating,
    isGenerating,
  } = useChatStore();

  const [streamingContent, setStreamingContent] = useState("");
  const [streamingReasoning, setStreamingReasoning] = useState("");

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

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        timestamp: Date.now(),
      };

      addMessage(conversationId, userMessage);
      setIsGenerating(true);
      setStreamingContent("");
      setStreamingReasoning("");

      const conversationHistory = existingMessages.map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      try {
        const response = await apiRequest<ChatResponse>("POST", "/api/chat", {
          message: content,
          model: selectedModel,
          mode: serviceMode,
          reasoningLevel,
          conversationId,
          conversationHistory,
        });

        if (response.reasoningContent) {
          simulateStreaming(
            response.reasoningContent,
            setStreamingReasoning,
            30,
            () => {
              simulateStreaming(response.content, setStreamingContent, 15, () => {
                const assistantMessage: Message = {
                  id: response.id,
                  role: "assistant",
                  content: response.content,
                  model: selectedModel,
                  reasoningContent: response.reasoningContent,
                  timestamp: Date.now(),
                };
                addMessage(conversationId!, assistantMessage);
                setStreamingContent("");
                setStreamingReasoning("");
                setIsGenerating(false);
              });
            }
          );
        } else {
          simulateStreaming(response.content, setStreamingContent, 15, () => {
            const assistantMessage: Message = {
              id: response.id,
              role: "assistant",
              content: response.content,
              model: selectedModel,
              timestamp: Date.now(),
            };
            addMessage(conversationId!, assistantMessage);
            setStreamingContent("");
            setIsGenerating(false);
          });
        }
      } catch (error) {
        console.error("Failed to send message:", error);
        setIsGenerating(false);
        setStreamingContent("");
        setStreamingReasoning("");
      }
    },
    [
      activeConversationId,
      createConversation,
      addMessage,
      selectedModel,
      serviceMode,
      reasoningLevel,
      setIsGenerating,
    ]
  );

  const handleStopGenerating = useCallback(() => {
    setIsGenerating(false);
    setStreamingContent("");
    setStreamingReasoning("");
  }, [setIsGenerating]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <ChatMessages
          streamingContent={streamingContent}
          streamingReasoning={streamingReasoning}
        />
      </div>
      <div className="flex-shrink-0 py-4 border-t bg-background/80 backdrop-blur-sm">
        <ChatInput
          onSendMessage={handleSendMessage}
          onStopGenerating={handleStopGenerating}
        />
      </div>
    </div>
  );
}

function simulateStreaming(
  text: string,
  setContent: (content: string) => void,
  delayMs: number,
  onComplete: () => void
) {
  let index = 0;
  const words = text.split(" ");

  const interval = setInterval(() => {
    if (index < words.length) {
      setContent(words.slice(0, index + 1).join(" "));
      index++;
    } else {
      clearInterval(interval);
      onComplete();
    }
  }, delayMs);
}
