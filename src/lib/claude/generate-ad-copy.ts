import { getClaudeClient } from "./client";
import { AdCopyFieldType } from "@/lib/types/ad-copies";

const FIELD_INSTRUCTIONS: Record<AdCopyFieldType, string> = {
  headline:
    "Generate short, punchy ad headlines. Each must be under 40 characters. Focus on curiosity, urgency, or clear value propositions.",
  primary_text:
    "Generate compelling ad primary text (1-3 sentences each). These appear as the main body copy in Facebook/Meta ads. Make them persuasive and action-oriented.",
  description:
    "Generate concise ad descriptions (1 sentence each, under 90 characters). These appear below the headline in ads. Keep them clear and benefit-focused.",
};

export async function generateAdCopy({
  campaignName,
  fieldType,
  existingVariants,
  count = 3,
}: {
  campaignName: string;
  fieldType: AdCopyFieldType;
  existingVariants: string[];
  count?: number;
}): Promise<string[]> {
  const claude = getClaudeClient();

  const existingContext =
    existingVariants.length > 0
      ? `\n\nExisting variants (do NOT repeat these, generate completely new ones):\n${existingVariants.map((v, i) => `${i + 1}. ${v}`).join("\n")}`
      : "";

  const response = await claude.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system:
      "You are an expert advertising copywriter specializing in digital marketing, Facebook Ads, and performance marketing. You write copy that drives clicks and conversions.",
    messages: [
      {
        role: "user",
        content: `Campaign name: "${campaignName}"

${FIELD_INSTRUCTIONS[fieldType]}

Generate exactly ${count} new unique variants.${existingContext}

Return ONLY a JSON array of strings, no other text. Example: ["variant 1", "variant 2", "variant 3"]`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Strip markdown code fences if present
  const cleaned = text
    .replace(/```(?:json)?\n?([\s\S]*?)```/, "$1")
    .trim();

  try {
    const variants = JSON.parse(cleaned);
    if (Array.isArray(variants)) {
      return variants.map(String).slice(0, count);
    }
  } catch {
    // If JSON parsing fails, try to extract strings line by line
    const lines = cleaned
      .split("\n")
      .map((l) => l.replace(/^[\d]+\.\s*/, "").replace(/^["']|["']$/g, "").trim())
      .filter((l) => l.length > 0);
    return lines.slice(0, count);
  }

  return [];
}
