"use client";

import { useState, useEffect, useRef } from "react";
import { Timer, Zap } from "lucide-react";

const PHASE_MESSAGES: { maxSeconds: number; messages: string[] }[] = [
  {
    maxSeconds: 10,
    messages: [
      "Warming up the creative engines...",
      "Firing up the pixel forge...",
      "Assembling the dream team of AI artists...",
    ],
  },
  {
    maxSeconds: 25,
    messages: [
      "Your AI creative team is sketching ideas...",
      "Mixing the perfect color palette...",
      "The AI is having a creative breakthrough...",
    ],
  },
  {
    maxSeconds: 60,
    messages: [
      "Still faster than briefing a real designer...",
      "Each pixel is being hand-crafted by tiny robots...",
      "This is the part where the magic happens...",
    ],
  },
  {
    maxSeconds: 90,
    messages: [
      "Rome wasn't built in a day, but your ads will be...",
      "Good things take time. Great ads take a bit more.",
      "The AI is adding those finishing touches...",
    ],
  },
  {
    maxSeconds: 120,
    messages: [
      "Almost there, quality can't be rushed...",
      "Your competitors are still opening Canva...",
      "This batch is getting the VIP treatment...",
    ],
  },
  {
    maxSeconds: Infinity,
    messages: [
      "This batch is getting the VIP treatment...",
      "Still going... must be a masterpiece...",
      "The AI is being extra perfectionist today...",
    ],
  },
];

function getPhaseMessage(seconds: number): string {
  const phase = PHASE_MESSAGES.find((p) => seconds < p.maxSeconds) || PHASE_MESSAGES[PHASE_MESSAGES.length - 1];
  const idx = Math.floor(seconds / 8) % phase.messages.length;
  return phase.messages[idx];
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/**
 * Page-level timer that tracks the full pipeline.
 * `startTimestamp` = Date.now() when user clicks "Generate Strategy"
 * `isComplete` = true when all images are done
 */
export function GenerationTimer({
  startTimestamp,
  isComplete,
  totalImages,
}: {
  startTimestamp: number;
  isComplete: boolean;
  totalImages: number;
}) {
  const [elapsed, setElapsed] = useState(0);
  const endTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (isComplete && !endTimeRef.current) {
      endTimeRef.current = Date.now();
      setElapsed(Math.max(0, Math.round((endTimeRef.current - startTimestamp) / 1000)));
      return;
    }

    if (isComplete) return;

    // Tick every second
    const interval = setInterval(() => {
      setElapsed(Math.max(0, Math.round((Date.now() - startTimestamp) / 1000)));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTimestamp, isComplete]);

  const perImage = totalImages > 0 ? Math.round(elapsed / totalImages) : 0;

  if (isComplete) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-green-500/10 border border-green-500/20">
        <Zap className="h-4 w-4 text-green-500 flex-shrink-0" />
        <p className="text-xs text-green-700 dark:text-green-400">
          <span className="font-semibold">Done in {formatDuration(elapsed)}</span>
          {totalImages > 0 && (
            <span className="text-green-600/80 dark:text-green-400/80">
              {" · "}{totalImages} images at ~{perImage}s each. Try doing that with Canva
            </span>
          )}
          <span className="ml-0.5">
            {elapsed < 60 ? " \u26A1" : elapsed < 120 ? " \uD83D\uDE0F" : " \uD83D\uDCAA"}
          </span>
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-primary/5 border border-primary/10">
      <Timer className="h-4 w-4 text-primary flex-shrink-0 animate-pulse" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground truncate">
          {getPhaseMessage(elapsed)}
        </p>
      </div>
      <span className="text-xs font-mono text-muted-foreground tabular-nums flex-shrink-0">
        {formatDuration(elapsed)}
      </span>
    </div>
  );
}
