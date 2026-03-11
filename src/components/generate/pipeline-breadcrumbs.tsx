"use client";

import {
  Settings2,
  Brain,
  ImageIcon,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";

type PageStep = "form" | "strategy" | "generating" | "complete";

const STEPS: { key: PageStep; label: string; icon: typeof Settings2 }[] = [
  { key: "form", label: "Configure", icon: Settings2 },
  { key: "strategy", label: "Strategy", icon: Brain },
  { key: "generating", label: "Generating", icon: ImageIcon },
  { key: "complete", label: "Complete", icon: CheckCircle2 },
];

function stepIndex(step: PageStep): number {
  return STEPS.findIndex((s) => s.key === step);
}

export function PipelineBreadcrumbs({
  currentStep,
  onNavigate,
}: {
  currentStep: PageStep;
  onNavigate?: (step: PageStep) => void;
}) {
  const currentIdx = stepIndex(currentStep);

  return (
    <nav className="flex items-center gap-1" aria-label="Generation pipeline">
      {STEPS.map((step, idx) => {
        const Icon = step.icon;
        const isCurrent = idx === currentIdx;
        const isPast = idx < currentIdx;
        const isFuture = idx > currentIdx;
        const canClick = isPast && !!onNavigate;

        return (
          <div key={step.key} className="flex items-center gap-1">
            {idx > 0 && (
              <ChevronRight
                className={`h-3 w-3 flex-shrink-0 ${
                  isPast || isCurrent ? "text-primary/40" : "text-muted-foreground/30"
                }`}
              />
            )}
            <button
              type="button"
              disabled={!canClick}
              onClick={() => canClick && onNavigate?.(step.key)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                isCurrent
                  ? "bg-primary/10 text-primary"
                  : isPast
                  ? "text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                  : "text-muted-foreground/40 cursor-default"
              } ${isFuture ? "pointer-events-none" : ""}`}
            >
              <Icon
                className={`h-3.5 w-3.5 flex-shrink-0 ${
                  isCurrent
                    ? "text-primary"
                    : isPast
                    ? "text-green-500"
                    : "text-muted-foreground/30"
                }`}
              />
              <span className="hidden sm:inline">{step.label}</span>
            </button>
          </div>
        );
      })}
    </nav>
  );
}
