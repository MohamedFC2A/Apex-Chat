import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { AIModel } from "@shared/schema";
import type { TierConfig } from "@/lib/tier-tokens";
import { ModelCard } from "./model-card";

export interface TierSectionProps {
  tier: TierConfig;
  models: AIModel[];
  selectedModel: AIModel;
  canAccessModel: (model: AIModel) => boolean;
  onSelect: (model: AIModel) => void;
  onLocked: (name: string) => void;
}

export function TierSection({
  tier,
  models,
  selectedModel,
  canAccessModel,
  onSelect,
  onLocked,
}: TierSectionProps) {
  return (
    <div className="border-b border-white/[0.04] last:border-b-0 pb-1">
      {/* Tier header */}
      <div className="flex items-center gap-2 px-3.5 pt-3 pb-1.5">
        <span className="font-mono text-[9px] font-bold tracking-[0.2em] uppercase text-white/40">
          {tier.label}
        </span>

        <Badge
          variant="outline"
          className="font-mono text-[8px] font-semibold tracking-[0.1em] uppercase px-1.5 py-0 h-auto rounded border-white/[0.08] text-white/50 bg-white/[0.04] shrink-0"
        >
          {tier.tag}
        </Badge>

        <Separator
          className="flex-1"
          style={{
            background: "linear-gradient(90deg, rgba(255,255,255,0.05) 0%, transparent 100%)",
          }}
        />
      </div>

      {/* Model cards */}
      <div className="px-2 pb-1">
        {models.map((model) => (
          <ModelCard
            key={model}
            model={model}
            isSelected={model === selectedModel}
            canAccess={canAccessModel(model)}
            onSelect={onSelect}
            onLocked={onLocked}
          />
        ))}
      </div>
    </div>
  );
}
