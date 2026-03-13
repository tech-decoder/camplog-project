import { ImageModel, StylePreset } from "@/lib/types/generated-images";
import { AdStyle, ImageFormat } from "@/lib/types/generation-jobs";

// Legacy style presets (kept for backward compat with existing generated_images)
export const STYLE_PRESETS: { value: StylePreset; label: string; desc: string }[] = [
  { value: "modern", label: "Modern", desc: "Clean, bold, vibrant" },
  { value: "minimal", label: "Minimal", desc: "White space, elegant" },
  { value: "bold", label: "Bold", desc: "High-impact, saturated" },
  { value: "lifestyle", label: "Lifestyle", desc: "People, authentic" },
  { value: "product", label: "Product", desc: "Product showcase" },
];

// Global rules enforced across ALL ad styles.
// IMPORTANT: Use natural visual language only — no hex codes, pixel values, font weights,
// or CSS properties. Image models will render technical specs as literal visible text.
export const GLOBAL_CREATIVE_RULES = `GLOBAL RULES (apply to ALL ad styles without exception):

TYPOGRAPHY:
- Headlines: bold, heavy, condensed, ALL CAPS
- Subheadlines: lighter weight, regular or slightly italic, normal sentence case
- CTA text: bold condensed, ALL CAPS
- Disclaimer text: very small, light gray, plain
- NEVER mix more than 2 font styles in one creative
- NEVER use script/handwritten fonts for headlines or CTAs (italic OK for subheadlines in dark guide only)

BRAND COLORS:
- If the brand is well-known, use their recognizable brand colors (KFC red and yellow, Walmart blue and yellow, Home Depot orange, etc.)
- Primary brand color: headline accents, CTA button fill, decorative elements
- Secondary brand color: dividers, accents, subtle highlights
- Neutral base: white, near-black, or warm cream depending on style
- NEVER ignore brand colors — every creative must visually communicate the brand through color

CTA BUTTONS:
- Always pill-shaped with fully rounded corners, wide and tall enough to be easily tappable
- Wide (most of the image width), centered horizontally
- Filled with brand accent color (never outline/ghost style)
- Text: ALL CAPS, bold condensed, high-contrast color (white on dark, dark on light)

"GUIDE" BADGE:
- Include a bright yellow rounded "GUIDE" badge on EVERY creative
- Position: top-right corner, small but clearly readable
- Text: ALL CAPS, bold, dark text on yellow background
- Purpose: Frames the ad as an information resource

DISCLAIMERS:
- Every creative MUST include a tiny disclaimer line at the very bottom
- Very small, light gray, centered
- Positioned at the absolute bottom of the image
- KEEP IT SHORT: max 60 characters. Shorter text renders more reliably.
- Example: "Guide only. Not an official application."

CRITICAL PROMPT_DIRECTION RULE:
When writing prompt_direction for each creative, describe visuals using natural language ONLY.
- Colors: say "bright yellow", "deep red", "warm cream", "near-black" — NEVER write hex codes like #FFD700
- Sizes: say "massive", "small", "tiny", "wide" — NEVER write pixel values like 44px or 10px
- Fonts: say "bold condensed", "light italic" — NEVER write font-weight numbers like 800 or 400
- Opacity: say "softer", "muted", "lighter" — NEVER write percentages like 60%
- Spacing: say "generous spacing", "tight" — NEVER write em values like -0.02em
Image models render technical values as literal text in the image. Use only descriptive words.
`;

// New ad style taxonomy for the AI creative pipeline
// Specs refined from winning KFC, Walmart, Home Depot campaigns
export const AD_STYLES: { value: AdStyle; label: string; description: string; example: string }[] = [
  {
    value: "graphic_text",
    label: "Graphic + Text Only",
    description: `Two sub-variants — choose based on tone:

(1) WHITE BG ICON GRID: Pure white (#FFFFFF) background. Yellow/gold (#FFD700) rounded-rectangle "GUIDE" badge in top-right corner (~12-15% width, ALL CAPS bold text). Brand-color banner strip at top ~25% of image height with white ALL CAPS headline text (heavy condensed font, Impact/Oswald 800). Below banner: 3-column evenly-spaced grid of cartoon/outlined benefit icons (~64px each, 2px outline stroke in brand-adjacent colors), each with a bold 14px ALL CAPS label underneath. Wide brand-accent-color pill CTA button (~70% image width, 44-48px height, ALL CAPS bold dark text). Small gray (#999) disclaimer footer text at very bottom. Brand established through color palette only — NO logo icon.

(2) DARK GUIDE (curiosity-gap clickbait — PROVEN HIGH-CTR FORMAT):
Solid black (#000000) background, no gradients, no patterns — pure flat black.

TOP BAR (top 12-15% of image):
- Brand logo: top-left corner, standard full-color mark, ~12-15% of image width, vertically centered in top zone
- "GUIDE" badge: top-right corner, yellow/gold (#FFD700) rounded-rectangle pill, mirroring logo size, ALL CAPS bold "GUIDE" text in dark/black

HEADLINE ZONE (center 50-60% of vertical space):
- Text: "HOW TO APPLY AT [BRAND]" or similar curiosity-gap hook
- Font: Impact or Oswald Black (800 weight), ALL CAPS, ultra-condensed
- Color: Pure white (#FFFFFF)
- Size: MASSIVE — fill the entire center zone, 2-3 stacked lines
- Letter-spacing: tight (-0.02em condensed)

DECORATIVE DIVIDERS (above and below headline):
- TWO horizontal thick solid flat bars as decorative dividers
- Bar 1: brand primary color (e.g., KFC red, Walmart blue, DHL red)
- Bar 2: brand secondary/accent color (e.g., KFC yellow, Walmart yellow, DHL yellow)
- Style: clean solid flat rectangular bars with sharp edges — NO brush strokes, NO paint texture, NO hand-drawn effects, NO zigzag, NO rough edges
- Width: ~60-70% of image width, centered
- One set above headline, one set below

SUBHEADLINE (below dividers):
- Text: "Step by Step" or similar guide-framing copy
- Font: italic serif or italic script, lighter weight
- Color: cream/off-white (#F5F0E8)
- Size: ~18-22px equivalent, centered

CTA BUTTON (bottom 15-20% of image):
- Shape: fully rounded pill, ~70% image width, 48px height
- Fill: brand primary color (KFC red, Walmart blue, etc.) — NOT generic red
- Text: "OPEN THE GUIDE" or "READ MORE" — white ALL CAPS bold condensed
- NEVER "APPLY NOW" — the guide framing is critical for CTR

DISCLAIMER (absolute bottom):
- Small gray (#999999) text, 10-11px, centered
- One line from the disclaimer pool

Purpose: Frames ad as an information resource to drive curiosity clicks. The GUIDE badge + "OPEN THE GUIDE" CTA combo is the key differentiator.`,
    example: "KFC IS HIRING with drumstick/clock/dollar icons on white + GUIDE badge top-right, OR 'HOW TO APPLY AT KFC' on black with logo top-left, GUIDE badge top-right, red+yellow decorative dividers, 'Step by Step' italic, red 'OPEN THE GUIDE' pill CTA",
  },
  {
    value: "storefront_card",
    label: "Storefront + Card Text",
    description: `Real store exterior photo — daylight, parking lot visible, shot from ~30ft showing full building signage. Yellow/gold (#FFD700) rounded-rectangle "GUIDE" badge in top-right corner of the photo area (~12-15% width, ALL CAPS bold text). Bottom 40-50% of image covered by a SOLID rounded card (NOT translucent, NOT semi-transparent): warm cream/off-white (#F5F0E8, never pure white), 20-24px border radius, subtle 4px drop shadow (rgba(0,0,0,0.12)), 85% image width, centered horizontally.

Card interior top-to-bottom: ALL CAPS headline in heavy condensed sans-serif (Impact/Oswald 800), dark/black (#1A1A1A) base color with brand name rendered in brand primary color at 120% font-size relative to rest of headline. Below: lighter-weight (400) sentence-case subheadline at 60% opacity. Below: wide pill CTA button in brand accent color (e.g. KFC yellow #F5B335), 70% card width, 44-48px height, ALL CAPS bold condensed dark text inside.

Below the card floating in the photo area: small white 14px benefit text chips separated by bullet/dot (e.g. "Part-Time \u00b7 Free Food"). Small gray (#999) disclaimer footer text at very bottom of card. CRITICAL: NEVER add a floating logo overlay — the building signage in the photo IS the brand identity.`,
    example: "KFC storefront photo with GUIDE badge top-right + warm cream card overlay: 'NOW HIRING AT KFC' (KFC in red, larger) \u2192 'Start work this week' \u2192 yellow 'APPLY IN MINUTES' pill button \u2192 white 'Part-Time \u00b7 Free Food' text below card",
  },
  {
    value: "uniform_style",
    label: "Graphic + Uniform Style",
    description: `Clean white (#FFFFFF) or very light background with generous whitespace. Yellow/gold (#FFD700) rounded-rectangle "GUIDE" badge in top-right corner (~12-15% width, ALL CAPS bold text). Massive ALL CAPS dark (#1A1A1A) condensed headline (Impact/Oswald 800) at TOP of image, full width, heavy/black font weight. Thin 1px horizontal divider rule (#E0E0E0) below headline. Lighter-weight (400) subheadline text below divider.

Hero visual: large centered product image — the brand's uniform, apron, hat, or signature merchandise item as a PNG-style cutout (no background), centered, occupying ~40% of image height. The brand logo must be embedded ON the product itself (printed on the apron, embroidered on the hat) — NEVER add a separate floating logo overlay anywhere. Wide brand-color pill CTA button at bottom (~70% width, 44-48px height, ALL CAPS bold text). Small gray (#999) disclaimer footer text at very bottom.`,
    example: "Home Depot orange apron hero with I\u2764HOME DEPOT logo on the apron, GUIDE badge top-right, 'EMPLEOS EN HOME DEPOT PR' headline at top, 'VER EMPLEOS' orange button at bottom \u2014 no separate logo anywhere",
  },
  {
    value: "inside_store",
    label: "Inside Store View + Text",
    description: `Store interior, aisle, warehouse, or break-room photo (well-lit, clean, no harsh shadows). Yellow/gold (#FFD700) rounded-rectangle "GUIDE" badge in top-right corner of the image (~12-15% width, ALL CAPS bold text). Text overlay using either: (a) a warm cream card (same specs as storefront_card: solid #F5F0E8, 20-24px radius, 4px shadow, 85% width) positioned at bottom 40%, or (b) semi-transparent dark overlay (rgba(0,0,0,0.55)) covering bottom portion with direct white text on top.

Card/overlay content follows same hierarchy: ALL CAPS condensed headline, subheadline, pill CTA button. Brand established through visible store signage, shelf labels, branded decor, and interior elements in the photo — NEVER add a floating logo overlay on top. CTA button (brand color pill, 44-48px height) positioned at bottom. Small gray (#999) disclaimer footer text at very bottom.`,
    example: "Walmart aisle or warehouse interior with GUIDE badge top-right + warm cream card overlay: 'HIRING NOW' headline and 'APPLY IN MINUTES' yellow CTA button \u2014 Walmart signage visible in background establishes the brand",
  },
];

// Condensed style specs injected directly into the image generation prompt.
// IMPORTANT: Use natural visual language only — no CSS values, pixel sizes, hex codes,
// font weights, or opacity percentages. Image models render those as literal text.
export const STYLE_PROMPT_BOOSTERS: Record<string, string> = {
  graphic_text: `VISUAL LAYOUT — DARK GUIDE FORMAT:
Solid pure black background, no gradients.
• TOP-LEFT: Small brand logo
• TOP-RIGHT: Bright yellow rounded "GUIDE" badge
• CENTER: Massive white ALL CAPS headline in bold condensed font, filling most of the center area across 2-3 stacked lines
• ABOVE the headline: Two thick horizontal solid flat bars — one in brand primary color, one in brand secondary/accent color, centered. Clean sharp edges, NO brush strokes or paint texture.
• BELOW the headline: Same two thick solid flat bars repeated
• BELOW the dividers: Italic subheadline in soft cream color, centered
• BOTTOM: Wide pill-shaped CTA button in the brand color, with white ALL CAPS text inside
• VERY BOTTOM: Tiny light-gray disclaimer text, centered`,

  storefront_card: `VISUAL LAYOUT — STOREFRONT + CARD:
• TOP HALF: Real store exterior photo — daylight, parking lot visible, full building signage clearly readable
• TOP-RIGHT of the photo: Bright yellow rounded "GUIDE" badge
• BOTTOM HALF: Solid warm cream/off-white rounded card overlay (fully opaque, not see-through), wide and centered
• Card interior from top to bottom: bold ALL CAPS headline (the brand name rendered slightly larger and in brand color), a lighter softer subheadline below, then a wide pill-shaped CTA button in brand accent color with dark bold text
• Below the card floating in the photo area: small white benefit text chips
• BOTTOM of card: Tiny light-gray disclaimer text
• NO floating logo anywhere — the building signage in the photo IS the brand identity`,

  uniform_style: `VISUAL LAYOUT — UNIFORM/PRODUCT STYLE:
Clean white background with generous whitespace.
• TOP-RIGHT: Bright yellow rounded "GUIDE" badge
• TOP: Massive bold ALL CAPS dark headline in condensed font, spanning full width
• A thin horizontal divider line below the headline
• A lighter, softer subheadline below the divider
• CENTER: Large product image — the brand's uniform, apron, or hat shown as a clean cutout with no background, with the brand logo printed directly ON the product itself
• BOTTOM: Wide pill-shaped CTA button in brand color
• VERY BOTTOM: Tiny light-gray disclaimer text
• NO separate floating logo anywhere — the logo on the product is enough`,

  inside_store: `VISUAL LAYOUT — INSIDE STORE VIEW:
• BACKGROUND: Store interior, aisle, or warehouse photo — well-lit, clean, no harsh shadows
• TOP-RIGHT: Bright yellow rounded "GUIDE" badge
• BOTTOM PORTION: Either a solid warm cream/off-white rounded card overlay OR a dark semi-transparent overlay
• Overlay content from top to bottom: bold ALL CAPS condensed headline, a lighter softer subheadline, and a wide pill-shaped CTA button in brand color
• VERY BOTTOM: Tiny light-gray disclaimer text
• Brand is established through visible store signage, shelf labels, and branded decor in the photo — NO floating logo overlay`,
};

export const MODEL_OPTIONS: { value: ImageModel; label: string; desc: string }[] = [
  { value: "gemini-pro-image", label: "Nano Banana Pro", desc: "Gemini 3 Pro · Studio-quality, free" },
  { value: "gemini-flash-image", label: "Nano Banana 2", desc: "Gemini 2.5 Flash · Fast, free" },
  { value: "imagen-3", label: "Gemini Imagen 3", desc: "Google Imagen 3 · Free" },
  { value: "gpt-image-1", label: "GPT Image", desc: "OpenAI · Paid, best text rendering" },
];

export const FORMAT_OPTIONS: { value: ImageFormat; label: string; dimensions: string }[] = [
  { value: "1:1", label: "Square (1:1)", dimensions: "1024x1024" },
  { value: "9:16", label: "Portrait (9:16)", dimensions: "1024x1536" },
];

export const LANGUAGE_OPTIONS = [
  "English",
  "Spanish",
  "French",
  "Portuguese",
  "German",
  "Italian",
  "Dutch",
  "Arabic",
  "Japanese",
  "Korean",
  "Chinese",
] as const;

export const FORMAT_DIMENSIONS: Record<ImageFormat, string> = {
  "1:1": "1024x1024",
  "9:16": "1024x1536",
};

/** Handles both new (1024x1536) and legacy (1024x1792) portrait dimensions in DB */
export function isPortraitDimension(dimensions: string): boolean {
  return dimensions === "1024x1536" || dimensions === "1024x1792";
}
