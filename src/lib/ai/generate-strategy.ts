import { getOpenAIClient } from "@/lib/openai/client";
import { generateTextWithGeminiPro } from "@/lib/gemini/text-client";
import {
  GenerationStrategy,
  FormatSplit,
  StylePreferenceEntry,
  CopyPool,
  CreativeBrief,
} from "@/lib/types/generation-jobs";
import { AD_STYLES, getGlobalCreativeRules, getLocalizedText } from "@/lib/constants/image-gen";

// ── Copy pool helpers ────────────────────────────────────────────────────────

/** Expand {brand} placeholders so validation works against model output */
function expandPool(entries: string[], brandName: string): string[] {
  return entries.map((e) => e.replace(/\{brand\}/gi, brandName));
}

/** Post-generation safety net: replace any non-pool copy with a random pool entry */
function validateCopyPool(
  strategy: GenerationStrategy,
  copyPool: CopyPool,
  brandName: string
): GenerationStrategy {
  const expanded = {
    headlines: new Set(expandPool(copyPool.headlines, brandName).map((h) => h.toUpperCase())),
    subheadlines:
      copyPool.subheadlines.length > 0
        ? new Set(expandPool(copyPool.subheadlines, brandName).map((s) => s.toUpperCase()))
        : null,
    ctas:
      copyPool.ctas.length > 0
        ? new Set(expandPool(copyPool.ctas, brandName).map((c) => c.toUpperCase()))
        : null,
  };

  const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
  const expandedHeadlines = expandPool(copyPool.headlines, brandName);
  const expandedSubs = expandPool(copyPool.subheadlines, brandName);
  const expandedCtas = expandPool(copyPool.ctas, brandName);

  for (const item of strategy.items) {
    if (!expanded.headlines.has(item.headline.toUpperCase())) {
      console.warn(`[CopyPool] Replaced non-pool headline: "${item.headline}"`);
      item.headline = pick(expandedHeadlines);
    }
    if (expanded.subheadlines && !expanded.subheadlines.has(item.subheadline.toUpperCase())) {
      console.warn(`[CopyPool] Replaced non-pool subheadline: "${item.subheadline}"`);
      item.subheadline = pick(expandedSubs);
    }
    if (expanded.ctas && !expanded.ctas.has(item.cta.toUpperCase())) {
      console.warn(`[CopyPool] Replaced non-pool CTA: "${item.cta}"`);
      item.cta = pick(expandedCtas);
    }
  }
  return strategy;
}

const AD_STYLES_DESCRIPTION = AD_STYLES.map(
  (s) => `- ${s.value}: "${s.label}" — ${s.description} (Example: ${s.example})`
).join("\n");

function briefToSystemSection(brief: CreativeBrief): string {
  const parts = [
    `CREATIVE BRIEF (authoritative — follow every specification below precisely):`,
    `Brand Analysis: ${brief.brand_analysis}`,
    `Visual Direction: ${brief.visual_direction}`,
    `Logo Placement Rules: ${brief.logo_placement_rule}`,
    `Composition Notes: ${brief.composition_notes}`,
    `Copy Tone: ${brief.copy_tone}`,
    `Creative Angles: ${brief.recommended_angles}`,
  ];
  if (brief.memory_insights) parts.push(`Memory Insights: ${brief.memory_insights}`);
  if (brief.avoided_patterns) parts.push(`Avoid These Patterns: ${brief.avoided_patterns}`);
  return parts.join("\n");
}

const STRATEGY_OUTPUT_SCHEMA = `Return ONLY valid JSON matching this exact schema (no markdown, no code fences):
{
  "brand_analysis": "Brief analysis of the brand and what makes effective ads for it",
  "style_distribution": { "graphic_text": N, "storefront_card": N, "uniform_style": N, "inside_store": N },
  "items": [
    {
      "index": 0,
      "ad_style": "graphic_text|storefront_card|uniform_style|inside_store",
      "format": "1:1|9:16",
      "headline": "EXACT headline text to render in the image",
      "subheadline": "Subheadline text",
      "cta": "CTA button text",
      "disclaimer": "Short disclaimer for bottom of image, max 60 chars",
      "prompt_direction": "Detailed image generation prompt describing the visual layout using natural descriptive language. Describe colors by name (bright yellow, deep red, warm cream) NOT hex codes. Describe sizes as relative (massive, small, tiny) NOT pixels. Describe font style as (bold condensed, light italic) NOT font weights or font family names. NEVER include CSS values, opacity percentages, pixel sizes, hex codes, or font-weight numbers — image models will render those as literal text in the image.",
      "rationale": "Why this specific creative will perform well"
    }
  ]
}`;

function parseStrategy(text: string): GenerationStrategy {
  const cleaned = text
    .replace(/```(?:json)?\n?([\s\S]*?)```/, "$1")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.warn("[parseStrategy] Initial JSON.parse failed, attempting repair...", e instanceof Error ? e.message : e);
    const repaired = attemptJsonRepair(cleaned);
    if (repaired) return repaired;
    const preview = cleaned.slice(-200);
    throw new Error(
      `Strategy JSON parse failed (length: ${cleaned.length}). ` +
      `Last 200 chars: ...${preview}. ` +
      `Original error: ${e instanceof Error ? e.message : String(e)}`
    );
  }
}

/**
 * Attempts to repair truncated JSON from model responses.
 * Common truncation scenarios:
 * - Response cut off mid-string (unclosed quote)
 * - Response cut off mid-object (unclosed braces/brackets)
 * - Response cut off after a complete item but before array close
 */
function attemptJsonRepair(text: string): GenerationStrategy | null {
  try {
    let repaired = text;

    // Close any unclosed string
    const quotes = (repaired.match(/"/g) || []).length;
    if (quotes % 2 !== 0) repaired += '"';

    const closerCombinations = [
      '}]}',
      '"}]}',
      '"}]}\n',
      ']}',
    ];

    for (const closers of closerCombinations) {
      try {
        const attempt = repaired + closers;
        const parsed = JSON.parse(attempt);
        if (parsed.items && Array.isArray(parsed.items) && parsed.items.length > 0) {
          console.warn(`[JSON repair] Strategy 1 succeeded — recovered ${parsed.items.length} items with closers "${closers}"`);
          return parsed;
        }
      } catch {
        // Try next combination
      }
    }

    // Strategy 2: Find the last complete item and truncate everything after it
    const itemPattern = /"rationale"\s*:\s*"[^"]*"\s*\}/g;
    let lastMatch: RegExpExecArray | null = null;
    let match: RegExpExecArray | null;
    while ((match = itemPattern.exec(text)) !== null) {
      lastMatch = match;
    }

    if (lastMatch) {
      const endOfLastItem = lastMatch.index + lastMatch[0].length;
      const truncated = text.substring(0, endOfLastItem) + ']}';
      try {
        const parsed = JSON.parse(truncated);
        if (parsed.items && Array.isArray(parsed.items) && parsed.items.length > 0) {
          console.warn(`[JSON repair] Strategy 2 (truncate) succeeded — recovered ${parsed.items.length} items`);
          return parsed;
        }
      } catch { /* continue */ }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Retry wrapper for strategy generation.
 * Retries once on failure — combined with JSON repair, this handles
 * virtually all truncation and transient errors.
 */
export async function withStrategyRetry<T>(
  fn: () => Promise<T>,
  label: string = "Strategy generation"
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`[${label}] First attempt failed: ${msg}. Retrying...`);
    return await fn();
  }
}

// ── Strategy batching ──────────────────────────────────────────────────────
// Auto-splits large jobs into two sequential calls to keep each response
// focused and within token limits, improving JSON completeness.

const BATCH_THRESHOLD = 6;

function mergeDistributions(
  a: GenerationStrategy["style_distribution"],
  b: GenerationStrategy["style_distribution"]
): GenerationStrategy["style_distribution"] {
  const merged: GenerationStrategy["style_distribution"] = { ...a };
  for (const [key, val] of Object.entries(b)) {
    const k = key as keyof typeof merged;
    merged[k] = (merged[k] || 0) + (val || 0);
  }
  return merged;
}

async function batchStrategyGeneration(
  totalImages: number,
  formatSplit: FormatSplit,
  generateBatch: (
    batchSplit: FormatSplit,
    batchTotal: number,
    startIndex: number
  ) => Promise<{ strategy: GenerationStrategy; usedFallback: boolean }>
): Promise<{ strategy: GenerationStrategy; usedFallback: boolean }> {
  if (totalImages <= BATCH_THRESHOLD) {
    return generateBatch(formatSplit, totalImages, 0);
  }

  const batch1Split: FormatSplit = {
    square: Math.ceil(formatSplit.square / 2),
    portrait: Math.ceil(formatSplit.portrait / 2),
  };
  const batch2Split: FormatSplit = {
    square: formatSplit.square - batch1Split.square,
    portrait: formatSplit.portrait - batch1Split.portrait,
  };
  const batch1Total = batch1Split.square + batch1Split.portrait;
  const batch2Total = batch2Split.square + batch2Split.portrait;

  console.log(
    `[Strategy] Batching: ${totalImages} items → batch1=${batch1Total} batch2=${batch2Total}`
  );

  const { strategy: result1, usedFallback: fallback1 } = await generateBatch(batch1Split, batch1Total, 0);

  await new Promise((r) => setTimeout(r, 2000));

  const { strategy: result2, usedFallback: fallback2 } = await generateBatch(
    batch2Split,
    batch2Total,
    result1.items.length
  );

  return {
    strategy: {
      brand_analysis: result1.brand_analysis,
      style_distribution: mergeDistributions(
        result1.style_distribution,
        result2.style_distribution
      ),
      items: [
        ...result1.items,
        ...result2.items.map((item, i) => ({
          ...item,
          index: result1.items.length + i,
        })),
      ],
    },
    usedFallback: fallback1 || fallback2,
  };
}

// ── Shared batch call helper ─────────────────────────────────────────────────

async function callStrategyModel(
  systemPrompt: string,
  userPrompt: string,
  fallbackLabel: string
): Promise<{ strategy: GenerationStrategy; usedFallback: boolean }> {
  // Primary: GPT-4.1
  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      max_tokens: 16384,
      temperature: 0.8,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
    const text = completion.choices[0].message.content ?? "";
    return { strategy: parseStrategy(text), usedFallback: false };
  } catch (err) {
    console.warn(
      `[ai/strategy] GPT-4.1 failed for ${fallbackLabel}, falling back to Gemini 2.5 Pro:`,
      err instanceof Error ? err.message : err
    );
    const raw = await generateTextWithGeminiPro(systemPrompt, userPrompt);
    return { strategy: parseStrategy(raw), usedFallback: true };
  }
}

export async function generateTakeoverStrategy({
  brandName,
  totalCount,
  formatSplit,
  language,
  creativeBrief,
}: {
  brandName: string;
  totalCount?: number;
  formatSplit: FormatSplit;
  language: string;
  creativeBrief?: CreativeBrief;
}): Promise<{ strategy: GenerationStrategy; usedFallback: boolean }> {
  const totalImages = totalCount || formatSplit.square + formatSplit.portrait;

  return batchStrategyGeneration(
    totalImages,
    formatSplit,
    async (batchSplit, batchTotal, startIndex) => {
      const t = getLocalizedText(language);
      const briefSection = creativeBrief
        ? `\n\n${briefToSystemSection(creativeBrief)}`
        : "";

      const indexNote =
        startIndex > 0
          ? `\n- Start item indices at ${startIndex} (this is batch 2 of a larger strategy)`
          : "";

      const systemPrompt = `You are an elite advertising creative director and strategist. You specialize in creating high-CTR digital ad creatives for social media platforms (Facebook, Instagram, TikTok). You understand visual composition, typography, color psychology, and what makes ads stop the scroll.

Available ad styles:
${AD_STYLES_DESCRIPTION}

${getGlobalCreativeRules(language)}

You must decide the optimal distribution of images across styles and formats based on what will perform best for the given brand. Think about what visual approaches work best for this specific brand and industry.${briefSection}`;

      const userPrompt = `Create an ad creative strategy for the brand "${brandName}".

Requirements:
- Generate exactly ${batchTotal} ad creatives total
- Format distribution: ${batchSplit.square} square (1:1) images and ${batchSplit.portrait} portrait (9:16) images
- All text (headlines, subheadlines, CTAs) must be in ${language}
- Distribute across the 4 ad styles based on what works best for this brand
- Each prompt_direction must be extremely detailed — describe the exact visual layout, background, colors, typography style, element positioning, lighting, and mood. Use natural visual language ONLY (e.g., "bright yellow", "bold condensed", "warm cream", "tiny light-gray"). NEVER write hex codes, pixel values, font-weight numbers, opacity percentages, or CSS property names — image models render those as literal visible text in the image.
- Headlines should be short and punchy (under 40 characters)
- Subheadlines should be 1 short sentence
- CTAs should be action-oriented (2-4 words)
- Make each creative distinct — vary the visual approach, messaging angle, and style
- Each creative MUST have a "disclaimer" field — a SHORT string (max 60 characters) for the bottom of the image (e.g., "${t.disclaimer_example}" or "${t.not_affiliated.replace("{brand}", brandName)}")${indexNote}

FORMAT NOTES:
- Square (1:1) creatives: Compact, tight composition. All elements centered and closely grouped.
- Portrait (9:16) creatives: Tall vertical canvas — use generous spacing between sections. Headline zone can be 60-70% of height. Extra vertical space should be used for larger text, wider dividers, and more breathing room. DO NOT just stretch a square layout — redesign the composition for the tall format.

${STRATEGY_OUTPUT_SCHEMA}`;

      return callStrategyModel(systemPrompt, userPrompt, "Takeover batch");
    }
  );
}

export async function generateCustomStrategy({
  brandName,
  totalCount,
  formatSplit,
  language,
  stylePreferences,
  copyPool,
  creativeBrief,
}: {
  brandName: string;
  totalCount?: number;
  formatSplit: FormatSplit;
  language: string;
  stylePreferences: StylePreferenceEntry[];
  copyPool?: CopyPool;
  creativeBrief?: CreativeBrief;
}): Promise<{ strategy: GenerationStrategy; usedFallback: boolean }> {
  const totalImages = totalCount || formatSplit.square + formatSplit.portrait;
  const hasCopyPool = !!(copyPool && copyPool.headlines.length > 0);

  const { strategy, usedFallback } = await batchStrategyGeneration(
    totalImages,
    formatSplit,
    async (batchSplit, batchTotal, startIndex) => {
      const t = getLocalizedText(language);

      const enabledStyles = stylePreferences.filter((s) => s.enabled);
      const totalWeight = enabledStyles.reduce((sum, s) => sum + s.weight, 0);
      const styleDistribution = enabledStyles
        .map((s) => {
          const count = Math.round((s.weight / totalWeight) * batchTotal);
          const styleInfo = AD_STYLES.find((a) => a.value === s.style);
          return `- ${s.style} ("${styleInfo?.label}"): ~${count} images (weight: ${s.weight})`;
        })
        .join("\n");

      const briefSection = creativeBrief
        ? `\n\n${briefToSystemSection(creativeBrief)}`
        : "";

      const copyPoolSystemConstraint = hasCopyPool
        ? `\n\nCOPY POOL CONSTRAINT (NON-NEGOTIABLE — HIGHEST PRIORITY RULE):
You MUST use ONLY the exact strings below for all headlines, subheadlines, and CTAs. Do NOT invent, rephrase, paraphrase, or create any new copy. Copy-paste from this list only.

ALLOWED HEADLINES (use these EXACT strings, including {brand} placeholder):
${copyPool!.headlines.map((h, i) => `  ${i + 1}. "${h}"`).join("\n")}
${copyPool!.subheadlines.length > 0 ? `\nALLOWED SUBHEADLINES:\n${copyPool!.subheadlines.map((s, i) => `  ${i + 1}. "${s}"`).join("\n")}` : ""}
${copyPool!.ctas.length > 0 ? `\nALLOWED CTAs:\n${copyPool!.ctas.map((c, i) => `  ${i + 1}. "${c}"`).join("\n")}` : ""}
${(copyPool!.disclaimers || []).length > 0 ? `\nALLOWED DISCLAIMERS (use one per creative at the very bottom in small gray text):\n${copyPool!.disclaimers.map((d, i) => `  ${i + 1}. "${d}"`).join("\n")}` : ""}

If a headline/CTA is not in the list above, you MUST NOT use it. Distribute pool entries across items. Reuse is allowed.`
        : "";

      const copyRequirements = hasCopyPool
        ? `- Headlines: select ONLY from the copy pool in the system instructions — do NOT write your own
- Subheadlines: ${copyPool!.subheadlines.length > 0 ? "select ONLY from the copy pool" : "1 short sentence"}
- CTAs: ${copyPool!.ctas.length > 0 ? "select ONLY from the copy pool" : "action-oriented, 2-4 words"}
- IMPORTANT: Every headline, subheadline, and CTA must be a VERBATIM string from the copy pool. Zero invention.`
        : `- Headlines: short, punchy, under 40 chars
- CTAs: action-oriented, 2-4 words`;

      const indexNote =
        startIndex > 0
          ? `\n- Start item indices at ${startIndex} (this is batch 2 of a larger strategy)`
          : "";

      const systemPrompt = `You are an elite advertising creative director. You follow the user's style preferences precisely while crafting the most effective ad creatives possible.

Available ad styles:
${AD_STYLES_DESCRIPTION}

${getGlobalCreativeRules(language)}${briefSection}${copyPoolSystemConstraint}`;

      const userPrompt = `Create an ad creative strategy for "${brandName}" following my style preferences.

My style preferences (distribute images according to these weights):
${styleDistribution}

Requirements:
- Generate exactly ${batchTotal} ad creatives total
- Format distribution: ${batchSplit.square} square (1:1) and ${batchSplit.portrait} portrait (9:16)
- All text must be in ${language}
- Follow the style weights above for distribution
- Each prompt_direction must be extremely detailed — use natural visual language ONLY (e.g., "bright yellow", "bold condensed", "warm cream"). NEVER write hex codes, pixel values, font-weight numbers, opacity percentages, or CSS property names — image models render those as literal visible text.
${copyRequirements}
- Each creative MUST have a "disclaimer" field — a SHORT string (max 60 chars).${hasCopyPool && (copyPool!.disclaimers || []).length > 0 ? " Pick from the allowed disclaimers pool." : ` e.g., "${t.disclaimer_example}" or "${t.not_affiliated.replace("{brand}", brandName)}"`}${indexNote}

FORMAT NOTES:
- Square (1:1) creatives: Compact, tight composition. All elements centered and closely grouped.
- Portrait (9:16) creatives: Tall vertical canvas — use generous spacing between sections. Headline zone can be 60-70% of height. Extra vertical space should be used for larger text, wider dividers, and more breathing room. DO NOT just stretch a square layout — redesign the composition for the tall format.

${STRATEGY_OUTPUT_SCHEMA}`;

      return callStrategyModel(systemPrompt, userPrompt, "Custom batch");
    }
  );

  // Post-generation safety net: replace any non-pool copy
  if (hasCopyPool) {
    return { strategy: validateCopyPool(strategy, copyPool!, brandName), usedFallback };
  }

  return { strategy, usedFallback };
}

export async function generateWinningVariantsStrategy({
  brandName,
  totalCount,
  formatSplit,
  language,
  referenceImageUrls,
  creativeBrief,
}: {
  brandName: string;
  totalCount?: number;
  formatSplit: FormatSplit;
  language: string;
  referenceImageUrls: string[];
  creativeBrief?: CreativeBrief;
}): Promise<{ strategy: GenerationStrategy; usedFallback: boolean }> {
  const totalImages = totalCount || formatSplit.square + formatSplit.portrait;

  return batchStrategyGeneration(
    totalImages,
    formatSplit,
    async (batchSplit, batchTotal, startIndex) => {
      const t = getLocalizedText(language);
      const briefSection = creativeBrief
        ? `\n\n${briefToSystemSection(creativeBrief)}`
        : "";

      const indexNote =
        startIndex > 0
          ? `\n- Start item indices at ${startIndex} (this is batch 2 of a larger strategy)`
          : "";

      const systemPrompt = `You are an elite advertising creative director with expertise in analyzing winning ad creatives and producing high-performing variants. You have deep knowledge of visual composition, color psychology, and direct-response advertising.

${getGlobalCreativeRules(language)}${briefSection}`;

      const analysisIntro = `I'm sharing ${referenceImageUrls.length} winning ad creative(s) for the brand "${brandName}". Analyze each image carefully:
- What ad style is it? (graphic_text, storefront_card, uniform_style, inside_store)
- What makes it effective? (layout, colors, typography, messaging, CTA placement)
- What is the visual hierarchy and composition?
- What text/copy is used?

Then create ${batchTotal} variant creatives that maintain the winning elements but provide fresh variations.`;

      const analysisOutro = `Based on your analysis of the winning ads above, create variant ad creatives.

Requirements:
- Generate exactly ${batchTotal} variants total
- Format: ${batchSplit.square} square (1:1) and ${batchSplit.portrait} portrait (9:16)
- All text in ${language}
- Maintain the winning elements (style, layout patterns, color psychology) while varying the specific visuals, messaging angles, and compositions
- Each prompt_direction must be extremely detailed and self-contained — use natural visual language ONLY (e.g., "bright yellow", "bold condensed", "warm cream"). NEVER write hex codes, pixel values, font-weight numbers, opacity percentages, or CSS property names — image models render those as literal visible text.
- Headlines: short, punchy, under 40 chars
- CTAs: action-oriented, 2-4 words
- Each creative MUST have a "disclaimer" field — a SHORT string (max 60 chars) for the bottom of the image (e.g., "${t.disclaimer_example}")${indexNote}

FORMAT NOTES:
- Square (1:1) creatives: Compact, tight composition. All elements centered and closely grouped.
- Portrait (9:16) creatives: Tall vertical canvas — use generous spacing between sections. Headline zone can be 60-70% of height. DO NOT just stretch a square layout — redesign the composition for the tall format.

Available ad styles for classification:
${AD_STYLES_DESCRIPTION}

${STRATEGY_OUTPUT_SCHEMA}`;

      // Primary: GPT-4.1 with vision (image_url format)
      try {
        const openai = getOpenAIClient();
        type TextPart = { type: "text"; text: string };
        type ImagePart = { type: "image_url"; image_url: { url: string } };
        const userContent: (TextPart | ImagePart)[] = [
          { type: "text", text: analysisIntro },
          ...referenceImageUrls.map((url): ImagePart => ({
            type: "image_url",
            image_url: { url },
          })),
          { type: "text", text: analysisOutro },
        ];

        const completion = await openai.chat.completions.create({
          model: "gpt-4.1",
          max_tokens: 16384,
          temperature: 0.8,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
        });
        const text = completion.choices[0].message.content ?? "";
        return { strategy: parseStrategy(text), usedFallback: false };
      } catch (err) {
        console.warn(
          "[ai/strategy] GPT-4.1 failed for Winning Variants, falling back to Gemini 2.5 Pro (text-only):",
          err instanceof Error ? err.message : err
        );
        // Gemini fallback: text-only — pass image URLs as context
        const fallbackUserPrompt = `${analysisIntro}

Reference image URLs (analyze these winning ad creatives):
${referenceImageUrls.map((url, i) => `${i + 1}. ${url}`).join("\n")}

${analysisOutro}`;
        const raw = await generateTextWithGeminiPro(systemPrompt, fallbackUserPrompt);
        return { strategy: parseStrategy(raw), usedFallback: true };
      }
    }
  );
}
