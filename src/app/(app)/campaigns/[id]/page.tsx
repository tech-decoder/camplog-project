"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Check,
  X,
  Pencil,
  Copy,
  Trash2,
  Plus,
  Loader2,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Change } from "@/lib/types/changes";
import { AdCopyVariant, AdCopyFieldType } from "@/lib/types/ad-copies";
import { ACTION_TYPE_CONFIG, VERDICT_CONFIG } from "@/lib/constants";
import { ActionIcon } from "@/components/ui/action-icon";
import { formatDate } from "@/lib/utils/dates";

interface CampaignData {
  name: string;
  campaign_ids: string[];
  primary_id: string;
  sites: string[];
  platform: string;
  status: string;
  created_at: string;
  change_count: number;
}

const FIELD_LABELS: Record<AdCopyFieldType, string> = {
  headline: "Headlines",
  primary_text: "Primary Texts",
  description: "Descriptions",
};

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  // [id] is the campaign name (URL-encoded)
  const campaignName = decodeURIComponent(params.id as string);

  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [changes, setChanges] = useState<Change[]>([]);
  const [variants, setVariants] = useState<AdCopyVariant[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState("");

  const [newVariant, setNewVariant] = useState<Record<AdCopyFieldType, string>>({
    headline: "",
    primary_text: "",
    description: "",
  });

  const fetchCampaign = useCallback(async () => {
    const res = await fetch(`/api/campaigns/by-name?name=${encodeURIComponent(campaignName)}`);
    if (res.ok) setCampaign(await res.json());
  }, [campaignName]);

  const fetchChanges = useCallback(async () => {
    const res = await fetch(`/api/changes?campaign=${encodeURIComponent(campaignName)}&limit=200`);
    if (res.ok) {
      const data = await res.json();
      setChanges(data.changes || []);
    }
  }, [campaignName]);

  const fetchVariants = useCallback(async () => {
    if (!campaign?.primary_id) return;
    const res = await fetch(`/api/campaigns/${campaign.primary_id}/variants`);
    if (res.ok) {
      const data = await res.json();
      setVariants(data.variants || []);
    }
  }, [campaign?.primary_id]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      await Promise.all([fetchCampaign(), fetchChanges()]);
      setLoading(false);
    }
    load();
  }, [fetchCampaign, fetchChanges]);

  // Fetch variants once we have the primary campaign ID
  useEffect(() => {
    if (campaign?.primary_id) fetchVariants();
  }, [campaign?.primary_id, fetchVariants]);

  async function handleSaveName() {
    if (!editName.trim() || editName === campaign?.name) {
      setEditingName(false);
      return;
    }
    const res = await fetch(`/api/campaigns/by-name?name=${encodeURIComponent(campaignName)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    if (res.ok) {
      toast.success("Campaign name updated");
      router.replace(`/campaigns/${encodeURIComponent(editName.trim())}`);
    }
    setEditingName(false);
  }

  async function handleAddVariant(fieldType: AdCopyFieldType) {
    if (!campaign?.primary_id) return;
    const content = newVariant[fieldType].trim();
    if (!content) return;

    const body: Record<string, string[]> = {};
    if (fieldType === "headline") body.headlines = [content];
    if (fieldType === "primary_text") body.primary_texts = [content];
    if (fieldType === "description") body.descriptions = [content];

    const res = await fetch(`/api/campaigns/${campaign.primary_id}/variants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setNewVariant((prev) => ({ ...prev, [fieldType]: "" }));
      fetchVariants();
      toast.success("Variant added");
    }
  }

  async function handleDeleteVariant(variantId: string) {
    if (!campaign?.primary_id) return;
    const res = await fetch(`/api/campaigns/${campaign.primary_id}/variants`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [variantId] }),
    });
    if (res.ok) {
      setVariants((prev) => prev.filter((v) => v.id !== variantId));
      toast.success("Variant removed");
    }
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  }

  // Chart data from change metrics
  const chartData = changes
    .filter((c) => {
      const m = c.pre_metrics || {};
      return m.margin_pct != null || m.fb_spend != null || m.ad_revenue != null;
    })
    .sort((a, b) => a.change_date.localeCompare(b.change_date))
    .map((c) => ({
      date: formatDate(c.change_date),
      margin: c.pre_metrics?.margin_pct != null ? Number(c.pre_metrics.margin_pct) : undefined,
      fb_spend: c.pre_metrics?.fb_spend != null ? Number(c.pre_metrics.fb_spend) : undefined,
      revenue: c.pre_metrics?.ad_revenue != null ? Number(c.pre_metrics.ad_revenue) : undefined,
    }));

  // Unique sites from changes + campaign data
  const changeSites = [...new Set(changes.map((c) => c.site).filter(Boolean))] as string[];
  const allSites = campaign ? [...new Set([...campaign.sites, ...changeSites])] : changeSites;

  const variantsByType = (type: AdCopyFieldType) => variants.filter((v) => v.field_type === type);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Campaign not found.</p>
        <Button variant="ghost" size="sm" className="mt-2" onClick={() => router.push("/campaigns")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push("/campaigns")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          {editingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-8 font-semibold"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveName();
                  if (e.key === "Escape") setEditingName(false);
                }}
              />
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveName}>
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingName(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold truncate">{campaign.name}</h1>
              <button
                className="text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => {
                  setEditName(campaign.name);
                  setEditingName(true);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground flex-wrap">
            {allSites.length > 0 && (
              <>
                {allSites.map((s) => (
                  <Badge key={s} variant="outline" className="text-[11px] px-1.5 py-0 h-5 font-normal">
                    {s}
                  </Badge>
                ))}
                <span className="text-border">·</span>
              </>
            )}
            <span>{campaign.change_count} changes</span>
            <span className="text-border">·</span>
            <span>Since {formatDate(campaign.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Metrics Over Time */}
      {chartData.length > 1 && (
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Metrics Over Time
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-2 pb-3">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={40} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                    fontSize: "11px",
                    padding: "6px 10px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Line type="monotone" dataKey="margin" name="Margin %" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 2.5 }} connectNulls />
                <Line type="monotone" dataKey="fb_spend" name="FB Spend" stroke="hsl(220, 70%, 50%)" strokeWidth={1.5} dot={{ r: 2 }} connectNulls />
                <Line type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(142, 70%, 45%)" strokeWidth={1.5} dot={{ r: 2 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Ad Copy Variants */}
      <div>
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Ad Copy Variants
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(["headline", "primary_text", "description"] as const).map((fieldType) => {
            const items = variantsByType(fieldType);
            return (
              <Card key={fieldType} className="overflow-hidden">
                <div className="px-3 py-2 border-b border-border bg-muted/30">
                  <span className="text-xs font-medium">{FIELD_LABELS[fieldType]}</span>
                  <span className="text-xs text-muted-foreground ml-1">({items.length})</span>
                </div>
                <CardContent className="p-2 space-y-1">
                  {items.map((variant) => (
                    <div
                      key={variant.id}
                      className="group flex items-start gap-1.5 px-2 py-1.5 rounded-md hover:bg-accent/40 transition-colors"
                    >
                      <p className="flex-1 text-[13px] leading-snug">{variant.content}</p>
                      <div className="flex gap-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-px">
                        <button
                          className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => handleCopy(variant.content)}
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                        <button
                          className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          onClick={() => handleDeleteVariant(variant.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-1 pt-1">
                    <Input
                      placeholder={`Add ${FIELD_LABELS[fieldType].toLowerCase().slice(0, -1)}...`}
                      value={newVariant[fieldType]}
                      onChange={(e) => setNewVariant((prev) => ({ ...prev, [fieldType]: e.target.value }))}
                      className="h-7 text-xs"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddVariant(fieldType);
                        }
                      }}
                    />
                    <Button size="icon" variant="ghost" className="h-7 w-7 flex-shrink-0" onClick={() => handleAddVariant(fieldType)}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Change History */}
      <div>
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Change History
          <span className="ml-1 font-normal">({changes.length})</span>
        </h2>
        {changes.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">No changes recorded yet.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {changes.map((change) => {
                  const config = ACTION_TYPE_CONFIG[change.action_type];
                  const isVoided = change.status === "voided";

                  return (
                    <Link
                      key={change.id}
                      href={`/changes/${change.id}`}
                      className={`flex items-center gap-3 px-4 py-2.5 hover:bg-accent/50 transition-colors ${
                        isVoided ? "opacity-50" : ""
                      }`}
                    >
                      <Badge
                        variant="secondary"
                        className={`${config?.bgColor} ${config?.color} text-[11px] flex-shrink-0 gap-1 h-5 px-1.5`}
                      >
                        {config && <ActionIcon iconName={config.icon} className="h-3 w-3" />}
                        {config?.label}
                      </Badge>
                      {change.site && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 font-normal flex-shrink-0">
                          {change.site}
                        </Badge>
                      )}
                      <span className={`flex-1 text-sm truncate ${isVoided ? "line-through text-muted-foreground" : ""}`}>
                        {change.geo ? `${change.geo} ` : ""}
                        {change.change_value || change.description || ""}
                      </span>
                      {change.impact_verdict && (
                        <Badge
                          variant="secondary"
                          className={`${VERDICT_CONFIG[change.impact_verdict]?.bgColor} ${VERDICT_CONFIG[change.impact_verdict]?.color} text-[11px] h-5 px-1.5`}
                        >
                          {VERDICT_CONFIG[change.impact_verdict]?.label}
                        </Badge>
                      )}
                      <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                        {formatDate(change.change_date)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
