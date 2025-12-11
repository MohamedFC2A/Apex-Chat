import { useEffect, useRef } from "react";
import { useChatStore } from "@/lib/store";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Sparkles, Brain, Zap, ChevronDown, ChevronRight, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import type { Message, AIModel } from "@shared/schema";

const modelIcons: Record<AIModel, typeof Sparkles> = {
  "gpt-4o": Sparkles,
  "claude-3.5-sonnet": Brain,
  "gemini-pro-1.5": Zap,
};

interface ChatMessagesProps {
  streamingContent?: string;
  streamingReasoning?: string;
}

export function ChatMessages({ streamingContent, streamingReasoning }: ChatMessagesProps) {
  const { getActiveConversation, serviceMode, isGenerating, selectedModel } = useChatStore();
  const conversation = getActiveConversation();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages, streamingContent]);

  if (!conversation || conversation.messages.length === 0) {
    return <EmptyState />;
  }

  const isDevMode = serviceMode === "dev";
  const containerClass = isDevMode ? "max-w-5xl" : "max-w-3xl";

  return (
    <div className={`w-full ${containerClass} mx-auto px-4 py-6 space-y-6`}>
      {conversation.messages.map((message) => (
        <MessageItem key={message.id} message={message} isDevMode={isDevMode} />
      ))}

      {isGenerating && (
        <div className="animate-fade-in">
          {streamingReasoning && (
            <ReasoningDisplay content={streamingReasoning} isStreaming />
          )}
          <AssistantMessage
            content={streamingContent || ""}
            model={selectedModel}
            isDevMode={isDevMode}
            isStreaming
          />
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}

function MessageItem({ message, isDevMode }: { message: Message; isDevMode: boolean }) {
  if (message.role === "user") {
    return <UserMessage content={message.content} />;
  }

  return (
    <div className="space-y-2">
      {message.reasoningContent && (
        <ReasoningDisplay content={message.reasoningContent} />
      )}
      <AssistantMessage
        content={message.content}
        model={message.model || "gpt-4o"}
        isDevMode={isDevMode}
      />
    </div>
  );
}

function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="flex items-start gap-3 max-w-2xl">
        <div className="rounded-2xl bg-primary text-primary-foreground px-4 py-3">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
        </div>
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarFallback className="bg-muted">
            <User className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
}

function AssistantMessage({
  content,
  model,
  isDevMode,
  isStreaming,
}: {
  content: string;
  model: AIModel;
  isDevMode: boolean;
  isStreaming?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const Icon = modelIcons[model];

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatContent = (text: string) => {
    if (!text) return null;
    
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts: Array<{ type: "text" | "code"; content: string; language?: string }> = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: "text", content: text.slice(lastIndex, match.index) });
      }
      parts.push({ type: "code", content: match[2], language: match[1] });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push({ type: "text", content: text.slice(lastIndex) });
    }

    return parts.map((part, i) => {
      if (part.type === "code") {
        return (
          <CodeBlock key={i} code={part.content} language={part.language} />
        );
      }
      return (
        <span key={i} className="whitespace-pre-wrap">
          {part.content}
        </span>
      );
    });
  };

  return (
    <div className="flex items-start gap-3 group">
      <Avatar className="w-8 h-8 flex-shrink-0">
        <AvatarFallback className="bg-primary/10">
          <Icon className="w-4 h-4 text-primary" />
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className={`text-sm leading-relaxed ${isDevMode ? "font-mono" : ""}`}>
          {formatContent(content)}
          {isStreaming && (
            <span className="inline-block w-0.5 h-4 ml-0.5 bg-foreground animate-stream-cursor" />
          )}
        </div>
        {!isStreaming && content && (
          <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-7 px-2 text-xs text-muted-foreground"
              data-testid="button-copy"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 mr-1" />
              ) : (
                <Copy className="w-3.5 h-3.5 mr-1" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-lg overflow-hidden bg-muted/50 border">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <span className="text-xs font-mono text-muted-foreground">{language || "code"}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-6 px-2 text-xs"
          data-testid="button-copy-code"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        </Button>
      </div>
      <pre className="p-4 overflow-x-auto">
        <code className="text-sm font-mono">{code.trim()}</code>
      </pre>
    </div>
  );
}

function ReasoningDisplay({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="ml-11 mb-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs text-muted-foreground hover-elevate px-2 py-1 rounded-md"
        data-testid="button-toggle-reasoning"
      >
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
        <Brain className="w-3.5 h-3.5" />
        <span>
          {isStreaming ? (
            <span className="flex items-center gap-1">
              Reasoning
              <span className="animate-typing-dot">.</span>
              <span className="animate-typing-dot" style={{ animationDelay: "0.2s" }}>.</span>
              <span className="animate-typing-dot" style={{ animationDelay: "0.4s" }}>.</span>
            </span>
          ) : (
            "View reasoning"
          )}
        </span>
      </button>
      {expanded && (
        <div className="mt-2 pl-4 border-l-2 border-muted text-xs text-muted-foreground font-mono whitespace-pre-wrap animate-fade-in">
          {content}
          {isStreaming && (
            <span className="inline-block w-0.5 h-3 ml-0.5 bg-muted-foreground animate-stream-cursor" />
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  const { serviceMode } = useChatStore();

  const getEmptyStateContent = () => {
    switch (serviceMode) {
      case "dev":
        return {
          title: "Ready to code",
          description: "Paste your code, describe bugs, or ask for implementations.",
        };
      case "education":
        return {
          title: "Let's learn together",
          description: "Ask questions and I'll guide you through step by step.",
        };
      default:
        return {
          title: "How can I help you today?",
          description: "Start a conversation with ApexChat.",
        };
    }
  };

  const { title, description } = getEmptyStateContent();

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6">
        <Sparkles className="w-8 h-8 text-primary" />
      </div>
      <h2 className="text-2xl font-semibold mb-2" data-testid="text-empty-title">{title}</h2>
      <p className="text-muted-foreground max-w-md" data-testid="text-empty-description">{description}</p>
    </div>
  );
}
