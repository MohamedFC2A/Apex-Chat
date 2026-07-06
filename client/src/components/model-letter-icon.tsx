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

  let textClass = "text-white/95";

  if (model === "apex-omni") {
    textClass = "gold-metallic-text font-black";
  } else if (model === "apex-unbound") {
    textClass = "silver-metallic-text font-black";
  }

  // Make the font size larger to fill the space cleanly and look extremely clear
  const fontSize = size === 26 ? "13.5px" : "17.5px";

  return (
    <div
      className={cn(
        "flex items-center justify-center shrink-0 transition-all duration-300 select-none bg-transparent border-0 shadow-none outline-none",
        isStreaming && "scale-110",
        className
      )}
      style={{
        width: `${size}px`,
        height: `${size}px`,
      }}
    >
      <span
        className={cn("font-pixel leading-none tracking-tighter text-center font-bold", textClass)}
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
