import { getOpenAIClient } from "./client";
import { ImageQuality } from "@/lib/types/generated-images";
import { ImageFormat } from "@/lib/types/generation-jobs";

/**
 * Detects OpenAI billing/quota errors so we can fallback to another provider.
 * Matches: billing_hard_limit_reached, insufficient_quota, 401/429 with billing messages.
 */
export function isOpenAIBillingError(err: unknown): boolean {
  if (err && typeof err === "object") {
    // OpenAI SDK error objects have a `code` field
    if ("code" in err) {
      const code = (err as { code?: string }).code;
      if (
        code === "billing_hard_limit_reached" ||
        code === "insufficient_quota"
      )
        return true;
    }
    // Also check status for auth/quota HTTP codes
    if ("status" in err) {
      const status = (err as { status?: number }).status;
      if (status === 402 || status === 429) return true;
    }
    // Check error message text as a fallback
    if ("message" in err) {
      const msg = String((err as { message?: string }).message).toLowerCase();
      if (
        msg.includes("billing") ||
        msg.includes("quota") ||
        msg.includes("spending limit")
      )
        return true;
    }
  }
  return false;
}

const QUALITY_MAP: Record<ImageQuality, "low" | "medium" | "high"> = {
  draft: "low",
  standard: "medium",
  premium: "high",
};

const SIZE_MAP: Record<ImageFormat, "1024x1024" | "1024x1536"> = {
  "1:1": "1024x1024",
  "9:16": "1024x1536",
};

export async function generateImageWithOpenAI({
  prompt,
  quality = "standard",
  count = 1,
  format = "1:1",
}: {
  prompt: string;
  quality?: ImageQuality;
  count?: number;
  format?: ImageFormat;
}): Promise<Array<{ b64Data: string; revisedPrompt?: string }>> {
  const openai = getOpenAIClient();

  const response = await openai.images.generate({
    model: "gpt-image-1",
    prompt,
    n: Math.min(count, 4),
    size: SIZE_MAP[format],
    quality: QUALITY_MAP[quality],
    output_format: "png",
  });

  return (response.data || []).map((img) => ({
    b64Data: img.b64_json || "",
    revisedPrompt: img.revised_prompt || undefined,
  }));
}
