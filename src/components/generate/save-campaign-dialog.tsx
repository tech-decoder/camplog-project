"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, Save, Sparkles, Info } from "lucide-react";
import { toast } from "sonner";

export function SaveCampaignDialog({
  open,
  onOpenChange,
  jobId,
  brandName,
  imageCount,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  brandName: string;
  imageCount: number;
  onSaved: () => void;
}) {
  const today = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const [name, setName] = useState(`${brandName} - ${today}`);
  const [saving, setSaving] = useState(false);
  const [existingCampaign, setExistingCampaign] = useState(false);
  const [existingImageCount, setExistingImageCount] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced check for existing campaign
  useEffect(() => {
    if (!open || !name.trim()) {
      setExistingCampaign(false);
      setExistingImageCount(0);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/campaigns/by-name?name=${encodeURIComponent(name.trim())}`
        );
        if (res.ok) {
          const data = await res.json();
          setExistingCampaign(true);
          // Count images from campaign_ids if available
          setExistingImageCount(data.change_count || 0);
        } else {
          setExistingCampaign(false);
          setExistingImageCount(0);
        }
      } catch {
        setExistingCampaign(false);
        setExistingImageCount(0);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [name, open]);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/generation-jobs/${jobId}/save-campaign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.appended) {
          toast.success("Images added to existing campaign!");
        } else {
          toast.success("Campaign saved! Starting fresh workspace.");
        }
        onOpenChange(false);
        onSaved();
      } else {
        const data = await res.json();
        if (res.status === 409) {
          toast.info("This batch is already saved to a campaign");
          onOpenChange(false);
        } else {
          toast.error(data.error || "Failed to save campaign");
        }
      }
    } catch {
      toast.error("Failed to save campaign");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogTitle className="text-sm font-semibold flex items-center gap-2">
          <Save className="h-4 w-4" />
          {existingCampaign ? "Add to Campaign" : "Save as Campaign"}
        </DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground">
          {existingCampaign
            ? `Add ${imageCount} images to the existing campaign.`
            : `Save this batch of ${imageCount} images as a campaign to track and manage them.`}
        </DialogDescription>
        <div className="space-y-3 mt-1">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Campaign Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Campaign name..."
              className="h-9 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
              autoFocus
            />
            {existingCampaign && (
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Info className="h-3 w-3 flex-shrink-0" />
                Campaign exists. {imageCount} images will be added to it
              </p>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!name.trim() || saving}
              className="gap-1.5"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {existingCampaign ? "Add to Campaign" : "Save & Start New"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
