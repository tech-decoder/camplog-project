import { getOpenAIClient } from "@/lib/openai/client";
import { generateTextWithGeminiPro } from "@/lib/gemini/text-client";
import {
  VideoGenerationStrategy,
  VideoFormatSplit,
  VideoDuration,
  CreativeBrief,
} from "@/lib/types/generation-jobs";
import { VIDEO_AD_STYLES, GLOBAL_VIDEO_CREATIVE_RULES } from "@/lib/constants/video-gen";

const VIDEO_STYLES_DESCRIPTION = VIDEO_AD_STYLES.map(
  (s) => `- ${s.value}: "${s.label}" — ${s.description}\n  Prompt guide: ${s.prompt_guide.split("\n")[0]}`
).join("\n");

function briefToSystemSection(brief: CreativeBrief): string {
  const parts = [
    `CREATIVE BRIEF (authoritative — follow every specification below precisely):`,
    `Brand Analysis: ${brief.brand_analysis}`,
    `Visual Direction: ${brief.visual_direction}`,
    `Creative Angles: ${brief.recommended_angles}`,
  ];
  if (brief.memory_insights) parts.push(`Memory Insights: ${brief.memory_insights}`);
  if (brief.avoided_patterns) parts.push(`Avoid These Patterns: ${brief.avoided_patterns}`);
  return parts.join("\n");
}

const VIDEO_STRATEGY_OUTPUT_SCHEMA = `Return ONLY valid JSON matching this exact schema (no markdown, no code fences):
{
  "brand_analysis": "Brief analysis of the brand and what makes effective video ads for it",
  "style_distribution": { "product_hero": N, "ugc_testimonial": N, "lifestyle_scene": N, "food_sensory": N, "breaking_news": N, "storefront_flyby": N },
  "items": [
    {
      "index": 0,
      "video_ad_style": "product_hero|ugc_testimonial|lifestyle_scene|food_sensory|breaking_news|storefront_flyby",
      "aspect_ratio": "16:9|9:16",
      "headline": "Reference headline for this video concept",
      "subheadline": "Reference subheadline",
      "cta": "Reference CTA text",
      "prompt_direction": "Detailed video generation prompt: [Camera/Shot Type] + [Subject] + [Action] + [Setting/Environment] + [Lighting/Atmosphere] + [Style/Aesthetic]. Be extremely specific about camera movement (dolly, pan, orbit, tracking, crane, static), shot type (ECU, CU, medium, wide, overhead, POV), lighting quality, and visual atmosphere. Keep under 150 words.",
      "audio_description": "What the audio should sound like: ambient sounds, music genre/mood, sound effects. Be specific.",
      "rationale": "Why this specific video concept will perform well as an ad"
    }
  ]
}`;

function parseVideoStrategy(text: string): VideoGenerationStrategy {
  const cleaned = text
    .replace(/```(?:json)?\n?([\s\S]*?)```/, "$1")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    let repaired = cleaned;
    const quotes = (repaired.match(/"/g) || []).length;
    if (quotes % 2 !== 0) repaired += '"';

    const closerCombinations = ['}]}', '"}]}', '"]}'  , ']}'];
    for (const closers of closerCombinations) {
      try {
        const parsed = JSON.parse(repaired + closers);
        if (parsed.items?.length > 0) {
          console.warn(`[Video strategy JSON repair] Recovered ${parsed.items.length} items`);
          return parsed;
        }
      } catch { /* next */ }
    }

    throw new Error(
      `Video strategy JSON parse failed (length: ${cleaned.length}). ` +
      `Error: ${e instanceof Error ? e.message : String(e)}`
    );
  }
}

export async function generateVideoTakeoverStrategy({
  brandName,
  totalCount,
  formatSplit,
  language,
  duration,
  creativeBrief,
}: {
  brandName: string;
  totalCount?: number;
  formatSplit: VideoFormatSplit;
  language: string;
  duration: VideoDuration;
  creativeBrief?: CreativeBrief;
}): Promise<{ strategy: VideoGenerationStrategy; usedFallback: boolean }> {
  const totalVideos = totalCount || formatSplit.landscape + formatSplit.portrait;
  const briefSection = creativeBrief
    ? `\n\n${briefToSystemSection(creativeBrief)}`
    : "";

  const systemPrompt = `You are an elite video advertising creative director. You specialize in creating high-performing short-form video ad concepts for social media platforms (Facebook, Instagram, TikTok, YouTube Shorts).

You understand cinematic language, camera movements, lighting, sound design, and what makes video ads stop the scroll and drive action.

Available video ad styles:
${VIDEO_STYLES_DESCRIPTION}

${GLOBAL_VIDEO_CREATIVE_RULES}

IMPORTANT CONSTRAINTS:
- No people or faces can appear in the videos (technical limitation)
- Focus on products, environments, food, objects, and atmospheric scenes
- Brand identity comes from products, store environments, colors, and signage — NOT from text overlays or logos
- Each video is ${duration} seconds long at 720p
- Veo 3 generates synchronized audio automatically — describe the audio you want${briefSection}`;

  const userPrompt = `Create a video ad creative strategy for the brand "${brandName}".

Requirements:
- Generate exactly ${totalVideos} video concepts total
- Format distribution: ${formatSplit.landscape} landscape (16:9) videos and ${formatSplit.portrait} portrait (9:16) videos
- Each video is ${duration} seconds long
- All reference text (headlines, subheadlines, CTAs) must be in ${language} — these are for reference only, NOT rendered in the video
- Distribute across the 6 video ad styles based on what works best for this brand
- Each prompt_direction must follow the structure: [Camera/Shot Type] + [Subject] + [Action] + [Setting] + [Lighting] + [Style]
- Be extremely specific about camera movement, lighting, and atmosphere
- Each audio_description should describe the soundscape: ambient sounds, music style, sound effects
- Make each video concept distinct — vary camera angles, environments, and moods
- Keep prompt_direction under 150 words
- For 9:16 portrait videos: favor vertical compositions, tilt movements, and close-ups. Avoid wide pans.

${VIDEO_STRATEGY_OUTPUT_SCHEMA}`;

  // Primary: GPT-4.1
  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      max_tokens: 8192,
      temperature: 0.8,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
    const text = completion.choices[0].message.content ?? "";
    return { strategy: parseVideoStrategy(text), usedFallback: false };
  } catch (err) {
    console.warn(
      "[ai/strategy] GPT-4.1 failed for video strategy, falling back to Gemini 2.5 Pro:",
      err instanceof Error ? err.message : err
    );
    const raw = await generateTextWithGeminiPro(systemPrompt, userPrompt);
    return { strategy: parseVideoStrategy(raw), usedFallback: true };
  }
}
