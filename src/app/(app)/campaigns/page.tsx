"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Megaphone, ChevronRight } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils/dates";

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

  async function fetchCampaigns(overrideSite?: string) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const site = overrideSite ?? siteFilter;
      if (site !== "all") params.set("site", site);

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

  return (
    <div className="p-6 space-y-5">
      {/* Header + inline filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <h1 className="text-lg font-semibold whitespace-nowrap">
          Campaigns
          <span className="text-muted-foreground font-normal ml-1.5 text-sm">
            {campaigns.length}
          </span>
        </h1>
        <form onSubmit={handleSearch} className="flex flex-1 gap-2 sm:justify-end">
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
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {campaigns.map((campaign) => (
                <Link
                  key={campaign.campaign_ids[0]}
                  href={`/campaigns/${encodeURIComponent(campaign.name)}`}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{campaign.name}</span>
                      {campaign.sites.map((s) => (
                        <Badge key={s} variant="outline" className="text-[11px] px-1.5 py-0 h-5 font-normal">
                          {s}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      <span>{campaign.change_count} change{campaign.change_count !== 1 ? "s" : ""}</span>
                      {campaign.sites.length > 1 && (
                        <>
                          <span className="text-border">·</span>
                          <span>{campaign.sites.length} sites</span>
                        </>
                      )}
                      {campaign.last_change_date && (
                        <>
                          <span className="text-border">·</span>
                          <span>{formatDate(campaign.last_change_date)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
