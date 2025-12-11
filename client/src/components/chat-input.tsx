import { useState, useRef, useEffect, useCallback } from "react";
import { useChatStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { ThinkingControls } from "./thinking-controls";
import { Paperclip, ArrowUp, Square } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onStopGenerating?: () => void;
}

export function ChatInput({ onSendMessage, onStopGenerating }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isGenerating, serviceMode } = useChatStore();

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
    <div className="w-full max-w-3xl mx-auto px-4">
      <div className="flex items-center gap-3 mb-3">
        <ThinkingControls />
      </div>
      
      <div className="relative flex items-end gap-2 p-3 rounded-2xl border bg-card border-border">
        <Button
          variant="ghost"
          size="icon"
          className="flex-shrink-0 text-muted-foreground"
          disabled={isGenerating}
          data-testid="button-attach"
        >
          <Paperclip className="w-5 h-5" />
        </Button>

        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            serviceMode === "dev"
              ? "Describe your code problem or paste code..."
              : serviceMode === "education"
              ? "Ask a question to learn something new..."
              : "Message ApexChat..."
          }
          disabled={isGenerating}
          className={`flex-1 resize-none bg-transparent border-0 focus:outline-none focus:ring-0 text-sm leading-relaxed min-h-[24px] max-h-[200px] py-1 ${
            serviceMode === "dev" ? "font-mono" : ""
          }`}
          rows={1}
          data-testid="input-message"
        />

        {isGenerating ? (
          <Button
            size="icon"
            variant="ghost"
            onClick={onStopGenerating}
            className="flex-shrink-0 w-9 h-9 rounded-full bg-muted"
            data-testid="button-stop"
          >
            <Square className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            size="icon"
            onClick={handleSubmit}
            disabled={!hasText}
            className={`flex-shrink-0 w-9 h-9 rounded-full transition-colors ${
              hasText
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
            data-testid="button-send"
          >
            <ArrowUp className="w-4 h-4" />
          </Button>
        )}
      </div>

      <p className="text-xs text-center text-muted-foreground mt-3">
        ApexChat can make mistakes. Consider checking important information.
      </p>
    </div>
  );
}
