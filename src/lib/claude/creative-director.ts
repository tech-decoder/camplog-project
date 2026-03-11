import { getClaudeClient } from "./client";
import {
  CreativeBrief,
  CreativeMemoryItem,
  GenerationMode,
  StylePreferenceEntry,
} from "@/lib/types/generation-jobs";
import { AD_STYLES, GLOBAL_CREATIVE_RULES } from "@/lib/constants/image-gen";

const AD_STYLES_FULL = AD_STYLES.map(
  (s) => `## ${s.label} (style key: "${s.value}")\n${s.description}`
).join("\n\n");

const BRIEF_SCHEMA = `Return ONLY valid JSON (no markdown, no code fences):
{
  "brand_analysis": "Brand name, inferred industry, target audience, emotional positioning, tone (urgent/warm/professional/casual)",
  "visual_direction": "Specific color palette recommendations (hex codes if known), typography weight (heavy/condensed/bold), background temperature (warm cream / pure white / dark), contrast level",
  "logo_placement_rule": "Per-style rules: for storefront_card: [rule]; for graphic_text white: [rule]; for graphic_text dark guide: [rule]; for uniform_style: [rule]; for inside_store: [rule]",
  "composition_notes": "Card positioning specs, whitespace guidance, text hierarchy, element sizing",
  "copy_tone": "Voice register (urgent/approachable/authoritative), urgency level (high/medium), language register (conversational/professional), emoji usage (none/minimal)",
  "recommended_angles": "2-3 specific creative angle strategies for this brand — what hooks will stop the scroll",
  "memory_insights": "Synthesized learnings from past rated images for this brand (empty string if no history)",
  "avoided_patterns": "Specific visual or copy patterns to avoid based on memory (empty string if no history)"
}`;

export async function generateCreativeBrief({
  brandName,
  mode,
  stylePreferences,
  memoryItems,
  language,
}: {
  brandName: string;
  mode: GenerationMode;
  stylePreferences: StylePreferenceEntry[];
  memoryItems: CreativeMemoryItem[];
  language: string;
}): Promise<CreativeBrief> {
  const claude = getClaudeClient();

  const enabledStyles = stylePreferences.filter((s) => s.enabled);
  const styleWeightSummary =
    enabledStyles.length > 0
      ? enabledStyles
          .map((s) => `- ${s.style} (weight: ${s.weight})`)
          .join("\n")
      : "All 4 styles equally weighted";

  const memorySection =
    memoryItems.length > 0
      ? `\n\nPAST PERFORMANCE MEMORY (use to guide recommendations):\n${memoryItems
          .map((m) => `[${m.memory_type}] ${m.content}`)
          .join("\n")}`
      : "";

  const modeContext =
    mode === "ai_takeover"
      ? "AI TAKEOVER MODE: Full creative freedom — ignore style weight constraints and choose the optimal approach for this brand."
      : mode === "custom"
      ? `CUSTOM MODE: Respect the user's style weights:\n${styleWeightSummary}`
      : "WINNING VARIANTS MODE: Analyze the visual patterns that made the reference images successful and replicate those winning elements.";

  const response = await claude.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    system: `You are an elite advertising creative director with deep expertise in Meta ad performance, direct-response creative, and brand identity systems. You brief creative teams before every campaign.

Your job: Analyze the brand and produce a precise, actionable CreativeBrief that a strategy agent will use to generate high-performing ad creatives.

You have encyclopedic knowledge of these ad styles and their exact visual specifications:

${AD_STYLES_FULL}

${GLOBAL_CREATIVE_RULES}

Additional creative rules derived from top-performing hiring ad campaigns (KFC, Home Depot, Walmart):
- Card overlays on storefront: warm cream (#F5F0E8 or similar), solid fill, never translucent
- Logo: style-specific placement only (see style descriptions) — never floating overlays on photo ads
- Brand color temperature: warm palettes outperform cool ones for blue-collar/QSR hiring campaigns`,

    messages: [
      {
        role: "user",
        content: `Create a creative brief for a ${language} ad campaign for the brand: "${brandName}"

Campaign context:
- Mode: ${modeContext}
- Language: ${language}${memorySection}

Analyze the brand name to infer:
- Industry (fast food / retail / warehouse / healthcare / tech / etc)
- Target audience demographics
- Brand color palette (if well-known brand, use actual brand colors)
- Emotional tone that resonates with the target audience

${BRIEF_SCHEMA}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "{}";

  const cleaned = text.replace(/```(?:json)?\n?([\s\S]*?)```/, "$1").trim();
  return JSON.parse(cleaned) as CreativeBrief;
}
