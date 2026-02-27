import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai/client";
import { KNOWN_SITES } from "@/lib/constants/sites";

// Build the prompt dynamically from our known sites config
const siteList = KNOWN_SITES.map(
  (s) => `  - "${s.domain}" → abbreviation: "${s.abbreviation}" (${s.shortName})`
).join("\n");

const SITE_EXTRACTION_PROMPT = `You are a data extraction assistant for an ad arbitrage marketer. Extract per-site revenue data from this dash.ltv.so dashboard screenshot.

## CRITICAL: Known Sites to Extract
I ONLY care about these 10 specific sites. Match them by their EXACT domain name shown in the screenshot:
${siteList}

IMPORTANT: The dashboard has ~45 sites. Many have similar names (e.g. "mhbharti.com" vs "moneyblog.mhbharti.com", "gkbix.com" vs "portal.gkbix.com"). You MUST match the EXACT full domain listed above. Do NOT confuse parent domains with subdomains.

## Columns to Extract
The table has columns: Site, Revenue, FBR (FB Revenue), FBS (FB Spend), FBM (FB Margin %), Gross, Margin.

For each of our 10 sites found in the screenshot, extract:
- abbreviation: MUST be one of: ${KNOWN_SITES.map((s) => s.abbreviation).join(", ")}
- revenue: the Revenue column value
- fb_spend: the FBS column value (Facebook Spend)
- fb_revenue: the FBR column value
- gross: the Gross column value
- margin_pct: the Margin % column value
- fbm_pct: the FBM column value (Facebook Margin %)

Also extract the totals row (first row, usually says "Total: 45" or similar).

## Response Format
Return valid JSON:
{
  "period": "string - date range shown, e.g. 'Feb 1, 2026 - Feb 28, 2026'",
  "total": {
    "sites_count": 45,
    "revenue": 16852.52,
    "fb_spend": 14659.31,
    "fb_revenue": 16802.48,
    "gross": 1618.42,
    "margin_pct": 9.16,
    "fbm_pct": 12.76
  },
  "sites": [
    {
      "abbreviation": "MBM",
      "domain": "moneyblog.mhbharti.com",
      "revenue": 6426.37,
      "fb_spend": 5540.09,
      "fb_revenue": 6426.37,
      "gross": 731.53,
      "margin_pct": 10.97,
      "fbm_pct": 13.79
    }
  ]
}

Only include our 10 known sites. If a site is not visible in the screenshot or has 0 revenue AND 0 spend, omit it.`;

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const imageFile = formData.get("image") as File | null;

  if (!imageFile) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  const bytes = await imageFile.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const base64 = `data:${imageFile.type};base64,${buffer.toString("base64")}`;

  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: base64, detail: "high" } },
            { type: "text", text: SITE_EXTRACTION_PROMPT },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 4096,
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "Failed to extract site data" },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(content);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Site extraction failed:", err);
    return NextResponse.json(
      { error: "Failed to extract site data from screenshot" },
      { status: 500 }
    );
  }
}
