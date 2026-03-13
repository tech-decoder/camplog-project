import { StylePreset } from "@/lib/types/generated-images";
import { StrategyItem } from "@/lib/types/generation-jobs";
import { FORMAT_DIMENSIONS, getStylePromptBoosters, getLocalizedText } from "@/lib/constants/image-gen";

const STYLE_INSTRUCTIONS: Record<StylePreset, string> = {
  modern:
    "Clean, contemporary design with bold typography, vibrant gradients, and sharp geometric shapes. Professional and polished look suitable for digital advertising.",
  minimal:
    "Minimalist composition with generous white space, simple color palette, and clean lines. Elegant and sophisticated aesthetic.",
  bold:
    "High-impact visuals with strong contrast, saturated colors, large text, and dynamic composition. Eye-catching and attention-grabbing.",
  lifestyle:
    "Authentic lifestyle photography style showing real people using products or services in natural settings. Warm, relatable, and aspirational.",
  product:
    "Professional product photography with clean backgrounds, perfect lighting, and detailed product showcase. E-commerce ready.",
};

export function buildImagePrompt({
  campaignName,
  headline,
  primaryText,
  description,
  stylePreset,
  customInstructions,
}: {
  campaignName: string;
  headline?: string;
  primaryText?: string;
  description?: string;
  stylePreset?: StylePreset;
  customInstructions?: string;
}): string {
  const parts: string[] = [];

  parts.push(
    "Create a high-quality advertising image for a digital marketing campaign."
  );

  if (campaignName) {
    parts.push(`Campaign: "${campaignName}".`);
  }

  if (headline) {
    parts.push(
      `The ad headline is: "${headline}". Include this text prominently in the image.`
    );
  }

  if (primaryText) {
    parts.push(`The ad copy reads: "${primaryText}".`);
  }

  if (description) {
    parts.push(`Additional context: ${description}.`);
  }

  if (stylePreset && STYLE_INSTRUCTIONS[stylePreset]) {
    parts.push(`Style direction: ${STYLE_INSTRUCTIONS[stylePreset]}`);
  }

  if (customInstructions) {
    parts.push(`Additional instructions: ${customInstructions}`);
  }

  parts.push(
    "The image should be suitable for use as a social media ad or display ad. Ensure any text in the image is crisp and legible."
  );

  return parts.join(" ");
}

export function buildPromptFromStrategy(
  item: StrategyItem,
  brandName: string,
  language: string = "English"
): string {
  const dimensions = FORMAT_DIMENSIONS[item.format];
  const t = getLocalizedText(language);
  const parts: string[] = [];

  // 0. TEXT ALLOWLIST — explicitly tell the image model what text to render
  // This is the single most important section for preventing instruction leakage.
  const textAllowlist = [
    `TEXT TO RENDER IN THE IMAGE (these are the ONLY words/phrases that should appear as visible text):`,
    `• Headline: "${item.headline}"`,
  ];
  if (item.subheadline) {
    textAllowlist.push(`• Subheadline: "${item.subheadline}"`);
  }
  textAllowlist.push(`• CTA button: "${item.cta}"`);
  textAllowlist.push(`• Badge: "${t.badge}"`);
  if (item.disclaimer) {
    textAllowlist.push(`• Disclaimer (tiny, bottom): "${item.disclaimer}"`);
  }
  textAllowlist.push(
    `\nIMPORTANT: Do NOT render any other text in the image. Everything below is layout and style guidance for composition only — NOT text to display. Never render CSS values, percentages, font names, hex codes, pixel sizes, or technical instructions as visible text.`
  );
  parts.push(textAllowlist.join("\n"));
  parts.push(""); // blank separator

  // 1. Style booster — structured spec reinforcement for the image model
  const boosters = getStylePromptBoosters(language);
  const styleBooster = boosters[item.ad_style];
  if (styleBooster) {
    parts.push(styleBooster);
    parts.push(""); // blank line separator
  }

  // 2. Claude's creative direction (the detailed prompt)
  parts.push(item.prompt_direction);

  // 3. Format-specific layout guidance
  if (item.format === "9:16") {
    parts.push(
      `\nFORMAT: Portrait 9:16 (${dimensions}). Tall vertical image — stack all elements top-to-bottom with generous vertical spacing. Use the extra height for a larger headline zone and more breathing room between sections. Keep all elements centered horizontally.`
    );
  } else {
    parts.push(
      `\nFORMAT: Square 1:1 (${dimensions}). Compact layout — keep elements tightly grouped and centered.`
    );
  }

  // 4. Text rendering emphasis (reinforces the allowlist)
  parts.push(
    `\nCRITICAL: Render ONLY the exact text listed at the top of this prompt (headline, subheadline, CTA, ${t.badge} badge, disclaimer). Every word must be crisp, legible, and spelled exactly as specified. Do NOT render any layout instructions, font names, color codes, or technical terms as visible text. The image should look like a professional digital ad creative.`
  );

  return parts.join("\n");
}
