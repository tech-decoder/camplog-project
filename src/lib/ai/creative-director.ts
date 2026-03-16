import { getOpenAIClient } from "@/lib/openai/client";
import { generateTextWithGeminiPro } from "@/lib/gemini/text-client";
import {
  CreativeBrief,
  CreativeMemoryItem,
  GenerationMode,
  StylePreferenceEntry,
} from "@/lib/types/generation-jobs";
import { AD_STYLES, getGlobalCreativeRules } from "@/lib/constants/image-gen";

const AD_STYLES_FULL = AD_STYLES.map(
  (s) => `## ${s.label} (style key: "${s.value}")\n${s.description}`
).join("\n\n");

const BRIEF_SCHEMA = `Return ONLY valid JSON (no markdown, no code fences):
{
  "brand_analysis": "Brand name, inferred industry, target audience, emotional positioning, tone (urgent/warm/professional/casual)",
  "visual_direction": "Specific color palette recommendations (hex codes if known), typography weight (heavy/condensed/bold), background temperature (warm cream / pure white / dark), contrast level",
  "logo_placement_rule": "Per-style logo rules — ONE designated position ONLY, never duplicated: storefront_card: ZERO logos (building exterior signage is the only brand identity); graphic_text dark guide: brand logo at top-left corner ONCE only; graphic_text white bg: no logo (brand communicated through color palette only); uniform_style: logo embedded ON the product ONCE (apron/hat/uniform), no separate floating logo; inside_store: ZERO logos (store signage and interior decor are the only brand identity)",
  "composition_notes": "Card positioning specs, whitespace guidance, text hierarchy, element sizing",
  "copy_tone": "Voice register (urgent/approachable/authoritative), urgency level (high/medium), language register (conversational/professional), emoji usage (none/minimal)",
  "recommended_angles": "2-3 specific creative angle strategies for this brand — what hooks will stop the scroll",
  "memory_insights": "Synthesized learnings from past rated images for this brand (empty string if no history)",
  "avoided_patterns": "Specific visual or copy patterns to avoid based on memory (empty string if no history)"
}`;

function parseBrief(text: string): CreativeBrief {
  const cleaned = text.replace(/```(?:json)?\n?([\s\S]*?)```/, "$1").trim();
  try {
    return JSON.parse(cleaned) as CreativeBrief;
  } catch (e) {
    throw new Error(
      `Creative brief JSON parse failed (length: ${cleaned.length}). ` +
      `Error: ${e instanceof Error ? e.message : String(e)}`
    );
  }
}

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

  const systemPrompt = `You are an elite advertising creative director with deep expertise in Meta ad performance, direct-response creative, and brand identity systems. You brief creative teams before every campaign.

Your job: Analyze the brand and produce a precise, actionable CreativeBrief that a strategy agent will use to generate high-performing ad creatives.

You have encyclopedic knowledge of these ad styles and their exact visual specifications:

${AD_STYLES_FULL}

${getGlobalCreativeRules(language)}

Additional creative rules derived from top-performing hiring ad campaigns (KFC, Home Depot, Walmart):
- Card overlays on storefront: warm cream (#F5F0E8 or similar), solid fill, never translucent
- Logo: ONE instance per style at its designated position only — never repeated, never on CTA buttons or dividers, zero logos on photo-based styles (storefront_card, inside_store)
- Brand color temperature: warm palettes outperform cool ones for blue-collar/QSR hiring campaigns`;

  const userPrompt = `Create a creative brief for a ${language} ad campaign for the brand: "${brandName}"

Campaign context:
- Mode: ${modeContext}
- Language: ${language}${memorySection}

Analyze the brand name to infer:
- Industry (fast food / retail / warehouse / healthcare / tech / etc)
- Target audience demographics
- Brand color palette (if well-known brand, use actual brand colors)
- Emotional tone that resonates with the target audience

${BRIEF_SCHEMA}`;

  // Primary: OpenAI GPT-4.1
  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      max_tokens: 1500,
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const text = completion.choices[0].message.content ?? "{}";
    return parseBrief(text);
  } catch (err) {
    console.warn(
      "[ai/strategy] GPT-4.1 failed for creative brief, falling back to Gemini 2.5 Pro:",
      err instanceof Error ? err.message : err
    );
    const raw = await generateTextWithGeminiPro(systemPrompt, userPrompt);
    return parseBrief(raw);
  }
}
