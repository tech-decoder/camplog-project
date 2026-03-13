import { createAdminClient } from "@/lib/supabase/admin";
import { generateVideoWithVeo, downloadVeoVideo } from "@/lib/gemini/veo-client";
import { buildVideoPromptFromStrategy } from "./prompt-builder";
import {
  GenerationJob,
  VideoGenerationStrategy,
  VideoStrategyItem,
  VideoDuration,
} from "@/lib/types/generation-jobs";

/**
 * Execute video generation for a job.
 * Processes videos sequentially (1 at a time) to stay within Vercel timeout.
 * Each video takes 1-3 minutes to generate via Veo 3.
 */
export async function executeVideoGenerationJob(jobId: string): Promise<void> {
  const supabase = createAdminClient();

  // Load the job
  const { data: job, error: jobError } = await supabase
    .from("generation_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (jobError || !job) {
    console.error("Failed to load video generation job:", jobError);
    return;
  }

  const typedJob = job as GenerationJob;
  const strategy = typedJob.strategy as VideoGenerationStrategy | null;
  if (!strategy || !strategy.items?.length) {
    await supabase
      .from("generation_jobs")
      .update({ status: "failed", error_message: "No video strategy found" })
      .eq("id", jobId);
    return;
  }

  const duration = (typedJob.video_duration || 4) as VideoDuration;

  // Update job to generating
  await supabase
    .from("generation_jobs")
    .update({
      status: "generating",
      images_requested: strategy.items.length,
      started_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  let completed = 0;
  let failed = 0;
  let rateLimitHit = false;

  // Process videos sequentially (each takes 1-3 min)
  for (const item of strategy.items) {
    try {
      await processVideoItem(supabase, typedJob, item, duration, jobId);
      completed++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Video generation failed for item ${item.index}:`, message);

      // Detect Gemini rate limit (429 / RESOURCE_EXHAUSTED)
      if (
        message.includes("429") ||
        message.includes("RESOURCE_EXHAUSTED") ||
        message.includes("quota")
      ) {
        rateLimitHit = true;
        failed += strategy.items.length - completed - failed;
        break; // No point continuing — all subsequent calls will also fail
      }

      failed++;
    }

    await updateJobProgress(supabase, jobId, completed, failed);
  }

  // Backfill campaign_id if job was saved to campaign during generation
  const { data: freshJob } = await supabase
    .from("generation_jobs")
    .select("campaign_id")
    .eq("id", jobId)
    .single();

  if (freshJob?.campaign_id) {
    await supabase
      .from("generated_videos")
      .update({ campaign_id: freshJob.campaign_id })
      .eq("job_id", jobId)
      .is("campaign_id", null);
  }

  // Finalize job
  const finalStatus = completed === 0 ? "failed" : "completed";
  let errorMessage: string | null = null;
  if (rateLimitHit) {
    errorMessage =
      completed > 0
        ? `Rate limit hit — generated ${completed} of ${strategy.items.length} videos. Try again later.`
        : "Gemini rate limit reached. You've hit your free quota for video generation. Try again in a few hours or upgrade your API plan.";
  } else if (completed === 0) {
    errorMessage = "All videos failed to generate";
  }

  await supabase
    .from("generation_jobs")
    .update({
      status: finalStatus,
      images_completed: completed,
      images_failed: failed,
      completed_at: new Date().toISOString(),
      error_message: errorMessage,
    })
    .eq("id", jobId);
}

async function processVideoItem(
  supabase: ReturnType<typeof createAdminClient>,
  job: GenerationJob,
  item: VideoStrategyItem,
  duration: VideoDuration,
  jobId: string
): Promise<void> {
  const prompt = buildVideoPromptFromStrategy(item, job.brand_name, duration);

  // Generate video with Veo 3 (internally polls for 1-3 min)
  const { videoUri } = await generateVideoWithVeo({
    prompt,
    aspectRatio: item.aspect_ratio,
    durationSeconds: duration,
  });

  // Download the video
  const videoBuffer = await downloadVeoVideo(videoUri);

  // Upload to Supabase Storage
  const videoId = crypto.randomUUID();
  const storagePath = `${job.user_id}/${jobId}/${item.video_ad_style}_${item.index}.mp4`;

  const { error: uploadError } = await supabase.storage
    .from("generated-videos")
    .upload(storagePath, videoBuffer, { contentType: "video/mp4" });

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

  const {
    data: { publicUrl },
  } = supabase.storage.from("generated-videos").getPublicUrl(storagePath);

  // Insert into generated_videos table
  const { error: insertError } = await supabase
    .from("generated_videos")
    .insert({
      id: videoId,
      user_id: job.user_id,
      campaign_id: job.campaign_id || null,
      video_url: publicUrl,
      prompt,
      model: job.video_model || "veo-3-fast",
      aspect_ratio: item.aspect_ratio,
      duration_seconds: duration,
      video_ad_style: item.video_ad_style,
      headline_ref: item.headline,
      subheadline_ref: item.subheadline,
      cta_text: item.cta,
      language: job.language,
      status: "completed",
      metadata: {},
      job_id: jobId,
      generation_index: item.index,
    });

  if (insertError) throw new Error(`DB insert failed: ${insertError.message}`);
}

async function updateJobProgress(
  supabase: ReturnType<typeof createAdminClient>,
  jobId: string,
  completed: number,
  failed: number
) {
  await supabase
    .from("generation_jobs")
    .update({ images_completed: completed, images_failed: failed })
    .eq("id", jobId);
}
