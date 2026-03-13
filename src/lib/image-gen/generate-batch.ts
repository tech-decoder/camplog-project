import { createAdminClient } from "@/lib/supabase/admin";
import {
  generateImageWithOpenAI,
  isOpenAIBillingError,
} from "@/lib/openai/generate-images";
import {
  generateImageWithGemini,
  generateImageWithGeminiFlash,
  generateImageWithGeminiPro,
} from "@/lib/gemini/client";
import { buildPromptFromStrategy } from "./prompt-builder";
import { GenerationJob, GenerationStrategy, StrategyItem } from "@/lib/types/generation-jobs";
import { ImageModel } from "@/lib/types/generated-images";
import { FORMAT_DIMENSIONS } from "@/lib/constants/image-gen";

/**
 * Thrown when both OpenAI and Gemini fail due to billing/quota limits.
 * Used by the circuit breaker to short-circuit remaining items.
 */
class BillingLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BillingLimitError";
  }
}

async function generateSingleImage(
  prompt: string,
  model: ImageModel,
  format: "1:1" | "9:16",
  quality: string
): Promise<{ b64Data: string; mimeType: string; revisedPrompt?: string }> {
  if (model === "gemini-pro-image") {
    const results = await generateImageWithGeminiPro({ prompt, count: 1, format });
    if (!results[0]) throw new Error("No image returned from Gemini Pro");
    return { b64Data: results[0].b64Data, mimeType: results[0].mimeType };
  }

  if (model === "gemini-flash-image") {
    const results = await generateImageWithGeminiFlash({ prompt, count: 1, format });
    if (!results[0]) throw new Error("No image returned from Gemini Flash");
    return { b64Data: results[0].b64Data, mimeType: results[0].mimeType };
  }

  if (model === "imagen-3") {
    const results = await generateImageWithGemini({ prompt, count: 1, format });
    if (!results[0]) throw new Error("No image returned from Imagen 3");
    return { b64Data: results[0].b64Data, mimeType: results[0].mimeType };
  }

  // Default: OpenAI GPT Image — with Gemini Pro fallback on billing errors
  const qualityMap = { draft: "draft", standard: "standard", premium: "premium" } as const;
  try {
    const results = await generateImageWithOpenAI({
      prompt,
      count: 1,
      format,
      quality: qualityMap[quality as keyof typeof qualityMap] || "standard",
    });
    if (!results[0]) throw new Error("No image returned from OpenAI");
    return {
      b64Data: results[0].b64Data,
      mimeType: "image/png",
      revisedPrompt: results[0].revisedPrompt,
    };
  } catch (err) {
    if (!isOpenAIBillingError(err)) throw err;

    // OpenAI billing limit hit — fallback to Gemini Pro
    console.warn(
      `[Fallback] OpenAI billing error, trying gemini-pro-image...`,
      err instanceof Error ? err.message : String(err)
    );
    try {
      const fallbackResults = await generateImageWithGeminiPro({
        prompt,
        count: 1,
        format,
      });
      if (!fallbackResults[0]) {
        throw new BillingLimitError(
          "OpenAI billing limit reached and Gemini returned no image"
        );
      }
      return {
        b64Data: fallbackResults[0].b64Data,
        mimeType: fallbackResults[0].mimeType,
      };
    } catch (fallbackErr) {
      // If Gemini also fails, wrap as BillingLimitError for circuit breaker
      throw new BillingLimitError(
        `OpenAI billing limit reached. Gemini fallback also failed: ${fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)}`
      );
    }
  }
}

export async function executeGenerationJob(jobId: string): Promise<void> {
  const supabase = createAdminClient();

  // Load the job
  const { data: job, error: jobError } = await supabase
    .from("generation_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (jobError || !job) {
    console.error("Failed to load generation job:", jobError);
    return;
  }

  const typedJob = job as GenerationJob;
  const strategy = typedJob.strategy as GenerationStrategy | null;
  if (!strategy || !strategy.items?.length) {
    await supabase
      .from("generation_jobs")
      .update({ status: "failed", error_message: "No strategy found" })
      .eq("id", jobId);
    return;
  }

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
  let billingCircuitBroken = false;

  const BATCH_SIZE = 3;

  async function processItem(item: StrategyItem) {
    const prompt = buildPromptFromStrategy(item, typedJob.brand_name, typedJob.language || "English");
    const dimensions = FORMAT_DIMENSIONS[item.format];

    const result = await generateSingleImage(
      prompt,
      typedJob.model as ImageModel,
      item.format,
      typedJob.quality
    );

    const imageId = crypto.randomUUID();
    const ext = result.mimeType === "image/jpeg" ? "jpg" : "png";
    const storagePath = `${typedJob.user_id}/${typedJob.campaign_id || "no-campaign"}/${imageId}.${ext}`;
    const buffer = Buffer.from(result.b64Data, "base64");

    const { error: uploadError } = await supabase.storage
      .from("generated-images")
      .upload(storagePath, buffer, { contentType: result.mimeType || "image/png" });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    const { data: { publicUrl } } = supabase.storage
      .from("generated-images")
      .getPublicUrl(storagePath);

    const { error: insertError } = await supabase.from("generated_images").insert({
      id: imageId,
      user_id: typedJob.user_id,
      campaign_id: typedJob.campaign_id || null,
      image_url: publicUrl,
      prompt,
      model: typedJob.model,
      quality: typedJob.quality,
      style_preset: item.ad_style,
      dimensions,
      headline_ref: item.headline,
      primary_text_ref: null,
      metadata: { revised_prompt: result.revisedPrompt || null },
      status: "completed",
      job_id: jobId,
      ad_style: item.ad_style,
      cta_text: item.cta,
      subheadline: item.subheadline,
      language: typedJob.language,
      generation_index: item.index,
    });

    if (insertError) throw new Error(`DB insert failed: ${insertError.message}`);
  }

  // Process in batches of BATCH_SIZE in parallel — with circuit breaker
  for (let i = 0; i < strategy.items.length; i += BATCH_SIZE) {
    // Circuit breaker: if billing limit was hit, skip remaining items
    if (billingCircuitBroken) {
      const remainingCount = strategy.items.length - i;
      console.warn(
        `[Circuit Breaker] Skipping ${remainingCount} remaining items due to billing limit`
      );
      failed += remainingCount;
      break;
    }

    const batch = strategy.items.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(batch.map((item) => processItem(item)));

    for (let j = 0; j < results.length; j++) {
      if (results[j].status === "fulfilled") {
        completed++;
      } else {
        const reason = (results[j] as PromiseRejectedResult).reason;
        console.error(
          `Image generation failed for item ${batch[j].index}:`,
          reason
        );
        failed++;

        // Trip the circuit breaker on billing errors
        if (reason instanceof BillingLimitError) {
          billingCircuitBroken = true;
        }
      }
    }

    await updateJobProgress(supabase, jobId, completed, failed);
  }

  // Backfill campaign_id: if the job was saved to a campaign while generating,
  // the images inserted during generation won't have the campaign_id.
  // Re-read the job and link any orphaned images.
  const { data: freshJob } = await supabase
    .from("generation_jobs")
    .select("campaign_id")
    .eq("id", jobId)
    .single();

  if (freshJob?.campaign_id) {
    await supabase
      .from("generated_images")
      .update({ campaign_id: freshJob.campaign_id })
      .eq("job_id", jobId)
      .is("campaign_id", null);
  }

  // Finalize job
  const finalStatus = completed === 0 ? "failed" : "completed";
  const errorMessage = billingCircuitBroken
    ? "Image provider billing limit reached. OpenAI hit spending cap and Gemini fallback also failed. Please check your API billing settings."
    : completed === 0
      ? "All images failed to generate"
      : null;

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
