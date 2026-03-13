"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Play, RotateCcw } from "lucide-react";
import { GenerationStrategy, VideoGenerationStrategy } from "@/lib/types/generation-jobs";
import { AD_STYLES } from "@/lib/constants/image-gen";
import { VIDEO_AD_STYLES } from "@/lib/constants/video-gen";

const STYLE_COLORS: Record<string, string> = {
  graphic_text: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  storefront_card: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  uniform_style: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  inside_store: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  product_hero: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  ugc_testimonial: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  lifestyle_scene: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  food_sensory: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  breaking_news: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  storefront_flyby: "bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400",
};

function isVideoStrategy(s: GenerationStrategy | VideoGenerationStrategy): s is VideoGenerationStrategy {
  return s.items.length > 0 && "video_ad_style" in s.items[0];
}

export function StrategyPreview({
  strategy,
  onExecute,
  onRegenerate,
  executing,
  regenerating,
}: {
  strategy: GenerationStrategy | VideoGenerationStrategy;
  onExecute: () => void;
  onRegenerate: () => void;
  executing: boolean;
  regenerating: boolean;
}) {
  const isVideo = isVideoStrategy(strategy);
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
          const allStyles = isVideo ? VIDEO_AD_STYLES : AD_STYLES;
          const styleInfo = allStyles.find((s) => s.value === style);
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
          if (isVideo && "video_ad_style" in item) {
            const videoItem = item as VideoGenerationStrategy["items"][number];
            const styleInfo = VIDEO_AD_STYLES.find((s) => s.value === videoItem.video_ad_style);
            return (
              <Card key={videoItem.index} className="overflow-hidden">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant="secondary"
                      className={`text-[10px] px-1.5 ${STYLE_COLORS[videoItem.video_ad_style] || ""}`}
                    >
                      {styleInfo?.label || videoItem.video_ad_style}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] px-1.5">
                      {videoItem.aspect_ratio}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs font-semibold leading-tight">{videoItem.headline}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{videoItem.subheadline}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                    {videoItem.cta}
                  </Badge>
                  <p className="text-[10px] text-muted-foreground/70 leading-snug line-clamp-2">
                    {videoItem.rationale}
                  </p>
                </CardContent>
              </Card>
            );
          }

          const imageItem = item as GenerationStrategy["items"][number];
          const styleInfo = AD_STYLES.find((s) => s.value === imageItem.ad_style);
          return (
            <Card key={imageItem.index} className="overflow-hidden">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-1.5">
                  <Badge
                    variant="secondary"
                    className={`text-[10px] px-1.5 ${STYLE_COLORS[imageItem.ad_style] || ""}`}
                  >
                    {styleInfo?.label || imageItem.ad_style}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] px-1.5">
                    {imageItem.format}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs font-semibold leading-tight">{imageItem.headline}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{imageItem.subheadline}</p>
                </div>
                <Badge variant="secondary" className="text-[10px] bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                  {imageItem.cta}
                </Badge>
                <p className="text-[10px] text-muted-foreground/70 leading-snug line-clamp-2">
                  {imageItem.rationale}
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
              Generate {strategy.items.length} {isVideo ? "Videos" : "Images"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
