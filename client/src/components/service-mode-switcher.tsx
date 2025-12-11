import { useChatStore } from "@/lib/store";
import { MessageSquare, Code2, GraduationCap } from "lucide-react";
import type { ServiceMode } from "@shared/schema";

const modeConfig: Record<ServiceMode, { name: string; icon: typeof MessageSquare; shortName: string }> = {
  standard: {
    name: "Standard Chat",
    shortName: "Chat",
    icon: MessageSquare,
  },
  dev: {
    name: "Dev/Coder",
    shortName: "Code",
    icon: Code2,
  },
  education: {
    name: "Education/Tutor",
    shortName: "Learn",
    icon: GraduationCap,
  },
};

export function ServiceModeSwitcher() {
  const { serviceMode, setServiceMode, isGenerating } = useChatStore();

  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50">
      {(Object.entries(modeConfig) as [ServiceMode, typeof modeConfig[ServiceMode]][]).map(
        ([modeId, config]) => {
          const Icon = config.icon;
          const isActive = modeId === serviceMode;
          return (
            <button
              key={modeId}
              onClick={() => setServiceMode(modeId)}
              disabled={isGenerating}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover-elevate"
              } ${isGenerating ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              data-testid={`button-mode-${modeId}`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{config.shortName}</span>
            </button>
          );
        }
      )}
    </div>
  );
}
