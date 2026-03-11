"use client";

import { cn } from "@/lib/utils";
import { Zap, Palette, Trophy } from "lucide-react";
import { GenerationMode } from "@/lib/types/generation-jobs";

const MODES: {
  value: GenerationMode;
  label: string;
  description: string;
  icon: typeof Zap;
}[] = [
  {
    value: "ai_takeover",
    label: "AI Takeover",
    description: "AI decides everything",
    icon: Zap,
  },
  {
    value: "custom",
    label: "Custom",
    description: "Your style preferences",
    icon: Palette,
  },
  {
    value: "winning_variants",
    label: "Winning Variants",
    description: "Variants from winners",
    icon: Trophy,
  },
];

export function ModeSelector({
  value,
  onChange,
}: {
  value: GenerationMode;
  onChange: (mode: GenerationMode) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {MODES.map((mode) => {
        const isActive = value === mode.value;
        return (
          <button
            key={mode.value}
            onClick={() => onChange(mode.value)}
            className={cn(
              "flex flex-col items-center gap-1.5 px-3 py-3 rounded-lg border text-center transition-all",
              isActive
                ? "border-primary bg-primary/5 text-primary shadow-sm"
                : "border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
            )}
          >
            <mode.icon className={cn("h-4 w-4", isActive && "text-primary")} />
            <span className="text-xs font-medium">{mode.label}</span>
            <span className="text-[10px] leading-tight opacity-70 hidden sm:block">{mode.description}</span>
          </button>
        );
      })}
    </div>
  );
}
