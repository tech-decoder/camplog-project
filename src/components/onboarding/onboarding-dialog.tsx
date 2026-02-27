"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, Plus, X } from "lucide-react";
import { useProfile } from "@/components/providers/profile-provider";
import { toast } from "sonner";

interface SiteEntry {
  name: string;
  url: string;
}

export function OnboardingDialog() {
  const { profile, loading, refresh } = useProfile();
  const [nickname, setNickname] = useState("");
  const [sites, setSites] = useState<SiteEntry[]>([]);
  const [newSiteName, setNewSiteName] = useState("");
  const [newSiteUrl, setNewSiteUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Pre-fill nickname from full_name first word
  if (!initialized && profile && !loading) {
    const firstName = profile.full_name?.split(" ")[0] || "";
    setNickname(firstName);
    setInitialized(true);
  }

  const isOpen = !loading && profile !== null && !profile.onboarding_completed;

  function addSite() {
    const name = newSiteName.trim();
    const url = newSiteUrl.trim();
    if (!name) return;

    // Generate abbreviation from name (first letters of words, max 4 chars)
    const abbr = name
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 4);

    setSites((prev) => [...prev, { name, url }]);
    setNewSiteName("");
    setNewSiteUrl("");
  }

  function removeSite(index: number) {
    setSites((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!nickname.trim() || sites.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: nickname.trim(),
          sites: sites.map((s) => ({
            name: s.name,
            url: s.url,
            abbreviation: s.name
              .split(/\s+/)
              .map((w) => w[0])
              .join("")
              .toUpperCase()
              .slice(0, 4),
          })),
        }),
      });
      if (res.ok) {
        await refresh();
        toast.success("You're all set!");
      } else {
        const data = await res.json();
        toast.error(data.error || "Something went wrong");
      }
    } catch {
      toast.error("Failed to complete setup");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={isOpen}>
      <DialogContent
        className="sm:max-w-lg"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        showCloseButton={false}
      >
        <DialogHeader className="text-center items-center">
          <Image src="/camplog.svg" alt="CampLog" width={48} height={48} className="rounded-xl mb-2" />
          <DialogTitle className="text-xl">Welcome to CampLog!</DialogTitle>
          <DialogDescription>Let&apos;s get you set up in 30 seconds.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Nickname */}
          <div>
            <Label className="text-sm font-medium">What should we call you?</Label>
            <Input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Your nickname"
              maxLength={20}
              className="mt-1.5"
            />
          </div>

          {/* Sites */}
          <div>
            <Label className="text-sm font-medium">Add the sites you manage</Label>

            {/* Added sites list */}
            {sites.length > 0 && (
              <div className="space-y-2 mt-2">
                {sites.map((site, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{site.name}</p>
                      {site.url && (
                        <p className="text-xs text-muted-foreground truncate">{site.url}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSite(i)}
                      className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add site form */}
            <div className="flex gap-2 mt-2">
              <Input
                value={newSiteName}
                onChange={(e) => setNewSiteName(e.target.value)}
                placeholder="Site name"
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSite();
                  }
                }}
              />
              <Input
                value={newSiteUrl}
                onChange={(e) => setNewSiteUrl(e.target.value)}
                placeholder="URL (optional)"
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSite();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={addSite}
                disabled={!newSiteName.trim()}
                className="shrink-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              {sites.length === 0
                ? "Add at least one site to get started."
                : `${sites.length} site${sites.length > 1 ? "s" : ""} added.`}
            </p>
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={saving || !nickname.trim() || sites.length === 0}
            className="w-full bg-[#366ae8] hover:bg-[#2d5bcf] text-white"
            size="lg"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Setting up...
              </>
            ) : (
              "Get Started"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
