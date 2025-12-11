import { useChatStore } from "@/lib/store";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Brain, Zap } from "lucide-react";
import type { ReasoningLevel } from "@shared/schema";

export function ThinkingControls() {
  const { reasoningLevel, setReasoningLevel, isGenerating } = useChatStore();

  const handleThinkingChange = (checked: boolean) => {
    if (checked) {
      setReasoningLevel("thinking");
    } else {
      setReasoningLevel("none");
    }
  };

  const handleOverthinkingChange = (checked: boolean) => {
    if (checked) {
      setReasoningLevel("overthinking");
    } else {
      setReasoningLevel("thinking");
    }
  };

  const isThinking = reasoningLevel === "thinking" || reasoningLevel === "overthinking";
  const isOverthinking = reasoningLevel === "overthinking";

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <Switch
          id="thinking"
          checked={isThinking}
          onCheckedChange={handleThinkingChange}
          disabled={isGenerating}
          data-testid="switch-thinking"
        />
        <Label
          htmlFor="thinking"
          className="flex items-center gap-1.5 text-xs cursor-pointer text-muted-foreground"
        >
          <Brain className="w-3.5 h-3.5" />
          <span>Thinking</span>
        </Label>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id="overthinking"
          checked={isOverthinking}
          onCheckedChange={handleOverthinkingChange}
          disabled={isGenerating || !isThinking}
          className={isOverthinking ? "data-[state=checked]:bg-orange-500" : ""}
          data-testid="switch-overthinking"
        />
        <Label
          htmlFor="overthinking"
          className={`flex items-center gap-1.5 text-xs cursor-pointer ${
            isOverthinking ? "text-orange-500" : "text-muted-foreground"
          } ${!isThinking ? "opacity-50" : ""}`}
        >
          <Zap className={`w-3.5 h-3.5 ${isOverthinking ? "animate-pulse-brain" : ""}`} />
          <span>Deep Research</span>
        </Label>
      </div>
    </div>
  );
}

export function PulsingBrainIndicator() {
  const { reasoningLevel, isGenerating } = useChatStore();
  
  if (reasoningLevel !== "overthinking" || !isGenerating) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-orange-500/10 text-orange-500">
      <Brain className="w-4 h-4 animate-pulse-brain" />
      <span className="text-xs font-medium">Deep Analysis</span>
    </div>
  );
}
