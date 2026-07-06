import React from "react";
import { cn } from "@/lib/utils";
import type { AIModel } from "@shared/schema";

export interface ModelLetterIconProps {
  model: AIModel;
  className?: string;
  size?: number; // size in pixels, default is 26
  isStreaming?: boolean;
}

const modelLetters: Record<AIModel, string> = {
  "apex-flash": "FL",
  "apex-pro": "PR",
  "apex-elite": "EL",
  "apex-omni": "OM",
  "apex-unbound": "UN",
};

export function ModelLetterIcon({
  model,
  className,
  size = 26,
  isStreaming,
}: ModelLetterIconProps) {
  const letters = modelLetters[model] || "AI";

  let boxClass = "standard-pixel-box";
  let textClass = "text-white";

  if (model === "apex-omni") {
    boxClass = "gold-metallic-box";
    textClass = "gold-metallic-text font-black";
  } else if (model === "apex-unbound") {
    boxClass = "silver-metallic-box";
    textClass = "silver-metallic-text font-black";
  }

  // Adjust font size proportionally to block size
  const fontSize = size === 26 ? "8.5px" : "10px";

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-[6px] shrink-0 transition-all duration-300 select-none",
        boxClass,
        isStreaming && "ring-1 ring-white/20 scale-105",
        className
      )}
      style={{
        width: `${size}px`,
        height: `${size}px`,
      }}
    >
      <span
        className={cn("font-pixel leading-none tracking-tighter text-center", textClass)}
        style={{
          fontSize,
          imageRendering: "pixelated",
        }}
      >
        {letters}
      </span>
    </div>
  );
}
