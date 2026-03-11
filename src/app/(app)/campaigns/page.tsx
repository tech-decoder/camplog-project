"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageShell } from "@/components/layout/page-shell";
import { GradientPageHeader } from "@/components/layout/gradient-page-header";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Megaphone, Trash2 } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils/dates";
import { toast } from "sonner";

interface CampaignGroup {
  name: string;
  campaign_ids: string[];
  sites: string[];
  status: string;
  platform: string;
  created_at: string;
  updated_at: string;
  change_count: number;
  last_change_date: string | null;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [siteFilter, setSiteFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sites, setSites] = useState<{ site_abbreviation: string; site_name: string }[]>([]);

  useEffect(() => {
    fetchSites();
    fetchCampaigns();
  }, []);

  async function fetchSites() {
    const res = await fetch("/api/profile/sites");
    if (res.ok) {
      const data = await res.json();
      setSites((data.sites || []).map((s: { abbreviation: string; name: string }) => ({
        site_abbreviation: s.abbreviation,
        site_name: s.name,
      })));
    }
  }

  async function fetchCampaigns(overrideSite?: string, overrideStatus?: string) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const site = overrideSite ?? siteFilter;
      if (site !== "all") params.set("site", site);
      const status = overrideStatus ?? statusFilter;
      if (status !== "all") params.set("status", status);

      const res = await fetch(`/api/campaigns?${params}`);
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns || []);
      }
    } catch (err) {
      console.error("Failed to fetch campaigns:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCampaigns();
  };

  async function handleClearDrafts() {
    const draftCount = campaigns.filter((c) => c.change_count === 0).length;
    if (!window.confirm(`Delete ${draftCount} draft campaign${draftCount !== 1 ? "s" : ""} with no changes or variants?`)) {
      return;
    }
    try {
      const res = await fetch("/api/campaigns?drafts=true", { method: "DELETE" });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Cleared ${data.deleted} draft campaign${data.deleted !== 1 ? "s" : ""}`);
        fetchCampaigns();
      }
    } catch {
      toast.error("Failed to clear drafts");
    }
  }

  const statusBadgeStyle = (status: string) => {
    if (status === "active") return "";
    if (status === "paused") return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
    return "bg-muted text-muted-foreground";
  };

  return (
    <PageShell className="space-y-5">
      <GradientPageHeader
        icon={Megaphone}
        title="Campaigns"
        description={`${campaigns.length} campaigns tracked across your sites.`}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2 sm:justify-end flex-wrap">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          {sites.length > 0 && (
            <Select
              value={siteFilter}
              onValueChange={(v) => {
                setSiteFilter(v);
                fetchCampaigns(v);
              }}
            >
              <SelectTrigger className="w-36 h-9">
                <SelectValue placeholder="All sites" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sites</SelectItem>
                {sites.map((s) => (
                  <SelectItem key={s.site_abbreviation} value={s.site_abbreviation}>
                    {s.site_name || s.site_abbreviation}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              fetchCampaigns(undefined, v);
            }}
          >
            <SelectTrigger className="w-36 h-9">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          {campaigns.some((c) => c.change_count === 0) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 text-xs gap-1.5 text-muted-foreground hover:text-destructive hover:border-destructive/50"
              onClick={handleClearDrafts}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear Drafts
            </Button>
          )}
        </form>
      </div>

      {/* Campaign List */}
      {loading ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-sm text-muted-foreground text-center">Loading campaigns...</p>
          </CardContent>
        </Card>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Megaphone className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No campaigns yet. They&apos;re created automatically when you log changes in Chat.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {campaigns.map((campaign) => (
            <Card key={campaign.campaign_ids[0]} className="hover-card-glow border-border/60">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm line-clamp-2">{campaign.name}</h3>
                  <Badge
                    variant={campaign.status === "active" ? "default" : "secondary"}
                    className={`text-[10px] px-1.5 h-4 flex-shrink-0 capitalize ${statusBadgeStyle(campaign.status)}`}
                  >
                    {campaign.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1.5">
                  {campaign.sites.join(" · ") || "No site"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {campaign.change_count} change{campaign.change_count !== 1 ? "s" : ""}
                </p>
                <div className="mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
                  {campaign.last_change_date
                    ? `Updated ${formatDate(campaign.last_change_date)}`
                    : `Created ${formatDate(campaign.created_at)}`}
                </div>
                <Link href={`/campaigns/${encodeURIComponent(campaign.name)}`}>
                  <Button size="sm" className="w-full mt-3 text-xs h-8">
                    Open
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}
