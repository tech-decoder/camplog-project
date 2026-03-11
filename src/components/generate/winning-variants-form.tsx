"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Sparkles, Upload, X } from "lucide-react";
import { MODEL_OPTIONS, LANGUAGE_OPTIONS } from "@/lib/constants/image-gen";
import { ImageModel } from "@/lib/types/generated-images";
import { FormatSplit } from "@/lib/types/generation-jobs";
import { toast } from "sonner";
import Image from "next/image";

export interface WinningVariantsFormData {
  brand_name: string;
  model: ImageModel;
  language: string;
  format_split: FormatSplit;
  reference_images: string[];
}

export function WinningVariantsForm({
  onSubmit,
  loading,
}: {
  onSubmit: (data: WinningVariantsFormData) => void;
  loading: boolean;
}) {
  const [brandName, setBrandName] = useState("");
  const [model, setModel] = useState<ImageModel>("gemini-pro-image");
  const [language, setLanguage] = useState("English");
  const [squareCount, setSquareCount] = useState(6);
  const [portraitCount, setPortraitCount] = useState(6);
  const [referenceUrls, setReferenceUrls] = useState<string[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(files: FileList | null) {
    if (!files?.length) return;
    if (referenceUrls.length + files.length > 3) {
      toast.error("Maximum 3 reference images allowed");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    const localPreviews: string[] = [];

    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
      localPreviews.push(URL.createObjectURL(files[i]));
    }

    try {
      const res = await fetch("/api/upload-reference", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const { urls } = await res.json();
        setReferenceUrls((prev) => [...prev, ...urls]);
        setPreviews((prev) => [...prev, ...localPreviews]);
        toast.success(`Uploaded ${urls.length} image(s)`);
      } else {
        toast.error("Failed to upload images");
      }
    } catch {
      toast.error("Failed to upload images");
    } finally {
      setUploading(false);
    }
  }

  function removeImage(index: number) {
    setReferenceUrls((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit() {
    if (!brandName.trim() || !referenceUrls.length) return;
    onSubmit({
      brand_name: brandName.trim(),
      model,
      language,
      format_split: { square: squareCount, portrait: portraitCount },
      reference_images: referenceUrls,
    });
  }

  const totalImages = squareCount + portraitCount;

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Winning Ad Screenshots <span className="font-normal">(1-3 images)</span>
        </label>
        <div
          className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files)}
          />
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
          ) : (
            <>
              <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">
                Click to upload winning ad screenshots
              </p>
            </>
          )}
        </div>

        {/* Preview thumbnails */}
        {previews.length > 0 && (
          <div className="flex gap-2 mt-2">
            {previews.map((preview, i) => (
              <div key={i} className="relative w-20 h-20 rounded-md overflow-hidden border border-border">
                <Image src={preview} alt={`Reference ${i + 1}`} fill className="object-cover" unoptimized />
                <button
                  onClick={() => removeImage(i)}
                  className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/60 text-white hover:bg-black/80"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
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
        <label className="text-xs font-medium text-muted-foreground">Variant Count</label>
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
        <p className="text-[11px] text-muted-foreground">Total: {totalImages} variants</p>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!brandName.trim() || !referenceUrls.length || totalImages === 0 || loading}
        className="w-full h-9 text-xs gap-1.5"
      >
        {loading ? (
          <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Analyzing & Strategizing...</>
        ) : (
          <><Sparkles className="h-3.5 w-3.5" /> Analyze & Generate Strategy</>
        )}
      </Button>
    </div>
  );
}
