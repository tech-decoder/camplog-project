"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Play, RotateCcw } from "lucide-react";
import { GenerationStrategy } from "@/lib/types/generation-jobs";
import { AD_STYLES } from "@/lib/constants/image-gen";

const STYLE_COLORS: Record<string, string> = {
  graphic_text: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  storefront_card: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  uniform_style: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  inside_store: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

export function StrategyPreview({
  strategy,
  onExecute,
  onRegenerate,
  executing,
  regenerating,
}: {
  strategy: GenerationStrategy;
  onExecute: () => void;
  onRegenerate: () => void;
  executing: boolean;
  regenerating: boolean;
}) {
  return (
    <div className="space-y-4">
      {/* Brand Analysis */}
      <div className="px-3 py-2 rounded-lg bg-muted/50 border border-border">
        <p className="text-xs text-muted-foreground font-medium mb-1">Brand Analysis</p>
        <p className="text-sm leading-relaxed">{strategy.brand_analysis}</p>
      </div>

      {/* Distribution Summary */}
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(strategy.style_distribution).map(([style, count]) => {
          const styleInfo = AD_STYLES.find((s) => s.value === style);
          return (
            <Badge
              key={style}
              variant="secondary"
              className={`text-[11px] ${STYLE_COLORS[style] || ""}`}
            >
              {styleInfo?.label || style}: {count}
            </Badge>
          );
        })}
        <Badge variant="outline" className="text-[11px]">
          Total: {strategy.items.length}
        </Badge>
      </div>

      {/* Strategy Items Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {strategy.items.map((item) => {
          const styleInfo = AD_STYLES.find((s) => s.value === item.ad_style);
          return (
            <Card key={item.index} className="overflow-hidden">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-1.5">
                  <Badge
                    variant="secondary"
                    className={`text-[10px] px-1.5 ${STYLE_COLORS[item.ad_style] || ""}`}
                  >
                    {styleInfo?.label || item.ad_style}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] px-1.5">
                    {item.format}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs font-semibold leading-tight">{item.headline}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{item.subheadline}</p>
                </div>
                <Badge variant="secondary" className="text-[10px] bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                  {item.cta}
                </Badge>
                <p className="text-[10px] text-muted-foreground/70 leading-snug line-clamp-2">
                  {item.rationale}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={onRegenerate}
          disabled={executing || regenerating}
        >
          {regenerating ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RotateCcw className="h-3 w-3" />
          )}
          Regenerate Strategy
        </Button>
        <Button
          size="sm"
          className="h-8 text-xs gap-1.5 flex-1"
          onClick={onExecute}
          disabled={executing || regenerating}
        >
          {executing ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Starting Generation...
            </>
          ) : (
            <>
              <Play className="h-3 w-3" />
              Generate {strategy.items.length} Images
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
