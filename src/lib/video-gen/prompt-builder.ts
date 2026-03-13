import { VideoStrategyItem } from "@/lib/types/generation-jobs";
import { VIDEO_AD_STYLES } from "@/lib/constants/video-gen";

/**
 * Build a Veo 3 prompt from a video strategy item.
 * Combines the style guide with the item's prompt_direction and audio_description.
 */
export function buildVideoPromptFromStrategy(
  item: VideoStrategyItem,
  brandName: string,
  durationSeconds: number
): string {
  const styleInfo = VIDEO_AD_STYLES.find((s) => s.value === item.video_ad_style);
  const styleGuide = styleInfo?.prompt_guide || "";

  const orientationHint =
    item.aspect_ratio === "9:16"
      ? "Vertical video for mobile viewing. Center subjects, favor tilt and dolly movements, avoid wide pans."
      : "Horizontal cinematic video. Full range of camera movements.";

  const parts: string[] = [];

  // Style guide context
  if (styleGuide) {
    parts.push(styleGuide);
  }

  // Main creative direction from Claude
  parts.push(item.prompt_direction);

  // Audio direction
  if (item.audio_description) {
    parts.push(`Audio: ${item.audio_description}`);
  }

  // Format and duration context
  parts.push(`${orientationHint} Duration: ${durationSeconds} seconds.`);

  // Brand context (no text rendering — products and environments only)
  parts.push(
    `Brand: ${brandName}. Show brand identity through products, environments, and colors — not through text or logos.`
  );

  // Safety: no people
  parts.push("No people or faces. Focus on objects, products, environments, and atmospheric details.");

  return parts.join("\n\n");
}
