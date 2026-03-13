"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageShell } from "@/components/layout/page-shell";
import { GradientPageHeader } from "@/components/layout/gradient-page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProfile } from "@/components/providers/profile-provider";
import { toast } from "sonner";
import { Loader2, Plus, X, Globe, User } from "lucide-react";
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
  const [savingSites, setSavingSites] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (profile && !initialized) {
      setSites(
        profile.sites.map((s) => ({
          name: s.name,
          url: s.url || "",
          abbreviation: s.abbreviation,
        }))
      );
      setInitialized(true);
    }
  }, [profile, initialized]);

  function generateAbbr(name: string) {
    return name
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 4);
  }

  function addSite() {
    const name = newSiteName.trim();
    const url = newSiteUrl.trim();
    if (!name) return;

    setSites((prev) => [
      ...prev,
      { name, url, abbreviation: generateAbbr(name) },
    ]);
    setNewSiteName("");
    setNewSiteUrl("");
  }

  function removeSite(index: number) {
    setSites((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSaveSites() {
    setSavingSites(true);
    try {
      const res = await fetch("/api/profile/sites", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sites: sites.map((s) => ({
            name: s.name,
            url: s.url || undefined,
            abbreviation: s.abbreviation || generateAbbr(s.name),
          })),
        }),
      });
      if (res.ok) {
        await refresh();
        toast.success("Sites updated");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update sites");
      }
    } catch {
      toast.error("Failed to update sites");
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
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary">
                      {site.abbreviation || generateAbbr(site.name)}
                    </span>
                  </div>
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
              className="shrink-0 w-full sm:w-auto"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

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
