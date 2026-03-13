"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
  Sparkles,
  ImageIcon,
  Megaphone,
  Pause,
  Play,
  List,
  Video,
} from "lucide-react";
import Link from "next/link";
import { GradientPageHeader } from "@/components/layout/gradient-page-header";
import { PageShell } from "@/components/layout/page-shell";
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
import { GeneratedImage } from "@/lib/types/generated-images";
import { GeneratedVideo } from "@/lib/types/generated-videos";
import { ACTION_TYPE_CONFIG, VERDICT_CONFIG } from "@/lib/constants";
import { ActionIcon } from "@/components/ui/action-icon";
import { formatDate } from "@/lib/utils/dates";
import { ImageGallery } from "@/components/generate/image-gallery";
import { VideoGallery } from "@/components/generate/video-gallery";

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
  return (
    <Suspense>
      <CampaignDetailContent />
    </Suspense>
  );
}

function CampaignDetailContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const campaignName = decodeURIComponent(params.id as string);

  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [changes, setChanges] = useState<Change[]>([]);
  const [variants, setVariants] = useState<AdCopyVariant[]>([]);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [videos, setVideos] = useState<GeneratedVideo[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState("");

  const [newVariant, setNewVariant] = useState<Record<AdCopyFieldType, string>>({
    headline: "",
    primary_text: "",
    description: "",
  });

  const [generatingCopy, setGeneratingCopy] = useState<Record<AdCopyFieldType, boolean>>({
    headline: false,
    primary_text: false,
    description: false,
  });

  const [copyLanguage, setCopyLanguage] = useState<"English" | "Spanish">("English");

  const fetchCampaign = useCallback(async () => {
    try {
      const res = await fetch(`/api/campaigns/by-name?name=${encodeURIComponent(campaignName)}`);
      if (res.ok) setCampaign(await res.json());
      else if (res.status !== 404) toast.error("Failed to load campaign");
    } catch {
      toast.error("Network error loading campaign");
    }
  }, [campaignName]);

  const fetchChanges = useCallback(async () => {
    try {
      const res = await fetch(`/api/changes?campaign=${encodeURIComponent(campaignName)}&limit=200`);
      if (res.ok) {
        const data = await res.json();
        setChanges(data.changes || []);
      }
    } catch {
      // Non-critical — changes list is supplementary
    }
  }, [campaignName]);

  const fetchVariants = useCallback(async () => {
    if (!campaign?.primary_id) return;
    try {
      const res = await fetch(`/api/campaigns/${campaign.primary_id}/variants`);
      if (res.ok) {
        const data = await res.json();
        setVariants(data.variants || []);
      }
    } catch {
      // Non-critical — variants can be reloaded
    }
  }, [campaign?.primary_id]);

  const fetchImages = useCallback(async () => {
    if (!campaign?.primary_id) return;
    try {
      const res = await fetch(`/api/campaigns/${campaign.primary_id}/images`);
      if (res.ok) {
        const data = await res.json();
        setImages(data.images || []);
      }
    } catch {
      toast.error("Failed to load campaign images");
    }
  }, [campaign?.primary_id]);

  const fetchVideos = useCallback(async () => {
    if (!campaign?.primary_id) return;
    try {
      const res = await fetch(`/api/campaigns/${campaign.primary_id}/videos`);
      if (res.ok) {
        const data = await res.json();
        setVideos(data.videos || []);
      }
    } catch {
      toast.error("Failed to load campaign videos");
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

  // Handle Drive OAuth callback
  useEffect(() => {
    const driveStatus = searchParams.get("drive");
    if (driveStatus === "connected") {
      toast.success("Google Drive connected! You can now export images.");
      window.history.replaceState({}, "", `/campaigns/${encodeURIComponent(campaignName)}`);
    } else if (driveStatus === "denied") {
      toast.error("Google Drive access was denied");
      window.history.replaceState({}, "", `/campaigns/${encodeURIComponent(campaignName)}`);
    }
  }, [searchParams, campaignName]);

  useEffect(() => {
    if (campaign?.primary_id) {
      fetchVariants();
      fetchImages();
      fetchVideos();
    }
  }, [campaign?.primary_id, fetchVariants, fetchImages, fetchVideos]);

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

  async function handleToggleStatus() {
    if (!campaign) return;
    const newStatus = campaign.status === "active" ? "paused" : "active";
    const res = await fetch(`/api/campaigns/by-name?name=${encodeURIComponent(campaignName)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      toast.success(`Campaign ${newStatus === "active" ? "activated" : "paused"}`);
      fetchCampaign();
    }
  }

  async function handleDeleteCampaign() {
    if (!campaign) return;
    if (!window.confirm(`Delete "${campaign.name}"? This will also remove all ad copy variants.`)) return;
    const res = await fetch(`/api/campaigns/by-name?name=${encodeURIComponent(campaignName)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Campaign deleted");
      router.push("/campaigns");
    } else {
      toast.error("Failed to delete campaign");
    }
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

  async function handleGenerateCopy(fieldType: AdCopyFieldType) {
    if (!campaign?.primary_id) return;
    setGeneratingCopy((prev) => ({ ...prev, [fieldType]: true }));

    try {
      const res = await fetch(`/api/campaigns/${campaign.primary_id}/generate-copy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field_type: fieldType, count: 5, language: copyLanguage }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Generated ${data.variants?.length || 0} ${FIELD_LABELS[fieldType].toLowerCase()}`);
        fetchVariants();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to generate copy");
      }
    } catch {
      toast.error("Failed to generate copy");
    } finally {
      setGeneratingCopy((prev) => ({ ...prev, [fieldType]: false }));
    }
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
      <div>
        <p className="text-sm text-muted-foreground">Campaign not found.</p>
        <Button variant="ghost" size="sm" className="mt-2" onClick={() => router.push("/campaigns")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
      </div>
    );
  }

  return (
    <PageShell className="space-y-5">
      {/* Header */}
      <GradientPageHeader
        icon={Megaphone}
        title={campaign.name}
        description={`${allSites.join(" · ")}${allSites.length > 0 ? " · " : ""}${campaign.change_count} changes · Since ${formatDate(campaign.created_at)}`}
        actions={
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => {
                setEditName(campaign.name);
                setEditingName(true);
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant={campaign.status === "active" ? "outline" : "default"}
              className={`gap-1.5 ${campaign.status === "active" ? "text-amber-700 hover:text-amber-700 hover:bg-amber-500/10 border-amber-500/30" : ""}`}
              onClick={handleToggleStatus}
            >
              {campaign.status === "active" ? (
                <><Pause className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Pause</span></>
              ) : (
                <><Play className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Activate</span></>
              )}
            </Button>
            <Link href={`/generate?campaign=${campaign.primary_id}`}>
              <Button size="sm" variant="outline" className="gap-1.5">
                <ImageIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Generate Images</span>
              </Button>
            </Link>
            {campaign.change_count === 0 && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={handleDeleteCampaign}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => router.push("/campaigns")}
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Back
            </Button>
          </div>
        }
      />

      {/* Inline name edit */}
      {editingName && (
        <div className="flex items-center gap-2">
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="h-9 font-semibold max-w-md"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveName();
              if (e.key === "Escape") setEditingName(false);
            }}
          />
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSaveName}>
            <Check className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingName(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Metrics Over Time */}
      {chartData.length > 1 && (
        <Card className="hover-card-glow border-border/60 gap-0">
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

      {/* Campaign Images */}
      {images.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <ImageIcon className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-sm font-semibold">
              Creative Images <span className="font-normal text-muted-foreground">({images.length})</span>
            </h2>
          </div>
          <ImageGallery
            images={images}
            onDelete={(id) => setImages((prev) => prev.filter((img) => img.id !== id))}
            onBulkDelete={(ids) => setImages((prev) => prev.filter((img) => !ids.includes(img.id)))}
            campaignId={campaign?.primary_id}
            campaignName={campaign?.name}
          />
        </div>
      )}

      {/* Campaign Videos */}
      {videos.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <Video className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
            </div>
            <h2 className="text-sm font-semibold">
              Creative Videos <span className="font-normal text-muted-foreground">({videos.length})</span>
            </h2>
          </div>
          <VideoGallery
            videos={videos}
            onDelete={(id) => setVideos((prev) => prev.filter((v) => v.id !== id))}
            onBulkDelete={(ids) => setVideos((prev) => prev.filter((v) => !ids.includes(v.id)))}
            campaignId={campaign?.primary_id}
            campaignName={campaign?.name}
          />
        </div>
      )}

      {/* Ad Copy Variants */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-sm font-semibold">Ad Copy Variants</h2>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 text-xs">
            <button
              className={`px-2 py-1 rounded-md transition-colors ${copyLanguage === "English" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setCopyLanguage("English")}
            >
              EN
            </button>
            <button
              className={`px-2 py-1 rounded-md transition-colors ${copyLanguage === "Spanish" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setCopyLanguage("Spanish")}
            >
              ES
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(["headline", "primary_text", "description"] as const).map((fieldType) => {
            const items = variantsByType(fieldType);
            const isGenerating = generatingCopy[fieldType];
            return (
              <Card key={fieldType} className="overflow-hidden hover-card-glow border-border/60 gap-0 py-0">
                <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium">{FIELD_LABELS[fieldType]}</span>
                    <span className="text-xs text-muted-foreground">({items.length})</span>
                  </div>
                  <button
                    className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                    onClick={() => handleGenerateCopy(fieldType)}
                    disabled={isGenerating}
                    title={`Generate ${FIELD_LABELS[fieldType].toLowerCase()} with AI`}
                  >
                    {isGenerating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
                <CardContent className="p-3">
                  <div className="space-y-0.5 max-h-[400px] overflow-y-auto">
                    {items.map((variant) => (
                      <div
                        key={variant.id}
                        className="group flex items-start gap-2 px-2.5 py-2 rounded-md hover:bg-accent/40 transition-colors"
                      >
                        <p className="flex-1 text-sm leading-relaxed">{variant.content}</p>
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
                  </div>
                  <div className="flex gap-1.5 pt-2 border-t border-border/50 mt-2">
                    <Input
                      placeholder={`Add ${FIELD_LABELS[fieldType].toLowerCase().slice(0, -1)}...`}
                      value={newVariant[fieldType]}
                      onChange={(e) => setNewVariant((prev) => ({ ...prev, [fieldType]: e.target.value }))}
                      className="h-8 text-xs"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddVariant(fieldType);
                        }
                      }}
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8 flex-shrink-0" onClick={() => handleAddVariant(fieldType)}>
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
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <List className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-sm font-semibold">
            Change History <span className="font-normal text-muted-foreground">({changes.length})</span>
          </h2>
        </div>
        {changes.length === 0 ? (
          <Card className="hover-card-glow border-border/60 py-0">
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">No changes recorded yet.</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="hover-card-glow border-border/60 gap-0 py-0">
            <CardContent className="p-0">
              <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
                {changes.map((change) => {
                  const config = ACTION_TYPE_CONFIG[change.action_type];
                  const isVoided = change.status === "voided";

                  return (
                    <Link
                      key={change.id}
                      href={`/changes/${change.id}`}
                      className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 hover:bg-accent/50 transition-colors min-w-0 ${
                        isVoided ? "opacity-50" : ""
                      }`}
                    >
                      <Badge
                        variant="secondary"
                        className={`${config?.bgColor} ${config?.color} text-[11px] flex-shrink-0 gap-1 h-5 px-1.5`}
                      >
                        {config && <ActionIcon iconName={config.icon} className="h-3 w-3" />}
                        <span className="hidden sm:inline">{config?.label}</span>
                      </Badge>
                      {change.site && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 font-normal flex-shrink-0">
                          {change.site}
                        </Badge>
                      )}
                      <span className={`flex-1 text-sm truncate min-w-0 ${isVoided ? "line-through text-muted-foreground" : ""}`}>
                        {change.geo ? `${change.geo} ` : ""}
                        {change.change_value || change.description || ""}
                      </span>
                      {change.impact_verdict && (
                        <Badge
                          variant="secondary"
                          className={`${VERDICT_CONFIG[change.impact_verdict]?.bgColor} ${VERDICT_CONFIG[change.impact_verdict]?.color} text-[11px] h-5 px-1.5 hidden sm:flex`}
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
    </PageShell>
  );
}
