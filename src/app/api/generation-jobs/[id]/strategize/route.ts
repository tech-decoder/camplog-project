import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveUserId } from "@/lib/supabase/route-helpers";
import {
  generateTakeoverStrategy,
  generateCustomStrategy,
  generateWinningVariantsStrategy,
  withStrategyRetry,
} from "@/lib/claude/generate-strategy";
import { generateVideoTakeoverStrategy } from "@/lib/claude/generate-video-strategy";
import { generateCreativeBrief } from "@/lib/claude/creative-director";
import {
  GenerationJob,
  StylePreference,
  CreativeMemoryItem,
  VideoDuration,
} from "@/lib/types/generation-jobs";


export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await resolveUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: jobId } = await params;
  const supabase = createAdminClient();

  // Load the job
  const { data: job, error: jobError } = await supabase
    .from("generation_jobs")
    .select("*")
    .eq("id", jobId)
    .eq("user_id", userId)
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const typedJob = job as GenerationJob;

  if (typedJob.status !== "pending" && typedJob.status !== "strategy_ready") {
    return NextResponse.json(
      { error: "Job is not in a valid state for strategizing" },
      { status: 400 }
    );
  }

  // Update status
  await supabase
    .from("generation_jobs")
    .update({ status: "strategizing" })
    .eq("id", jobId);

  try {
    let strategy;
    const formatSplit = typedJob.format_split || { square: 6, portrait: 6 };

    // ── Step 1: Load creative memory for this brand ──────────────────────────
    let memoryItems: CreativeMemoryItem[] = [];
    try {
      const { data: memRows } = await supabase
        .from("creative_memory")
        .select("content, memory_type, brand_name")
        .eq("user_id", userId)
        .or(
          `brand_name.eq.${typedJob.brand_name},brand_name.is.null`
        )
        .order("created_at", { ascending: false })
        .limit(20);
      if (memRows) memoryItems = memRows as CreativeMemoryItem[];
    } catch {
      // Table may not exist yet — safe to continue without memory
    }

    // ── Step 2: Load style prefs (needed for custom mode + creative director) ─
    const { data: prefs } = await supabase
      .from("style_preferences")
      .select("*")
      .eq("user_id", userId)
      .is("campaign_id", null)
      .single();

    let stylePrefs = prefs as StylePreference | null;
    if (typedJob.campaign_id) {
      const { data: campaignPrefs } = await supabase
        .from("style_preferences")
        .select("*")
        .eq("user_id", userId)
        .eq("campaign_id", typedJob.campaign_id)
        .single();
      if (campaignPrefs) stylePrefs = campaignPrefs as StylePreference;
    }

    const styles = stylePrefs?.styles || [
      { style: "graphic_text" as const, weight: 3, enabled: true },
      { style: "storefront_card" as const, weight: 3, enabled: true },
      { style: "uniform_style" as const, weight: 3, enabled: true },
      { style: "inside_store" as const, weight: 3, enabled: true },
    ];

    // ── Step 3: Run Creative Director agent ──────────────────────────────────
    const creativeBrief = await generateCreativeBrief({
      brandName: typedJob.brand_name,
      mode: typedJob.mode,
      stylePreferences: styles,
      memoryItems,
      language: typedJob.language,
    });

    // ── Step 4: Resolve language-aware copy pool ────────────────────────────
    const languagePool = stylePrefs?.copy_pools?.[typedJob.language];
    const fallbackPool = stylePrefs?.copy_pool;
    const resolvedCopyPool = languagePool || fallbackPool;

    // ── Step 5: Generate strategy using the brief (with retry) ────────────────

    // Video generation uses a separate strategy generator
    if (typedJob.media_type === "video") {
      const videoFormatSplit = typedJob.format_split
        ? { landscape: typedJob.format_split.square || 0, portrait: typedJob.format_split.portrait || 0 }
        : { landscape: 3, portrait: 3 };
      const videoDuration = (typedJob.video_duration || 4) as VideoDuration;

      strategy = await withStrategyRetry(
        () => generateVideoTakeoverStrategy({
          brandName: typedJob.brand_name,
          totalCount: typedJob.total_count || undefined,
          formatSplit: videoFormatSplit,
          language: typedJob.language,
          duration: videoDuration,
          creativeBrief,
        }),
        "Video Takeover strategy"
      );

      // Save strategy + brief to job
      await supabase
        .from("generation_jobs")
        .update({
          strategy,
          creative_brief: creativeBrief,
          status: "strategy_ready",
          images_requested: strategy.items.length,
        })
        .eq("id", jobId);

      return NextResponse.json({ strategy });
    }

    if (typedJob.mode === "ai_takeover") {
      strategy = await withStrategyRetry(
        () => generateTakeoverStrategy({
          brandName: typedJob.brand_name,
          totalCount: typedJob.total_count || undefined,
          formatSplit,
          language: typedJob.language,
          creativeBrief,
        }),
        "AI Takeover strategy"
      );
    } else if (typedJob.mode === "custom") {
      strategy = await withStrategyRetry(
        () => generateCustomStrategy({
          brandName: typedJob.brand_name,
          totalCount: typedJob.total_count || undefined,
          formatSplit,
          language: typedJob.language,
          stylePreferences: styles,
          copyPool: resolvedCopyPool,
          creativeBrief,
        }),
        "Custom strategy"
      );
    } else if (typedJob.mode === "winning_variants") {
      if (!typedJob.reference_images?.length) {
        await supabase
          .from("generation_jobs")
          .update({ status: "failed", error_message: "No reference images provided" })
          .eq("id", jobId);
        return NextResponse.json(
          { error: "Reference images required for winning variants mode" },
          { status: 400 }
        );
      }

      strategy = await withStrategyRetry(
        () => generateWinningVariantsStrategy({
          brandName: typedJob.brand_name,
          totalCount: typedJob.total_count || undefined,
          formatSplit,
          language: typedJob.language,
          referenceImageUrls: typedJob.reference_images,
          creativeBrief,
        }),
        "Winning Variants strategy"
      );
    } else {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
    }

    // Save strategy + brief to job
    await supabase
      .from("generation_jobs")
      .update({
        strategy,
        creative_brief: creativeBrief,
        status: "strategy_ready",
        images_requested: strategy.items.length,
      })
      .eq("id", jobId);

    return NextResponse.json({ strategy });
  } catch (err) {
    const errorDetail = err instanceof Error
      ? `${err.name}: ${err.message}`
      : String(err);
    const errorStack = err instanceof Error ? err.stack : undefined;

    console.error("Strategy generation failed:", errorDetail);
    if (errorStack) console.error("Stack:", errorStack);

    // Store detailed error for debugging
    const shortError = errorDetail.length > 500
      ? errorDetail.slice(0, 500) + "..."
      : errorDetail;

    await supabase
      .from("generation_jobs")
      .update({
        status: "failed",
        error_message: shortError,
      })
      .eq("id", jobId);

    return NextResponse.json(
      {
        error: "Failed to generate strategy",
        detail: shortError,
        mode: typedJob.mode,
        brand: typedJob.brand_name,
      },
      { status: 500 }
    );
  }
}
