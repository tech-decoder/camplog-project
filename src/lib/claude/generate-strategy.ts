import { getClaudeClient } from "./client";
import {
  GenerationStrategy,
  FormatSplit,
  StylePreferenceEntry,
  CopyPool,
  CreativeBrief,
} from "@/lib/types/generation-jobs";
import { AD_STYLES, GLOBAL_CREATIVE_RULES } from "@/lib/constants/image-gen";

// ── Copy pool helpers ────────────────────────────────────────────────────────

/** Expand {brand} placeholders so validation works against Claude's output */
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
    // Re-throw with more context about the failure
    const preview = cleaned.slice(-200);
    throw new Error(
      `Strategy JSON parse failed (length: ${cleaned.length}). ` +
      `Last 200 chars: ...${preview}. ` +
      `Original error: ${e instanceof Error ? e.message : String(e)}`
    );
  }
}

/**
 * Attempts to repair truncated JSON from Claude responses.
 * Common truncation scenarios:
 * - Response cut off mid-string (unclosed quote)
 * - Response cut off mid-object (unclosed braces/brackets)
 * - Response cut off after a complete item but before array close
 */
function attemptJsonRepair(text: string): GenerationStrategy | null {
  try {
    // Strategy 1: Try closing unclosed strings + structures progressively
    let repaired = text;

    // Close any unclosed string
    const quotes = (repaired.match(/"/g) || []).length;
    if (quotes % 2 !== 0) repaired += '"';

    // Try closing various unclosed structures
    const closerCombinations = [
      '}]}',      // close field + item + items array + root
      '"}]}',     // close string + item + items array + root
      '"}]}\n',
      ']}'        // close items array + root
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
    // Look for the last complete item by finding the last '"rationale"' field with a closing }
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
    // Single retry — the combination of 16384 max_tokens + JSON repair
    // on the retry should succeed in nearly all cases
    return await fn();
  }
}

// ── Strategy batching for free-tier token limits ──────────────────────────────
// Anthropic Free Tier = 4K output tokens/minute. The creative director call
// consumes ~1200 tokens, leaving ~2800 for strategy. A full 12-item strategy
// needs ~5100 tokens → truncation. Splitting into 2×6 keeps each batch under
// the remaining budget.

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

/**
 * Auto-batches strategy generation when totalImages exceeds BATCH_THRESHOLD.
 * Splits large jobs into two sequential Claude calls so each stays within
 * the free-tier 4K output tokens/minute budget.
 */
async function batchStrategyGeneration(
  totalImages: number,
  formatSplit: FormatSplit,
  generateBatch: (
    batchSplit: FormatSplit,
    batchTotal: number,
    startIndex: number
  ) => Promise<GenerationStrategy>
): Promise<GenerationStrategy> {
  if (totalImages <= BATCH_THRESHOLD) {
    return generateBatch(formatSplit, totalImages, 0);
  }

  // Split into two halves
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

  // Sequential to respect rate limits (wait between calls)
  const result1 = await generateBatch(batch1Split, batch1Total, 0);

  // Small delay to let the rate-limit window advance
  await new Promise((r) => setTimeout(r, 2000));

  const result2 = await generateBatch(
    batch2Split,
    batch2Total,
    result1.items.length
  );

  // Merge results
  return {
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
  };
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
}): Promise<GenerationStrategy> {
  const totalImages = totalCount || formatSplit.square + formatSplit.portrait;

  return batchStrategyGeneration(
    totalImages,
    formatSplit,
    async (batchSplit, batchTotal, startIndex) => {
      const claude = getClaudeClient();
      const briefSection = creativeBrief
        ? `\n\n${briefToSystemSection(creativeBrief)}`
        : "";

      const indexNote =
        startIndex > 0
          ? `\n- Start item indices at ${startIndex} (this is batch 2 of a larger strategy)`
          : "";

      const response = await claude.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 16384,
        system: `You are an elite advertising creative director and strategist. You specialize in creating high-CTR digital ad creatives for social media platforms (Facebook, Instagram, TikTok). You understand visual composition, typography, color psychology, and what makes ads stop the scroll.

Available ad styles:
${AD_STYLES_DESCRIPTION}

${GLOBAL_CREATIVE_RULES}

You must decide the optimal distribution of images across styles and formats based on what will perform best for the given brand. Think about what visual approaches work best for this specific brand and industry.${briefSection}`,
        messages: [
          {
            role: "user",
            content: `Create an ad creative strategy for the brand "${brandName}".

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
- Each creative MUST have a "disclaimer" field — a SHORT string (max 60 characters) for the bottom of the image (e.g., "Guide only. Not an official application." or "Not affiliated with ${brandName}.")${indexNote}

FORMAT NOTES:
- Square (1:1) creatives: Compact, tight composition. All elements centered and closely grouped.
- Portrait (9:16) creatives: Tall vertical canvas — use generous spacing between sections. Headline zone can be 60-70% of height. Extra vertical space should be used for larger text, wider dividers, and more breathing room. DO NOT just stretch a square layout — redesign the composition for the tall format.

${STRATEGY_OUTPUT_SCHEMA}`,
          },
        ],
      });

      const text =
        response.content[0].type === "text" ? response.content[0].text : "";
      return parseStrategy(text);
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
}): Promise<GenerationStrategy> {
  const totalImages = totalCount || formatSplit.square + formatSplit.portrait;

  // Copy pool: when present, enforce as the highest-priority system-level constraint
  const hasCopyPool = !!(copyPool && copyPool.headlines.length > 0);

  const strategy = await batchStrategyGeneration(
    totalImages,
    formatSplit,
    async (batchSplit, batchTotal, startIndex) => {
      const claude = getClaudeClient();

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

      const response = await claude.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 16384,
        system: `You are an elite advertising creative director. You follow the user's style preferences precisely while crafting the most effective ad creatives possible.

Available ad styles:
${AD_STYLES_DESCRIPTION}

${GLOBAL_CREATIVE_RULES}${briefSection}${copyPoolSystemConstraint}`,
        messages: [
          {
            role: "user",
            content: `Create an ad creative strategy for "${brandName}" following my style preferences.

My style preferences (distribute images according to these weights):
${styleDistribution}

Requirements:
- Generate exactly ${batchTotal} ad creatives total
- Format distribution: ${batchSplit.square} square (1:1) and ${batchSplit.portrait} portrait (9:16)
- All text must be in ${language}
- Follow the style weights above for distribution
- Each prompt_direction must be extremely detailed — use natural visual language ONLY (e.g., "bright yellow", "bold condensed", "warm cream"). NEVER write hex codes, pixel values, font-weight numbers, opacity percentages, or CSS property names — image models render those as literal visible text.
${copyRequirements}
- Each creative MUST have a "disclaimer" field — a SHORT string (max 60 chars).${hasCopyPool && (copyPool!.disclaimers || []).length > 0 ? " Pick from the allowed disclaimers pool." : ` e.g., "Guide only. Not an official application." or "Not affiliated with ${brandName}."`}${indexNote}

FORMAT NOTES:
- Square (1:1) creatives: Compact, tight composition. All elements centered and closely grouped.
- Portrait (9:16) creatives: Tall vertical canvas — use generous spacing between sections. Headline zone can be 60-70% of height. Extra vertical space should be used for larger text, wider dividers, and more breathing room. DO NOT just stretch a square layout — redesign the composition for the tall format.

${STRATEGY_OUTPUT_SCHEMA}`,
          },
        ],
      });

      const text =
        response.content[0].type === "text" ? response.content[0].text : "";
      return parseStrategy(text);
    }
  );

  // Post-generation safety net: replace any non-pool copy (on merged result)
  if (hasCopyPool) {
    return validateCopyPool(strategy, copyPool!, brandName);
  }

  return strategy;
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
}): Promise<GenerationStrategy> {
  const totalImages = totalCount || formatSplit.square + formatSplit.portrait;

  return batchStrategyGeneration(
    totalImages,
    formatSplit,
    async (batchSplit, batchTotal, startIndex) => {
      const claude = getClaudeClient();

      // Build content blocks with images for Claude Vision
      const contentBlocks: Array<
        | { type: "text"; text: string }
        | { type: "image"; source: { type: "url"; url: string } }
      > = [];

      contentBlocks.push({
        type: "text",
        text: `I'm sharing ${referenceImageUrls.length} winning ad creative(s) for the brand "${brandName}". Analyze each image carefully:
- What ad style is it? (graphic_text, storefront_card, uniform_style, inside_store)
- What makes it effective? (layout, colors, typography, messaging, CTA placement)
- What is the visual hierarchy and composition?
- What text/copy is used?

Then create ${batchTotal} variant creatives that maintain the winning elements but provide fresh variations.`,
      });

      for (const url of referenceImageUrls) {
        contentBlocks.push({
          type: "image",
          source: { type: "url", url },
        });
      }

      const indexNote =
        startIndex > 0
          ? `\n- Start item indices at ${startIndex} (this is batch 2 of a larger strategy)`
          : "";

      contentBlocks.push({
        type: "text",
        text: `Based on your analysis of the winning ads above, create variant ad creatives.

Requirements:
- Generate exactly ${batchTotal} variants total
- Format: ${batchSplit.square} square (1:1) and ${batchSplit.portrait} portrait (9:16)
- All text in ${language}
- Maintain the winning elements (style, layout patterns, color psychology) while varying the specific visuals, messaging angles, and compositions
- Each prompt_direction must be extremely detailed and self-contained — use natural visual language ONLY (e.g., "bright yellow", "bold condensed", "warm cream"). NEVER write hex codes, pixel values, font-weight numbers, opacity percentages, or CSS property names — image models render those as literal visible text.
- Headlines: short, punchy, under 40 chars
- CTAs: action-oriented, 2-4 words
- Each creative MUST have a "disclaimer" field — a SHORT string (max 60 chars) for the bottom of the image (e.g., "Guide only. Not an official application.")${indexNote}

FORMAT NOTES:
- Square (1:1) creatives: Compact, tight composition. All elements centered and closely grouped.
- Portrait (9:16) creatives: Tall vertical canvas — use generous spacing between sections. Headline zone can be 60-70% of height. DO NOT just stretch a square layout — redesign the composition for the tall format.

Available ad styles for classification:
${AD_STYLES_DESCRIPTION}

${STRATEGY_OUTPUT_SCHEMA}`,
      });

      const briefSection = creativeBrief
        ? `\n\n${briefToSystemSection(creativeBrief)}`
        : "";

      const response = await claude.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 16384,
        system: `You are an elite advertising creative director with expertise in analyzing winning ad creatives and producing high-performing variants. You have deep knowledge of visual composition, color psychology, and direct-response advertising.

${GLOBAL_CREATIVE_RULES}${briefSection}`,
        messages: [
          {
            role: "user",
            content: contentBlocks,
          },
        ],
      });

      const text =
        response.content[0].type === "text" ? response.content[0].text : "";
      return parseStrategy(text);
    }
  );
}
