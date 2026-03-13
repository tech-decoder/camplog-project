import { getGeminiClient } from "./client";
import { VIDEO_MODEL_ID } from "@/lib/constants/video-gen";
import { VideoAspectRatio, VideoDuration } from "@/lib/types/generation-jobs";

export interface VeoGenerateOptions {
  prompt: string;
  aspectRatio: VideoAspectRatio;
  durationSeconds: VideoDuration;
}

/**
 * Generate a video with Veo 3 Fast.
 * Internally polls until done (1-3 min typical, 6 min max).
 * Returns the temporary video URI (valid for 2 days).
 */
export async function generateVideoWithVeo({
  prompt,
  aspectRatio,
  durationSeconds,
}: VeoGenerateOptions): Promise<{ videoUri: string }> {
  const ai = getGeminiClient();

  let operation = await ai.models.generateVideos({
    model: VIDEO_MODEL_ID,
    prompt,
    config: {
      aspectRatio,
      durationSeconds,
      numberOfVideos: 1,
      resolution: "720p",
    },
  });

  // Poll until done — 10s intervals, max 6 minutes
  const MAX_POLLS = 36;
  let polls = 0;
  while (!operation.done && polls < MAX_POLLS) {
    await new Promise((r) => setTimeout(r, 10000));
    operation = await ai.operations.getVideosOperation({
      operation,
    });
    polls++;
  }

  if (!operation.done) {
    throw new Error("Video generation timed out after 6 minutes");
  }

  if (operation.error) {
    throw new Error(
      `Veo generation error: ${JSON.stringify(operation.error)}`
    );
  }

  const videos = operation.response?.generatedVideos;
  if (!videos?.length) {
    throw new Error("No videos returned from Veo 3");
  }

  const videoUri = videos[0].video?.uri;
  if (!videoUri) {
    throw new Error("No video URI in Veo 3 response");
  }

  return { videoUri };
}

/**
 * Download a generated video from its temporary URI.
 * The URI requires the API key appended as a query param.
 */
export async function downloadVeoVideo(videoUri: string): Promise<Buffer> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const response = await fetch(videoUri, {
    headers: { "x-goog-api-key": apiKey },
    redirect: "follow",
  });
  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
