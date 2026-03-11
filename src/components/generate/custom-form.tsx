"use client";

import { useState, useEffect } from "react";
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
import { MODEL_OPTIONS, LANGUAGE_OPTIONS, AD_STYLES } from "@/lib/constants/image-gen";
import { ImageModel } from "@/lib/types/generated-images";
import { FormatSplit, StylePreferenceEntry, AdStyle } from "@/lib/types/generation-jobs";
import { StylePreferencesEditor } from "./style-preferences-editor";

export interface CustomFormData {
  brand_name: string;
  model: ImageModel;
  language: string;
  format_split: FormatSplit;
  style_preferences: StylePreferenceEntry[];
}

const DEFAULT_PREFS: StylePreferenceEntry[] = AD_STYLES.map((s) => ({
  style: s.value as AdStyle,
  weight: 3,
  enabled: true,
}));

export function CustomForm({
  onSubmit,
  loading,
}: {
  onSubmit: (data: CustomFormData) => void;
  loading: boolean;
}) {
  const [brandName, setBrandName] = useState("");
  const [model, setModel] = useState<ImageModel>("gemini-pro-image");
  const [language, setLanguage] = useState("English");
  const [squareCount, setSquareCount] = useState(6);
  const [portraitCount, setPortraitCount] = useState(6);
  const [stylePrefs, setStylePrefs] = useState<StylePreferenceEntry[]>(DEFAULT_PREFS);
  const [loadingPrefs, setLoadingPrefs] = useState(true);

  // Load saved preferences
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/style-preferences");
        if (res.ok) {
          const { preferences } = await res.json();
          if (preferences?.styles?.length) {
            setStylePrefs(preferences.styles);
          }
          if (preferences?.default_language) {
            setLanguage(preferences.default_language);
          }
          if (preferences?.default_format_split) {
            setSquareCount(preferences.default_format_split.square || 6);
            setPortraitCount(preferences.default_format_split.portrait || 6);
          }
        }
      } catch {
        // Use defaults
      }
      setLoadingPrefs(false);
    }
    load();
  }, []);

  // Auto-save style preferences when they change
  useEffect(() => {
    if (loadingPrefs) return;
    const timeout = setTimeout(() => {
      fetch("/api/style-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          styles: stylePrefs,
          default_language: language,
          default_format_split: { square: squareCount, portrait: portraitCount },
        }),
      }).catch(() => {});
    }, 1000);
    return () => clearTimeout(timeout);
  }, [stylePrefs, language, squareCount, portraitCount, loadingPrefs]);

  function handleSubmit() {
    if (!brandName.trim()) return;
    onSubmit({
      brand_name: brandName.trim(),
      model,
      language,
      format_split: { square: squareCount, portrait: portraitCount },
      style_preferences: stylePrefs,
    });
  }

  const totalImages = squareCount + portraitCount;

  return (
    <div className="space-y-4">
      {/* Style Preferences */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Style Preferences
          <span className="font-normal text-muted-foreground/60 ml-1">(saved to profile)</span>
        </label>
        {loadingPrefs ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <StylePreferencesEditor value={stylePrefs} onChange={setStylePrefs} />
        )}
      </div>

      {/* Brand Name */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Brand Name</label>
        <Input
          placeholder="e.g. KFC, Nike, McDonald's..."
          value={brandName}
          onChange={(e) => setBrandName(e.target.value)}
          className="h-9"
          onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
        />
      </div>

      {/* Model + Language — side by side */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Image Model</label>
          <Select value={model} onValueChange={(v) => setModel(v as ImageModel)}>
            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MODEL_OPTIONS.map((m) => (
                <SelectItem key={m.value} value={m.value} className="text-xs">
                  {m.label} <span className="text-muted-foreground">— {m.desc}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Language</label>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {LANGUAGE_OPTIONS.map((lang) => (
                <SelectItem key={lang} value={lang} className="text-xs">{lang}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Format Split */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Image Count</label>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 border border-border rounded-sm flex-shrink-0" />
            <span className="text-xs text-muted-foreground">1:1</span>
            <Select value={String(squareCount)} onValueChange={(v) => setSquareCount(Number(v))}>
              <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[0, 2, 3, 4, 6, 8].map((n) => (
                  <SelectItem key={n} value={String(n)} className="text-xs">{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-6 border border-border rounded-sm flex-shrink-0" />
            <span className="text-xs text-muted-foreground">9:16</span>
            <Select value={String(portraitCount)} onValueChange={(v) => setPortraitCount(Number(v))}>
              <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[0, 2, 3, 4, 6, 8].map((n) => (
                  <SelectItem key={n} value={String(n)} className="text-xs">{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">Total: {totalImages} images</p>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!brandName.trim() || totalImages === 0 || loading}
        className="w-full h-9 text-xs gap-1.5"
      >
        {loading ? (
          <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating Strategy...</>
        ) : (
          <><Sparkles className="h-3.5 w-3.5" /> Generate Strategy for {totalImages} Images</>
        )}
      </Button>
    </div>
  );
}
