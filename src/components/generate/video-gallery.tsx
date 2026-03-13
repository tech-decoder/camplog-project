"use client";

import { useState, useRef } from "react";
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
  CheckSquare,
  Square,
  Archive,
  Loader2,
  ChevronDown,
  ChevronUp,
  Play,
  HardDriveUpload,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { GeneratedVideo } from "@/lib/types/generated-videos";
import { useProfile } from "@/components/providers/profile-provider";

interface ConfirmState {
  type: "selected" | "all";
  ids: string[];
  label: string;
}

export function VideoGallery({
  videos,
  onDelete,
  onBulkDelete,
  campaignId,
  campaignName,
}: {
  videos: GeneratedVideo[];
  onDelete?: (videoId: string) => void;
  onBulkDelete?: (videoIds: string[]) => void;
  campaignId?: string;
  campaignName?: string;
}) {
  const { profile } = useProfile();
  const [previewVideo, setPreviewVideo] = useState<GeneratedVideo | null>(null);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectMode = selectedIds.size > 0;

  // Prompt view
  const [showPrompt, setShowPrompt] = useState(false);

  // ZIP
  const [zipping, setZipping] = useState(false);

  // Drive export
  const [exportingDrive, setExportingDrive] = useState(false);

  // Confirm dialog
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Hover-play refs
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

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
    setSelectedIds(new Set(videos.map((v) => v.id)));
  }

  function deselectAll() {
    setSelectedIds(new Set());
  }

  function handleClosePreview() {
    setPreviewVideo(null);
    setShowPrompt(false);
  }

  // Hover play/pause
  function handleMouseEnter(id: string) {
    const el = videoRefs.current.get(id);
    if (el) el.play().catch(() => {});
  }

  function handleMouseLeave(id: string) {
    const el = videoRefs.current.get(id);
    if (el) {
      el.pause();
      el.currentTime = 0;
    }
  }

  // Delete single
  async function doDeleteSingle(videoId: string) {
    const res = await fetch("/api/generated-videos", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [videoId] }),
    });
    if (res.ok) {
      onDelete?.(videoId);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(videoId);
        return next;
      });
    } else {
      toast.error("Failed to delete video");
    }
  }

  // Delete batch
  async function doBatchDelete(ids: string[]) {
    setDeleting(true);
    try {
      const res = await fetch("/api/generated-videos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (res.ok) {
        const data = await res.json();
        onBulkDelete?.(ids);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          ids.forEach((id) => next.delete(id));
          return next;
        });
        toast.success(`Deleted ${data.deleted} video${data.deleted !== 1 ? "s" : ""}`);
      } else {
        toast.error("Failed to delete videos");
      }
    } finally {
      setDeleting(false);
      setConfirm(null);
    }
  }

  // Download ZIP
  async function handleDownloadZip() {
    const toDownload =
      selectedIds.size > 0
        ? videos.filter((v) => selectedIds.has(v.id))
        : videos;

    if (toDownload.length === 0) return;

    setZipping(true);
    try {
      const JSZip = (await import("jszip")).default;
      const { saveAs } = await import("file-saver");
      const zip = new JSZip();

      await Promise.allSettled(
        toDownload.map(async (v) => {
          const resp = await fetch(v.video_url);
          const blob = await resp.blob();
          const style = v.video_ad_style || "video";
          const idx = v.generation_index ?? v.id.slice(0, 8);
          zip.file(`${style}_${idx}.mp4`, blob);
        })
      );

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `ad-videos-${Date.now()}.zip`);
      toast.success(`Downloaded ${toDownload.length} video${toDownload.length !== 1 ? "s" : ""} as ZIP`);
    } catch (err) {
      toast.error("Failed to create ZIP");
      console.error(err);
    } finally {
      setZipping(false);
    }
  }

  // Google Drive export
  async function handleExportDrive() {
    if (!campaignId) return;

    if (!profile?.google_drive_connected_at) {
      const returnUrl = campaignName
        ? `/campaigns/${encodeURIComponent(campaignName)}`
        : "/settings";
      window.location.href = `/api/auth/google-drive?returnUrl=${encodeURIComponent(returnUrl)}`;
      return;
    }

    setExportingDrive(true);
    try {
      const videoIds = selectedIds.size > 0 ? Array.from(selectedIds) : undefined;
      const res = await fetch(`/api/campaigns/${campaignId}/export-drive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoIds }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(
          <span className="inline-flex items-center gap-1.5">
            Exported {data.count} video{data.count !== 1 ? "s" : ""} to Drive
            <a
              href={data.folderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 underline font-medium"
            >
              Open <ExternalLink className="h-3 w-3" />
            </a>
          </span>
        );
      } else {
        const data = await res.json();
        if (data.error === "google_drive_not_connected") {
          const returnUrl = campaignName
            ? `/campaigns/${encodeURIComponent(campaignName)}`
            : "/settings";
          window.location.href = `/api/auth/google-drive?returnUrl=${encodeURIComponent(returnUrl)}`;
        } else {
          toast.error(data.error || "Failed to export to Drive");
        }
      }
    } catch {
      toast.error("Failed to export to Drive");
    } finally {
      setExportingDrive(false);
    }
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No videos found yet. They may still be processing.
      </div>
    );
  }

  const selectedCount = selectedIds.size;

  return (
    <>
      {/* Gallery header bar */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1.5 px-2"
          onClick={selectedCount === videos.length ? deselectAll : selectAll}
        >
          {selectedCount === videos.length ? (
            <CheckSquare className="h-3.5 w-3.5" />
          ) : (
            <Square className="h-3.5 w-3.5" />
          )}
          {selectedCount === videos.length ? "Deselect All" : "Select All"}
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
                  label: `Delete ${selectedCount} selected video${selectedCount !== 1 ? "s" : ""}? This cannot be undone.`,
                })
              }
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete ({selectedCount})
            </Button>
          )}

          {/* Export to Google Drive */}
          {campaignId && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={handleExportDrive}
              disabled={exportingDrive}
            >
              {exportingDrive ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <HardDriveUpload className="h-3.5 w-3.5" />
              )}
              {exportingDrive
                ? "Exporting..."
                : profile?.google_drive_connected_at
                ? selectedCount > 0
                  ? `Drive (${selectedCount})`
                  : "Drive"
                : "Connect Drive"}
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
              ? "Zipping..."
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
                ids: videos.map((v) => v.id),
                label: `Delete all ${videos.length} videos? This cannot be undone.`,
              })
            }
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete All
          </Button>
        </div>
      </div>

      {/* Video grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {videos.map((vid) => {
          const isSelected = selectedIds.has(vid.id);
          const isPortrait = vid.aspect_ratio === "9:16";

          return (
            <div
              key={vid.id}
              className={`group relative rounded-lg overflow-hidden border bg-muted cursor-pointer transition-all ${
                isSelected
                  ? "border-primary ring-2 ring-primary/40"
                  : "border-border hover:ring-2 hover:ring-primary/20"
              }`}
              onClick={() => {
                if (selectMode) {
                  toggleSelect(vid.id);
                } else {
                  setPreviewVideo(vid);
                }
              }}
              onMouseEnter={() => handleMouseEnter(vid.id)}
              onMouseLeave={() => handleMouseLeave(vid.id)}
            >
              {/* Checkbox */}
              <div
                className={`absolute top-1.5 right-1.5 z-10 transition-opacity ${
                  isSelected || selectMode
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelect(vid.id);
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

              {/* Video element */}
              <div
                className={
                  isPortrait
                    ? "aspect-[9/16] max-h-[360px] mx-auto"
                    : "aspect-video"
                }
              >
                <video
                  ref={(el) => {
                    if (el) videoRefs.current.set(vid.id, el);
                    else videoRefs.current.delete(vid.id);
                  }}
                  src={vid.video_url}
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  className="w-full h-full object-cover"
                />

                {/* Play icon overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-70 group-hover:opacity-0 transition-opacity">
                  <div className="bg-black/50 rounded-full p-2">
                    <Play className="h-5 w-5 text-white fill-white" />
                  </div>
                </div>

                {/* Hover action bar */}
                {!selectMode && (
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex flex-col items-center justify-end pb-2 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto">
                    <div className="flex gap-1">
                      <a
                        href={vid.video_url}
                        download
                        className="p-1.5 rounded-md bg-white/90 hover:bg-white text-gray-700 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                        title="Download"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                      {onDelete && (
                        <button
                          className="p-1.5 rounded-md bg-white/90 hover:bg-red-50 text-gray-700 hover:text-red-600 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            doDeleteSingle(vid.id);
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
                  {vid.video_ad_style && (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1 py-0 h-4 font-normal"
                    >
                      {vid.video_ad_style}
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1 py-0 h-4 font-normal"
                  >
                    {vid.aspect_ratio}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1 py-0 h-4 font-normal"
                  >
                    {vid.duration_seconds}s
                  </Badge>
                </div>
                {vid.headline_ref && (
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                    {vid.headline_ref}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Full-screen Preview Dialog */}
      <Dialog open={!!previewVideo} onOpenChange={() => handleClosePreview()}>
        <DialogContent className="max-w-2xl p-0 max-h-[90vh] overflow-y-auto">
          <DialogTitle className="sr-only">Video Preview</DialogTitle>
          {previewVideo && (
            <div>
              <div
                className={`relative bg-black ${
                  previewVideo.aspect_ratio === "9:16"
                    ? "aspect-[9/16] max-h-[70vh]"
                    : "aspect-video"
                }`}
              >
                <video
                  src={previewVideo.video_url}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {previewVideo.video_ad_style && (
                    <Badge variant="outline" className="text-xs">
                      {previewVideo.video_ad_style}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {previewVideo.aspect_ratio}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {previewVideo.duration_seconds}s
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {previewVideo.model}
                  </Badge>
                </div>
                {previewVideo.headline_ref && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Headline:</span>{" "}
                    {previewVideo.headline_ref}
                  </p>
                )}
                {previewVideo.subheadline_ref && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Subheadline:</span>{" "}
                    {previewVideo.subheadline_ref}
                  </p>
                )}
                {previewVideo.cta_text && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">CTA:</span>{" "}
                    {previewVideo.cta_text}
                  </p>
                )}

                {/* Action buttons */}
                <div className="flex gap-2 pt-1 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => handleCopyPrompt(previewVideo.prompt)}
                  >
                    <Copy className="h-3 w-3" /> Copy Prompt
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" asChild>
                    <a href={previewVideo.video_url} download>
                      <Download className="h-3 w-3" /> Download
                    </a>
                  </Button>
                  {onDelete && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                      onClick={() => {
                        doDeleteSingle(previewVideo.id);
                        handleClosePreview();
                      }}
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </Button>
                  )}
                </div>

                {/* Expandable prompt */}
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
                      value={previewVideo.prompt}
                      readOnly
                      className="text-xs min-h-[100px] resize-none font-mono bg-muted/50"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-1 right-1 h-6 w-6 p-0"
                      onClick={() => handleCopyPrompt(previewVideo.prompt)}
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

      {/* Confirmation Dialog */}
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
