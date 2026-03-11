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
import { Loader2, Sparkles } from "lucide-react";
import { MODEL_OPTIONS, LANGUAGE_OPTIONS } from "@/lib/constants/image-gen";
import { ImageModel } from "@/lib/types/generated-images";
import { FormatSplit } from "@/lib/types/generation-jobs";

export interface AiTakeoverFormData {
  brand_name: string;
  model: ImageModel;
  language: string;
  format_split: FormatSplit;
}

export function AiTakeoverForm({
  onSubmit,
  loading,
}: {
  onSubmit: (data: AiTakeoverFormData) => void;
  loading: boolean;
}) {
  const [brandName, setBrandName] = useState("");
  const [model, setModel] = useState<ImageModel>("gemini-pro-image");
  const [language, setLanguage] = useState("English");
  const [squareCount, setSquareCount] = useState(6);
  const [portraitCount, setPortraitCount] = useState(6);

  function handleSubmit() {
    if (!brandName.trim()) return;
    onSubmit({
      brand_name: brandName.trim(),
      model,
      language,
      format_split: { square: squareCount, portrait: portraitCount },
    });
  }

  const totalImages = squareCount + portraitCount;

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

      {/* Model + Language — side by side */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Image Model</label>
          <Select value={model} onValueChange={(v) => setModel(v as ImageModel)}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODEL_OPTIONS.map((m) => (
                <SelectItem key={m.value} value={m.value} className="text-xs">
                  {m.label} <span className="text-muted-foreground">· {m.desc}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Language</label>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGE_OPTIONS.map((lang) => (
                <SelectItem key={lang} value={lang} className="text-xs">
                  {lang}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Format Split */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Image Count by Format
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 border border-border rounded-sm flex-shrink-0" />
            <span className="text-xs text-muted-foreground">1:1</span>
            <Select value={String(squareCount)} onValueChange={(v) => setSquareCount(Number(v))}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0, 2, 3, 4, 6, 8].map((n) => (
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
            <Select value={String(portraitCount)} onValueChange={(v) => setPortraitCount(Number(v))}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0, 2, 3, 4, 6, 8].map((n) => (
                  <SelectItem key={n} value={String(n)} className="text-xs">
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Total: {totalImages} images
        </p>
      </div>

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={!brandName.trim() || totalImages === 0 || loading}
        className="w-full h-9 text-xs gap-1.5"
      >
        {loading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Generating Strategy...
          </>
        ) : (
          <>
            <Sparkles className="h-3.5 w-3.5" />
            Generate Strategy for {totalImages} Images
          </>
        )}
      </Button>
    </div>
  );
}
