import { useChatStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Sparkles, Brain, Zap } from "lucide-react";
import type { AIModel } from "@shared/schema";

const modelConfig: Record<AIModel, { name: string; icon: typeof Sparkles; description: string }> = {
  "gpt-4o": {
    name: "GPT-4o",
    icon: Sparkles,
    description: "OpenAI's most capable model",
  },
  "claude-3.5-sonnet": {
    name: "Claude 3.5 Sonnet",
    icon: Brain,
    description: "Anthropic's balanced powerhouse",
  },
  "gemini-pro-1.5": {
    name: "Gemini Pro 1.5",
    icon: Zap,
    description: "Google's advanced reasoning",
  },
};

export function ModelSelector() {
  const { selectedModel, setSelectedModel, isGenerating } = useChatStore();
  const currentModel = modelConfig[selectedModel];
  const Icon = currentModel.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          disabled={isGenerating}
          className="gap-2 px-3 h-9 text-sm font-medium"
          data-testid="button-model-selector"
        >
          <Icon className="w-4 h-4" />
          <span>{currentModel.name}</span>
          <ChevronDown className="w-3.5 h-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 p-2">
        {(Object.entries(modelConfig) as [AIModel, typeof modelConfig[AIModel]][]).map(
          ([modelId, config]) => {
            const ModelIcon = config.icon;
            const isSelected = modelId === selectedModel;
            return (
              <DropdownMenuItem
                key={modelId}
                onClick={() => setSelectedModel(modelId)}
                className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer ${
                  isSelected ? "bg-accent" : ""
                }`}
                data-testid={`menu-item-model-${modelId}`}
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted">
                  <ModelIcon className="w-4 h-4" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{config.name}</span>
                  <span className="text-xs text-muted-foreground">{config.description}</span>
                </div>
              </DropdownMenuItem>
            );
          }
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
