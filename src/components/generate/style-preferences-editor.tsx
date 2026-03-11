"use client";

import { cn } from "@/lib/utils";
import { AD_STYLES } from "@/lib/constants/image-gen";
import { StylePreferenceEntry, AdStyle } from "@/lib/types/generation-jobs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DEFAULT_PREFERENCES: StylePreferenceEntry[] = AD_STYLES.map((s) => ({
  style: s.value as AdStyle,
  weight: 3,
  enabled: true,
}));

export function StylePreferencesEditor({
  value,
  onChange,
}: {
  value: StylePreferenceEntry[];
  onChange: (prefs: StylePreferenceEntry[]) => void;
}) {
  const prefs = value.length > 0 ? value : DEFAULT_PREFERENCES;

  function toggleStyle(style: AdStyle) {
    onChange(
      prefs.map((p) =>
        p.style === style ? { ...p, enabled: !p.enabled } : p
      )
    );
  }

  function setWeight(style: AdStyle, weight: number) {
    onChange(
      prefs.map((p) =>
        p.style === style ? { ...p, weight } : p
      )
    );
  }

  return (
    <div className="space-y-2">
      {prefs.map((pref) => {
        const styleInfo = AD_STYLES.find((s) => s.value === pref.style);
        if (!styleInfo) return null;
        return (
          <div
            key={pref.style}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors",
              pref.enabled
                ? "border-primary/40 bg-primary/5"
                : "border-border opacity-50"
            )}
          >
            <button
              onClick={() => toggleStyle(pref.style)}
              className={cn(
                "w-4 h-4 rounded border-2 flex-shrink-0 transition-colors",
                pref.enabled
                  ? "bg-primary border-primary"
                  : "bg-transparent border-muted-foreground/40"
              )}
            >
              {pref.enabled && (
                <svg className="w-full h-full text-primary-foreground" viewBox="0 0 16 16" fill="none">
                  <path d="M4 8L7 11L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium">{styleInfo.label}</p>
              <p className="text-[10px] text-muted-foreground truncate">{styleInfo.description}</p>
            </div>
            {pref.enabled && (
              <Select
                value={String(pref.weight)}
                onValueChange={(v) => setWeight(pref.style, Number(v))}
              >
                <SelectTrigger className="h-7 w-16 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((w) => (
                    <SelectItem key={w} value={String(w)} className="text-xs">
                      ×{w}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        );
      })}
    </div>
  );
}
