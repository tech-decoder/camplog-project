"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Lightbulb } from "lucide-react";
import { GenerationJob } from "@/lib/types/generation-jobs";
import { GeneratedImage } from "@/lib/types/generated-images";
import { isPortraitDimension } from "@/lib/constants/image-gen";
import Image from "next/image";

const TIPS = [
  "Top performers test 50+ creatives per week",
  "9:16 portrait ads get 20-30% more engagement on Stories",
  "The first 3 seconds determine if someone stops scrolling",
  "Ads with clear CTAs convert 2.5x better",
  "The best ad creative is the one you haven't tested yet",
  "Facebook rewards ad accounts that consistently test new creatives",
  "Video ads under 15 seconds have the highest completion rates",
  "Dark backgrounds make text pop. Great for scroll-stopping ads",
  "Users scroll 300 feet of content daily. Your ad needs to stop that thumb.",
  "The avg CPC drops 20% when you test 10+ creative variants",
  "Ad fatigue sets in after ~500 impressions per creative",
  "UGC-style ads outperform polished studio ads by 4x on TikTok",
  "Square 1:1 ads work best in Facebook Feed. Portrait 9:16 for Stories & Reels.",
  "The headline is 80% of your ad's success. The image gets attention, the copy gets the click.",
  "A/B testing your CTA button color can improve CTR by up to 21%",
  "Curiosity-gap headlines (\"Here's how...\") outperform direct claims by 3x",
  "Ads with human faces get 38% more engagement than those without",
  "The best-performing Meta ads load in under 3 seconds",
];

function RotatingTip() {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * TIPS.length));
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIdx((prev) => (prev + 1) % TIPS.length);
        setFade(true);
      }, 300);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
      <Lightbulb className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
      <p
        className={`text-xs text-amber-700/80 dark:text-amber-400/80 transition-opacity duration-300 ${
          fade ? "opacity-100" : "opacity-0"
        }`}
      >
        <span className="font-medium text-amber-700 dark:text-amber-400">Did you know?</span>{" "}
        {TIPS[idx]}
      </p>
    </div>
  );
}

export function GenerationProgress({
  job,
  images,
}: {
  job: GenerationJob;
  images: GeneratedImage[];
}) {
  const total = job.images_requested || 0;
  const completed = job.images_completed || 0;
  const failed = job.images_failed || 0;
  const progress = total > 0 ? ((completed + failed) / total) * 100 : 0;
  const isComplete = job.status === "completed" || job.status === "failed";
  const remaining = Math.max(0, total - completed - failed);

  // Build skeleton slots from format_split
  const skeletonSlots = (() => {
    if (isComplete || remaining <= 0) return [];
    const slots: { format: string }[] = [];
    const squareCount = job.format_split?.square || 0;
    const portraitCount = job.format_split?.portrait || 0;
    const squareDone = images.filter((img) => !isPortraitDimension(img.dimensions)).length;
    const portraitDone = images.filter((img) => isPortraitDimension(img.dimensions)).length;
    const squareRemaining = Math.max(0, squareCount - squareDone);
    const portraitRemaining = Math.max(0, portraitCount - portraitDone);
    for (let i = 0; i < squareRemaining; i++) slots.push({ format: "1:1" });
    for (let i = 0; i < portraitRemaining; i++) slots.push({ format: "9:16" });
    return slots;
  })();

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            {!isComplete ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            ) : job.status === "completed" ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <XCircle className="h-3.5 w-3.5 text-destructive" />
            )}
            <span className="font-medium">
              {isComplete
                ? job.status === "completed"
                  ? "Generation Complete"
                  : "Generation Failed"
                : "Generating Images..."}
            </span>
          </div>
          <span className="text-muted-foreground">
            {completed}/{total} completed
            {failed > 0 && <span className="text-destructive ml-1">({failed} failed)</span>}
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Rotating tips (only during generation) */}
      {!isComplete && <RotatingTip />}

      {/* Live Image Grid + Skeleton Slots */}
      {(images.length > 0 || skeletonSlots.length > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {images.map((img) => (
            <div
              key={img.id}
              className="relative rounded-lg overflow-hidden border border-border bg-muted animate-in fade-in zoom-in-95 duration-500"
            >
              <div className={isPortraitDimension(img.dimensions) ? "aspect-[9/16] max-h-[320px] mx-auto" : "aspect-square"}>
                <Image
                  src={img.image_url}
                  alt={img.headline_ref || "Generated image"}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div className="absolute top-1 left-1 flex gap-0.5">
                {img.ad_style && (
                  <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 bg-black/60 text-white border-0">
                    {img.ad_style}
                  </Badge>
                )}
              </div>
            </div>
          ))}

          {/* Skeleton placeholder slots */}
          {skeletonSlots.map((slot, i) => (
            <div
              key={`skeleton-${i}`}
              className="rounded-lg overflow-hidden border border-dashed border-border bg-muted/40"
            >
              <div
                className={`${
                  slot.format === "9:16" ? "aspect-[9/16] max-h-[320px] mx-auto" : "aspect-square"
                } flex items-center justify-center`}
              >
                <div className="flex flex-col items-center gap-1.5 animate-pulse">
                  <div className="h-6 w-6 rounded-full bg-muted-foreground/10" />
                  <div className="h-2 w-12 rounded bg-muted-foreground/10" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
