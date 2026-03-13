"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Video } from "lucide-react";
import { LANGUAGE_OPTIONS } from "@/lib/constants/image-gen";
import { VIDEO_DURATION_OPTIONS } from "@/lib/constants/video-gen";
import { VideoDuration } from "@/lib/types/generation-jobs";

export interface VideoTakeoverFormData {
  brand_name: string;
  language: string;
  duration: VideoDuration;
  landscape_count: number;
  portrait_count: number;
}

export function VideoTakeoverForm({
  onSubmit,
  loading,
}: {
  onSubmit: (data: VideoTakeoverFormData) => void;
  loading: boolean;
}) {
  const [brandName, setBrandName] = useState("");
  const [language, setLanguage] = useState("English");
  const [duration, setDuration] = useState<VideoDuration>(4);
  const [landscapeCount, setLandscapeCount] = useState(3);
  const [portraitCount, setPortraitCount] = useState(3);

  const totalVideos = landscapeCount + portraitCount;
  const costPerVideo = duration * 0.15;
  const estimatedCost = (totalVideos * costPerVideo).toFixed(2);

  function handleSubmit() {
    if (!brandName.trim() || totalVideos === 0) return;
    onSubmit({
      brand_name: brandName.trim(),
      language,
      duration,
      landscape_count: landscapeCount,
      portrait_count: portraitCount,
    });
  }

  return (
    <div className="space-y-4">
      {/* Brand Name */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Brand Name</label>
        <Input
          placeholder="e.g. KFC, Nike, McDonald's..."
          value={brandName}
          onChange={(e) => setBrandName(e.target.value)}
          className="h-9"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
        />
      </div>

      {/* Language + Duration — side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="min-w-0 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Language</label>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="h-9 text-xs w-full overflow-hidden">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[60]">
              {LANGUAGE_OPTIONS.map((lang) => (
                <SelectItem key={lang} value={lang} className="text-xs">
                  {lang}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-0 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Duration</label>
          <Select
            value={String(duration)}
            onValueChange={(v) => setDuration(Number(v) as VideoDuration)}
          >
            <SelectTrigger className="h-9 text-xs w-full overflow-hidden">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VIDEO_DURATION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={String(opt.value)} className="text-xs">
                  {opt.label} <span className="text-muted-foreground">· {opt.cost}/video</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Format Split */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Video Count by Format
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-5 border border-border rounded-sm flex-shrink-0" />
            <span className="text-xs text-muted-foreground">16:9</span>
            <Select
              value={String(landscapeCount)}
              onValueChange={(v) => setLandscapeCount(Number(v))}
            >
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0, 1, 2, 3].map((n) => (
                  <SelectItem key={n} value={String(n)} className="text-xs">
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-6 border border-border rounded-sm flex-shrink-0" />
            <span className="text-xs text-muted-foreground">9:16</span>
            <Select
              value={String(portraitCount)}
              onValueChange={(v) => setPortraitCount(Number(v))}
            >
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0, 1, 2, 3].map((n) => (
                  <SelectItem key={n} value={String(n)} className="text-xs">
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Total: {totalVideos} videos · Est. cost: ~${estimatedCost}
        </p>
      </div>

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={!brandName.trim() || totalVideos === 0 || loading}
        className="w-full h-9 text-xs gap-1.5"
      >
        {loading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Generating Video Strategy...
          </>
        ) : (
          <>
            <Video className="h-3.5 w-3.5" />
            Generate Strategy for {totalVideos} Videos
          </>
        )}
      </Button>
    </div>
  );
}
