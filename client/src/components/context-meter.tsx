import { useChatStore } from "@/lib/store";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import React from "react";
import { cn } from "@/lib/utils";

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

  // Pixel blocks configuration
  const totalBlocks = 20;
  const activeBlocks = Math.round((percentage / 100) * totalBlocks);

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
                className="stroke-zinc-400 transition-all duration-500"
                strokeWidth="4"
                fill="transparent"
                strokeDasharray="100"
                strokeDashoffset={100 - Math.max(0.1, Math.min(100, percentage))}
              />
            </svg>
            <span className="text-[9px] font-mono font-bold text-zinc-300 absolute leading-none">
              {percentage < 1 ? percentage.toFixed(1) : Math.round(percentage)}%
            </span>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 bg-neutral-950 border border-zinc-800 rounded-lg p-4 shadow-2xl z-[100] font-mono" align="end">
        <div className="space-y-3 font-mono text-right" dir="rtl">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
            <span className="text-[10px] font-black text-white uppercase tracking-widest">نافذة السياق الذكية</span>
            <span className="text-[8px] font-bold border border-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">AUTO</span>
          </div>
          <div className="space-y-1.5 font-mono text-[10px]">
            <div className="flex justify-between">
              <span className="text-zinc-500 font-bold uppercase tracking-wider">حجم الاستهلاك:</span>
              <span className="text-zinc-300 font-bold">{formattedPercent}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500 font-bold uppercase tracking-wider">الرموز المستخدمة (Tokens):</span>
              <span className="text-zinc-300 font-bold">
                {usedTokens.toLocaleString()} / 1,000,000
              </span>
            </div>
          </div>
          
          {/* Unifed Retro Pixel Grid Progress Bar */}
          <div className="flex gap-[1.5px] w-full py-1">
            {Array.from({ length: totalBlocks }).map((_, i) => {
              const isActive = i < activeBlocks;
              return (
                <div
                  key={i}
                  className={cn(
                    "flex-1 h-3 transition-all duration-300",
                    isActive ? "bg-white" : "bg-zinc-900"
                  )}
                />
              );
            })}
          </div>
          
          <p className="text-[9px] text-zinc-500 leading-normal font-bold uppercase tracking-wider">
            يتم حساب استهلاك الرموز (Tokens) تلقائياً لتوفير أفضل دقة وسرعة استجابة مع الحفاظ على ترابط المحادثة بالكامل.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
