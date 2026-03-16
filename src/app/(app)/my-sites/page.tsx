"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageShell } from "@/components/layout/page-shell";
import { GradientPageHeader } from "@/components/layout/gradient-page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProfile } from "@/components/providers/profile-provider";
import { toast } from "sonner";
import { Loader2, Plus, X, Globe, User, Pencil } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";

interface SiteEntry {
  name: string;
  url: string;
  abbreviation: string;
}

export default function MySitesPage() {
  const { profile, refresh } = useProfile();
  const [sites, setSites] = useState<SiteEntry[]>([]);
  const [newSiteName, setNewSiteName] = useState("");
  const [newSiteUrl, setNewSiteUrl] = useState("");
  const [newSiteAbbr, setNewSiteAbbr] = useState("");
  const [abbrManuallyEdited, setAbbrManuallyEdited] = useState(false);
  const [editingAbbrIndex, setEditingAbbrIndex] = useState<number | null>(null);
  const [savingSites, setSavingSites] = useState(false);
  const [initialized, setInitialized] = useState(false);
  // Track original abbreviations from DB so we can detect renames and cascade them
  // to site_monthly_revenue (preserving historical revenue data on abbreviation change).
  const [originalAbbrs, setOriginalAbbrs] = useState<Record<string, string>>({});
  const abbrInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile && !initialized) {
      setSites(
        profile.sites.map((s) => ({
          name: s.name,
          url: s.url || "",
          abbreviation: s.abbreviation,
        }))
      );
      // Snapshot the DB abbreviation for each site by name
      const abbrMap: Record<string, string> = {};
      profile.sites.forEach((s) => { abbrMap[s.name] = s.abbreviation; });
      setOriginalAbbrs(abbrMap);
      setInitialized(true);
    }
  }, [profile, initialized]);

  // Auto-focus abbreviation inline editor when it opens
  useEffect(() => {
    if (editingAbbrIndex !== null) {
      abbrInputRef.current?.focus();
      abbrInputRef.current?.select();
    }
  }, [editingAbbrIndex]);

  function generateAbbr(name: string): string {
    return name
      .split(/\s+/)
      .map((w) => w[0] ?? "")
      .join("")
      .toUpperCase()
      .slice(0, 4);
  }

  function handleNewSiteNameChange(value: string) {
    setNewSiteName(value);
    // Only auto-fill abbreviation if user hasn't manually typed one
    if (!abbrManuallyEdited) {
      setNewSiteAbbr(generateAbbr(value));
    }
  }

  function handleNewSiteAbbrChange(value: string) {
    setAbbrManuallyEdited(true);
    setNewSiteAbbr(value.toUpperCase().slice(0, 10));
  }

  function updateSiteAbbr(index: number, value: string) {
    const normalized = value.toUpperCase().slice(0, 10);
    setSites((prev) =>
      prev.map((s, i) => (i === index ? { ...s, abbreviation: normalized } : s))
    );
  }

  function commitAbbrEdit() {
    if (editingAbbrIndex === null) return;
    const site = sites[editingAbbrIndex];
    // Fall back to auto-generated if left blank
    if (!site.abbreviation.trim()) {
      setSites((prev) =>
        prev.map((s, i) =>
          i === editingAbbrIndex ? { ...s, abbreviation: generateAbbr(s.name) } : s
        )
      );
    }
    setEditingAbbrIndex(null);
  }

  function addSite() {
    const name = newSiteName.trim();
    const url = newSiteUrl.trim();
    if (!name) return;

    const abbr = (newSiteAbbr.trim() || generateAbbr(name)).toUpperCase().slice(0, 10);
    setSites((prev) => [...prev, { name, url, abbreviation: abbr }]);
    setNewSiteName("");
    setNewSiteUrl("");
    setNewSiteAbbr("");
    setAbbrManuallyEdited(false);
  }

  function removeSite(index: number) {
    setSites((prev) => prev.filter((_, i) => i !== index));
    if (editingAbbrIndex === index) setEditingAbbrIndex(null);
  }

  async function handleSaveSites() {
    setSavingSites(true);
    try {
      // Detect abbreviation renames: sites where the name exists in originalAbbrs
      // but the abbreviation has changed. These get cascaded to site_monthly_revenue
      // so historical revenue data isn't lost.
      const renames = sites
        .filter((s) => originalAbbrs[s.name] && originalAbbrs[s.name] !== (s.abbreviation || generateAbbr(s.name)))
        .map((s) => ({
          old_abbreviation: originalAbbrs[s.name],
          new_abbreviation: s.abbreviation || generateAbbr(s.name),
        }));

      const res = await fetch("/api/profile/sites", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sites: sites.map((s) => ({
            name: s.name,
            url: s.url || undefined,
            abbreviation: s.abbreviation || generateAbbr(s.name),
          })),
          renames,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        await refresh();
        // Reset snapshot so a second save doesn't re-fire the same renames
        const newAbbrMap: Record<string, string> = {};
        sites.forEach((s) => { newAbbrMap[s.name] = s.abbreviation || generateAbbr(s.name); });
        setOriginalAbbrs(newAbbrMap);
        if (data.warning) {
          toast.warning(data.warning);
        } else {
          toast.success("Sites updated");
        }
      } else {
        // Refresh so the UI shows the actual DB state (not the failed pending state).
        await refresh();
        setInitialized(false); // allow useEffect to re-sync sites from refreshed profile
        toast.error(data.error || "Failed to update sites");
      }
    } catch (err) {
      console.error("[my-sites] save error:", err);
      toast.error("Network error — sites may not have been saved. Please try again.");
    } finally {
      setSavingSites(false);
    }
  }

  return (
    <PageShell>
      <GradientPageHeader
        icon={Globe}
        title="My Sites"
        description="Manage your sites and profile information."
      />
      <div className="max-w-2xl space-y-6">
      {/* Profile Card (read-only) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              {profile?.avatar_url && (
                <AvatarImage src={profile.avatar_url} alt="Avatar" />
              )}
              <AvatarFallback className="text-lg bg-primary/10 text-primary">
                {profile
                  ? (profile.nickname || profile.full_name || profile.email || "?")
                      .split(/\s+/)
                      .map((w) => w[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)
                  : ".."}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">
                {profile?.full_name || "No name set"}
              </p>
              {profile?.nickname && (
                <p className="text-xs text-muted-foreground">{profile.nickname}</p>
              )}
              <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
            </div>
            <Link href="/settings">
              <Button variant="outline" size="sm">
                Edit Profile
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Sites Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            My Sites
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current sites */}
          {sites.length > 0 && (
            <div className="space-y-2">
              {sites.map((site, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-4 py-3"
                >
                  {/* Abbreviation badge — click to edit */}
                  {editingAbbrIndex === i ? (
                    <Input
                      ref={abbrInputRef}
                      value={site.abbreviation}
                      onChange={(e) => updateSiteAbbr(i, e.target.value)}
                      onBlur={commitAbbrEdit}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === "Escape") {
                          e.preventDefault();
                          commitAbbrEdit();
                        }
                      }}
                      className="w-14 h-10 text-center text-xs font-bold uppercase px-1 shrink-0"
                      maxLength={10}
                      placeholder="ABBR"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingAbbrIndex(i)}
                      title="Click to edit abbreviation"
                      className="group w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 relative hover:bg-primary/20 transition-colors cursor-pointer"
                    >
                      <span className="text-xs font-bold text-primary group-hover:opacity-0 transition-opacity">
                        {site.abbreviation || generateAbbr(site.name)}
                      </span>
                      <Pencil className="absolute h-3 w-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{site.name}</p>
                    {site.url && (
                      <p className="text-xs text-muted-foreground truncate">
                        {site.url}
                      </p>
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

          {sites.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No sites added yet. Add your first site below.
            </p>
          )}

          {/* Add site form */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={newSiteName}
              onChange={(e) => handleNewSiteNameChange(e.target.value)}
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
            <Input
              value={newSiteAbbr}
              onChange={(e) => handleNewSiteAbbrChange(e.target.value)}
              placeholder="ABBR"
              className="w-full sm:w-20 uppercase"
              maxLength={10}
              title="Short abbreviation shown in charts (auto-generated, editable)"
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
              className="shrink-0 w-full sm:w-auto"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            The abbreviation is used in charts and reports. Click an existing abbreviation badge to edit it.
          </p>

          <Button
            onClick={handleSaveSites}
            disabled={savingSites}
          >
            {savingSites ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Sites"
            )}
          </Button>
        </CardContent>
      </Card>
      </div>
    </PageShell>
  );
}
