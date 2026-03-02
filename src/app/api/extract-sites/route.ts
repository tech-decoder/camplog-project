import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai/client";
import { getAuthUserId } from "@/lib/supabase/auth-helper";
import { createAdminClient } from "@/lib/supabase/admin";

function buildExtractionPrompt(
  sites: Array<{ abbreviation: string; name: string; url: string }>
) {
  const siteList = sites
    .map((s) => `  - "${s.url}" → abbreviation: "${s.abbreviation}" (${s.name})`)
    .join("\n");
  const abbreviations = sites.map((s) => s.abbreviation).join(", ");

  return `You are a data extraction assistant for an ad arbitrage marketer. Extract per-site revenue data from this dash.ltv.so dashboard screenshot.

## CRITICAL: Known Sites to Extract
I ONLY care about these specific sites. Match them by their EXACT domain name shown in the screenshot:
${siteList}

IMPORTANT: The dashboard may have many sites. Many have similar names (e.g. "mhbharti.com" vs "moneyblog.mhbharti.com", "gkbix.com" vs "portal.gkbix.com"). You MUST match the EXACT full domain listed above. Do NOT confuse parent domains with subdomains.

## Columns to Extract
The table has columns: Site, Revenue, FBR (FB Revenue), FBS (FB Spend), FBM (FB Margin %), Gross, Margin.

For each of our sites found in the screenshot, extract:
- abbreviation: MUST be one of: ${abbreviations}
- revenue: the Revenue column value
- fb_spend: the FBS column value (Facebook Spend)
- fb_revenue: the FBR column value
- fb_profit: the Gross column value (this is FB Revenue minus FB Spend, read it directly from the screenshot)
- fbm_pct: the FBM column value (Facebook Margin %). Read it directly from the screenshot, do NOT calculate it.

IMPORTANT: Extract fb_profit (Gross) and fbm_pct (FBM) directly from the screenshot values. Do NOT calculate them — read the exact numbers shown.

Also extract the totals row (first row, usually says "Total: 44" or similar).

## Response Format
Return valid JSON:
{
  "period": "string - date range shown, e.g. 'Mar 1, 2026 - Mar 1, 2026'",
  "total": {
    "sites_count": 44,
    "revenue": 816.05,
    "fb_spend": 740.36,
    "fb_revenue": 816.05,
    "fb_profit": 54.18,
    "fbm_pct": 9.28
  },
  "sites": [
    {
      "abbreviation": "MBM",
      "domain": "moneyblog.mhbharti.com",
      "revenue": 327.57,
      "fb_spend": 284.37,
      "fb_revenue": 327.57,
      "fb_profit": 35.86,
      "fbm_pct": 13.19
    }
  ]
}

Only include our known sites. If a site is not visible in the screenshot or has 0 revenue AND 0 spend, omit it.`;
}

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const imageFile = formData.get("image") as File | null;

  if (!imageFile) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  // Fetch user's sites from user_sites table
  const supabase = createAdminClient();
  const { data: siteRows } = await supabase
    .from("user_sites")
    .select("site_abbreviation, site_name, site_url")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  const userSites = (siteRows || []).map((s) => ({
    abbreviation: s.site_abbreviation,
    name: s.site_name || s.site_abbreviation,
    url: s.site_url || "",
  }));

  if (userSites.length === 0) {
    return NextResponse.json(
      { error: "No sites configured. Add sites in My Sites first." },
      { status: 400 }
    );
  }

  const bytes = await imageFile.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const base64 = `data:${imageFile.type};base64,${buffer.toString("base64")}`;

  try {
    const openai = getOpenAIClient();
    const prompt = buildExtractionPrompt(userSites);
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: base64, detail: "high" } },
            { type: "text", text: prompt },
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
