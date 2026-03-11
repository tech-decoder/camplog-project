"use client";

import { useState, useRef, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Copy,
  Download,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  CheckSquare,
  Square,
  Archive,
  Loader2,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Info,
} from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { GeneratedImage } from "@/lib/types/generated-images";
import { isPortraitDimension } from "@/lib/constants/image-gen";

interface ConfirmState {
  type: "selected" | "all";
  ids: string[];
  label: string;
}

export function ImageGallery({
  images,
  onDelete,
  onBulkDelete,
}: {
  images: GeneratedImage[];
  onDelete?: (imageId: string) => void;
  onBulkDelete?: (imageIds: string[]) => void;
}) {
  const [previewImage, setPreviewImage] = useState<GeneratedImage | null>(null);

  // ── Selection state ──────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectMode = selectedIds.size > 0;

  // ── Rating state (optimistic) ────────────────────────────────────────────
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [ratingLoading, setRatingLoading] = useState<Set<string>>(new Set());
  const ratingCountRef = useRef(0);

  // ── Feedback notes state ───────────────────────────────────────────────
  const [feedbackNotes, setFeedbackNotes] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [savingFeedback, setSavingFeedback] = useState(false);

  // ── Prompt expansion state ─────────────────────────────────────────────
  const [showPrompt, setShowPrompt] = useState(false);

  // ── ZIP download state ───────────────────────────────────────────────────
  const [zipping, setZipping] = useState(false);

  // ── Confirmation dialog ──────────────────────────────────────────────────
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function handleCopyPrompt(prompt: string) {
    navigator.clipboard.writeText(prompt);
    toast.success("Prompt copied to clipboard");
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(images.map((img) => img.id)));
  }

  function deselectAll() {
    setSelectedIds(new Set());
  }

  // Reset preview dialog state when closing
  function handleClosePreview() {
    setPreviewImage(null);
    setShowFeedback(false);
    setFeedbackNotes("");
    setShowPrompt(false);
  }

  // ── Rating ────────────────────────────────────────────────────────────────
  const handleRate = useCallback(
    async (imageId: string, rating: 1 | -1, notes?: string) => {
      const current = ratings[imageId];
      // Toggle: clicking same rating removes it
      const newRating = current === rating ? null : rating;

      // Optimistic update
      setRatings((prev) => {
        const next = { ...prev };
        if (newRating === null) delete next[imageId];
        else next[imageId] = newRating;
        return next;
      });

      setRatingLoading((prev) => new Set(prev).add(imageId));

      try {
        if (newRating === null) {
          await fetch(`/api/generated-images/${imageId}/rate`, {
            method: "DELETE",
          });
        } else {
          await fetch(`/api/generated-images/${imageId}/rate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rating: newRating, ...(notes ? { notes } : {}) }),
          });

          // Auto-synthesis after every 5 ratings
          ratingCountRef.current += 1;
          if (ratingCountRef.current % 5 === 0) {
            fetch("/api/creative-memory", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({}),
            }).catch(console.error);
          }
        }
      } catch {
        // Revert on error
        setRatings((prev) => {
          const next = { ...prev };
          if (current !== undefined) next[imageId] = current;
          else delete next[imageId];
          return next;
        });
        toast.error("Failed to save rating");
      } finally {
        setRatingLoading((prev) => {
          const next = new Set(prev);
          next.delete(imageId);
          return next;
        });
      }
    },
    [ratings]
  );

  // ── Save feedback with notes ────────────────────────────────────────────
  async function handleSaveFeedback(imageId: string) {
    if (!feedbackNotes.trim()) return;
    setSavingFeedback(true);
    try {
      await handleRate(imageId, -1, feedbackNotes.trim());
      toast.success("Feedback saved — the AI will learn from this");
      setShowFeedback(false);
      setFeedbackNotes("");
    } finally {
      setSavingFeedback(false);
    }
  }

  // ── Delete (single) ───────────────────────────────────────────────────────
  async function doDeleteSingle(imageId: string) {
    const res = await fetch("/api/generated-images", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageId }),
    });
    if (res.ok) {
      onDelete?.(imageId);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(imageId);
        return next;
      });
    } else {
      toast.error("Failed to delete image");
    }
  }

  // ── Delete (batch) ────────────────────────────────────────────────────────
  async function doBatchDelete(ids: string[]) {
    setDeleting(true);
    try {
      const res = await fetch("/api/generated-images", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageIds: ids }),
      });
      if (res.ok) {
        const data = await res.json();
        onBulkDelete?.(ids);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          ids.forEach((id) => next.delete(id));
          return next;
        });
        toast.success(`Deleted ${data.deleted} image${data.deleted !== 1 ? "s" : ""}`);
      } else {
        toast.error("Failed to delete images");
      }
    } finally {
      setDeleting(false);
      setConfirm(null);
    }
  }

  // ── Download ZIP ──────────────────────────────────────────────────────────
  async function handleDownloadZip() {
    const toDownload =
      selectedIds.size > 0
        ? images.filter((img) => selectedIds.has(img.id))
        : images;

    if (toDownload.length === 0) return;

    setZipping(true);
    try {
      const JSZip = (await import("jszip")).default;
      const { saveAs } = await import("file-saver");
      const zip = new JSZip();

      await Promise.allSettled(
        toDownload.map(async (img) => {
          const resp = await fetch(img.image_url);
          const blob = await resp.blob();
          const ext = blob.type === "image/jpeg" ? "jpg" : "png";
          const style = img.ad_style || "creative";
          const idx = img.generation_index ?? img.id.slice(0, 8);
          zip.file(`${style}_${idx}.${ext}`, blob);
        })
      );

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `ad-creatives-${Date.now()}.zip`);
      toast.success(`Downloaded ${toDownload.length} image${toDownload.length !== 1 ? "s" : ""} as ZIP`);
    } catch (err) {
      toast.error("Failed to create ZIP");
      console.error(err);
    } finally {
      setZipping(false);
    }
  }

  if (images.length === 0) return null;

  const selectedCount = selectedIds.size;

  return (
    <>
      {/* ── Gallery header bar ──────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {/* Selection toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1.5 px-2"
          onClick={selectedCount === images.length ? deselectAll : selectAll}
        >
          {selectedCount === images.length ? (
            <CheckSquare className="h-3.5 w-3.5" />
          ) : (
            <Square className="h-3.5 w-3.5" />
          )}
          {selectedCount === images.length ? "Deselect All" : "Select All"}
        </Button>
        {selectedCount > 0 && (
          <span className="text-xs text-muted-foreground">
            {selectedCount} selected
          </span>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          {/* Delete selected */}
          {selectedCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() =>
                setConfirm({
                  type: "selected",
                  ids: Array.from(selectedIds),
                  label: `Delete ${selectedCount} selected image${selectedCount !== 1 ? "s" : ""}? This cannot be undone.`,
                })
              }
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete ({selectedCount})
            </Button>
          )}

          {/* Download ZIP */}
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={handleDownloadZip}
            disabled={zipping}
          >
            {zipping ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Archive className="h-3.5 w-3.5" />
            )}
            {zipping
              ? "Zipping…"
              : selectedCount > 0
              ? `ZIP (${selectedCount})`
              : "Download ZIP"}
          </Button>

          {/* Delete all */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-destructive"
            onClick={() =>
              setConfirm({
                type: "all",
                ids: images.map((img) => img.id),
                label: `Delete all ${images.length} images? This cannot be undone.`,
              })
            }
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete All
          </Button>
        </div>
      </div>

      {/* ── Image grid (fewer cols for better portrait sizing) ────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {images.map((img) => {
          const isSelected = selectedIds.has(img.id);
          const currentRating = ratings[img.id];
          const isRatingLoading = ratingLoading.has(img.id);
          const isPortrait = isPortraitDimension(img.dimensions);

          return (
            <div
              key={img.id}
              className={`group relative rounded-lg overflow-hidden border bg-muted cursor-pointer transition-all ${
                isSelected
                  ? "border-primary ring-2 ring-primary/40"
                  : "border-border hover:ring-2 hover:ring-primary/20"
              }`}
              onClick={() => {
                if (selectMode) {
                  toggleSelect(img.id);
                } else {
                  setPreviewImage(img);
                }
              }}
            >
              {/* Checkbox (top-right, shows on hover or when selectMode) */}
              <div
                className={`absolute top-1.5 right-1.5 z-10 transition-opacity ${
                  isSelected || selectMode
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelect(img.id);
                }}
              >
                <div
                  className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                    isSelected
                      ? "bg-primary border-primary text-primary-foreground"
                      : "bg-white/90 border-white/70"
                  }`}
                >
                  {isSelected && (
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
              </div>

              {/* Image + hover overlay */}
              <div
                className={
                  isPortrait
                    ? "aspect-[9/16] max-h-[360px] mx-auto"
                    : "aspect-square"
                }
              >
                <Image
                  src={img.image_url}
                  alt={img.headline_ref || "Generated image"}
                  fill
                  className="object-cover"
                  unoptimized
                />

                {/* Hover action bar (hidden in select mode) */}
                {!selectMode && (
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/45 transition-colors flex flex-col items-center justify-end pb-2 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto">
                    <div className="flex gap-1">
                      {/* Thumbs up */}
                      <button
                        className={`p-1.5 rounded-md transition-colors ${
                          currentRating === 1
                            ? "bg-green-500 text-white"
                            : "bg-white/90 hover:bg-green-50 text-gray-700 hover:text-green-600"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isRatingLoading) handleRate(img.id, 1);
                        }}
                        title="Good creative"
                      >
                        <ThumbsUp className="h-3.5 w-3.5" />
                      </button>

                      {/* Thumbs down */}
                      <button
                        className={`p-1.5 rounded-md transition-colors ${
                          currentRating === -1
                            ? "bg-red-500 text-white"
                            : "bg-white/90 hover:bg-red-50 text-gray-700 hover:text-red-600"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isRatingLoading) handleRate(img.id, -1);
                        }}
                        title="Needs work"
                      >
                        <ThumbsDown className="h-3.5 w-3.5" />
                      </button>

                      {/* Divider */}
                      <div className="w-px bg-white/30 mx-0.5" />

                      {/* Download single */}
                      <a
                        href={img.image_url}
                        download
                        className="p-1.5 rounded-md bg-white/90 hover:bg-white text-gray-700 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                        title="Download"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>

                      {/* Delete single */}
                      {onDelete && (
                        <button
                          className="p-1.5 rounded-md bg-white/90 hover:bg-red-50 text-gray-700 hover:text-red-600 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            doDeleteSingle(img.id);
                          }}
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Card footer */}
              <div className="px-2 py-1.5">
                <div className="flex items-center gap-1 flex-wrap">
                  {img.ad_style && (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1 py-0 h-4 font-normal"
                    >
                      {img.ad_style}
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1 py-0 h-4 font-normal"
                  >
                    {img.model === "gpt-image-1"
                      ? "GPT"
                      : img.model === "gemini-pro-image"
                      ? "Pro"
                      : img.model === "gemini-flash-image"
                      ? "Flash"
                      : "Imagen"}
                  </Badge>
                  {currentRating === 1 && (
                    <ThumbsUp className="h-3 w-3 text-green-500 ml-auto" />
                  )}
                  {currentRating === -1 && (
                    <ThumbsDown className="h-3 w-3 text-red-500 ml-auto" />
                  )}
                </div>
                {img.headline_ref && (
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                    {img.headline_ref}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Full-screen Preview Dialog ──────────────────────────────────── */}
      <Dialog open={!!previewImage} onOpenChange={() => handleClosePreview()}>
        <DialogContent className="max-w-2xl p-0 max-h-[90vh] overflow-y-auto">
          <DialogTitle className="sr-only">Image Preview</DialogTitle>
          {previewImage && (
            <div>
              <div
                className={`relative bg-muted ${
                  isPortraitDimension(previewImage.dimensions)
                    ? "aspect-[9/16] max-h-[70vh]"
                    : "aspect-square"
                }`}
              >
                <Image
                  src={previewImage.image_url}
                  alt={previewImage.headline_ref || "Generated image"}
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {previewImage.ad_style && (
                    <Badge variant="outline" className="text-xs">
                      {previewImage.ad_style}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {previewImage.model}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {previewImage.dimensions}
                  </Badge>
                </div>
                {previewImage.headline_ref && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Headline:</span>{" "}
                    {previewImage.headline_ref}
                  </p>
                )}
                {previewImage.subheadline && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Subheadline:</span>{" "}
                    {previewImage.subheadline}
                  </p>
                )}
                {previewImage.cta_text && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">CTA:</span>{" "}
                    {previewImage.cta_text}
                  </p>
                )}

                {/* Action buttons */}
                <div className="flex gap-2 pt-1 flex-wrap">
                  <Button
                    size="sm"
                    variant={ratings[previewImage.id] === 1 ? "default" : "outline"}
                    className={`h-7 text-xs gap-1 ${
                      ratings[previewImage.id] === 1
                        ? "bg-green-500 hover:bg-green-600 border-green-500 text-white"
                        : ""
                    }`}
                    onClick={() => handleRate(previewImage.id, 1)}
                    disabled={ratingLoading.has(previewImage.id)}
                  >
                    <ThumbsUp className="h-3 w-3" /> Good
                  </Button>
                  <Button
                    size="sm"
                    variant={ratings[previewImage.id] === -1 ? "default" : "outline"}
                    className={`h-7 text-xs gap-1 ${
                      ratings[previewImage.id] === -1
                        ? "bg-red-500 hover:bg-red-600 border-red-500 text-white"
                        : ""
                    }`}
                    onClick={() => {
                      handleRate(previewImage.id, -1);
                      setShowFeedback(true);
                    }}
                    disabled={ratingLoading.has(previewImage.id)}
                  >
                    <ThumbsDown className="h-3 w-3" /> Needs Work
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => handleCopyPrompt(previewImage.prompt)}
                  >
                    <Copy className="h-3 w-3" /> Copy Prompt
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" asChild>
                    <a href={previewImage.image_url} download>
                      <Download className="h-3 w-3" /> Download
                    </a>
                  </Button>
                  {onDelete && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                      onClick={() => {
                        doDeleteSingle(previewImage.id);
                        handleClosePreview();
                      }}
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </Button>
                  )}
                </div>

                {/* Rating hint */}
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
                  <Info className="h-3 w-3 flex-shrink-0" />
                  <span>Your ratings help the AI learn. Every 5 ratings, the AI synthesizes your preferences.</span>
                </div>

                {/* Feedback notes (shows when Needs Work clicked) */}
                {showFeedback && (
                  <div className="space-y-2 p-3 rounded-lg bg-muted/50 border border-border">
                    <div className="flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium">What needs fixing?</span>
                    </div>
                    <Textarea
                      placeholder='e.g. "Text is unreadable", "Wrong brand colors", "Logo too small", "CTA button missing"...'
                      value={feedbackNotes}
                      onChange={(e) => setFeedbackNotes(e.target.value)}
                      className="text-xs min-h-[60px] resize-none"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleSaveFeedback(previewImage.id)}
                        disabled={!feedbackNotes.trim() || savingFeedback}
                      >
                        {savingFeedback ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          "Save Feedback"
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => {
                          setShowFeedback(false);
                          setFeedbackNotes("");
                        }}
                      >
                        Skip
                      </Button>
                    </div>
                  </div>
                )}

                {/* Expandable prompt view */}
                <button
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPrompt(!showPrompt)}
                >
                  {showPrompt ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                  {showPrompt ? "Hide Prompt" : "View Prompt"}
                </button>
                {showPrompt && (
                  <div className="relative">
                    <Textarea
                      value={previewImage.prompt}
                      readOnly
                      className="text-xs min-h-[100px] resize-none font-mono bg-muted/50"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-1 right-1 h-6 w-6 p-0"
                      onClick={() => handleCopyPrompt(previewImage.prompt)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Confirmation Dialog ──────────────────────────────────────────── */}
      <Dialog open={!!confirm} onOpenChange={() => !deleting && setConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogTitle className="text-sm font-semibold">Confirm Deletion</DialogTitle>
          <p className="text-sm text-muted-foreground">{confirm?.label}</p>
          <div className="flex gap-2 justify-end mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirm(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => confirm && doBatchDelete(confirm.ids)}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
