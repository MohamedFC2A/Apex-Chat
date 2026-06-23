import { useChatStore } from "@/lib/store";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Brain } from "lucide-react";
import React from "react";

// Smart automatic token estimator
export function estimateTokens(text: string): number {
  if (!text) return 0;
  // Detect if text contains Arabic characters
  const hasArabic = /[\u0600-\u06FF]/.test(text);
  if (hasArabic) {
    // Arabic characters average ~2.2 per token in cl100k_base
    return Math.ceil(text.length / 2.2);
  }
  // English characters average ~3.8 per token
  return Math.ceil(text.length / 3.8);
}

const EMPTY_MESSAGES: any[] = [];

export function ContextMeter() {
  const activeConversationId = useChatStore((state) => state.activeConversationId);
  const messages = useChatStore((state) => {
    const activeId = state.activeConversationId;
    const conv = state.conversations.find((c) => c.id === activeId);
    return conv?.messages ?? EMPTY_MESSAGES;
  });

  // Calculate used tokens: sum of all messages + base prompt tokens (approx. 1500)
  const usedTokens = messages.reduce((sum, m) => sum + estimateTokens(m.content), 0) + 1500;
  const totalLimit = 1000000; // 1M tokens limit
  const percentage = (usedTokens / totalLimit) * 100;
  const formattedPercent = percentage < 0.01 ? percentage.toFixed(3) : percentage.toFixed(2);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-muted/40 transition-colors"
          title={`Context Usage: ${formattedPercent}%`}
        >
          <div className="relative flex items-center justify-center w-9 h-9">
            <svg className="absolute w-9 h-9 -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="16"
                className="stroke-zinc-800"
                strokeWidth="4"
                fill="transparent"
              />
              <circle
                cx="18"
                cy="18"
                r="16"
                className="stroke-violet-400 transition-all duration-500"
                strokeWidth="4"
                fill="transparent"
                strokeDasharray="100"
                strokeDashoffset={100 - Math.max(0.1, Math.min(100, percentage))}
              />
            </svg>
            <span className="text-[9px] font-mono font-bold text-violet-300 absolute leading-none">
              {percentage < 1 ? percentage.toFixed(1) : Math.round(percentage)}%
            </span>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 bg-zinc-950/90 backdrop-blur-xl border border-zinc-800/80 rounded-xl p-4 shadow-xl z-[100]" align="end">
        <div className="space-y-3 font-arabic text-right" dir="rtl">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="text-xs font-semibold text-zinc-400">نافذة السياق الذكية</span>
            <span className="text-[10px] font-bold bg-violet-950/60 text-violet-400 border border-violet-900/50 px-1.5 py-0.5 rounded">Auto (تلقائي)</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">حجم الاستهلاك:</span>
              <span className="text-zinc-300 font-mono font-medium">{formattedPercent}%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">الرموز المستخدمة (Tokens):</span>
              <span className="text-zinc-300 font-mono font-medium">
                {usedTokens.toLocaleString()} / 1,000,000
              </span>
            </div>
          </div>
          
          {/* Mini progress bar */}
          <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800/50">
            <div 
              className="h-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(1, percentage))}%` }}
            />
          </div>
          
          <p className="text-[10px] text-zinc-500 leading-normal">
            يتم حساب استهلاك الرموز (Tokens) تلقائياً لتوفير أفضل دقة وسرعة استجابة مع الحفاظ على ترابط المحادثة بالكامل.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
