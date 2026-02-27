import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai/client";

const SITE_EXTRACTION_PROMPT = `You are a data extraction assistant. Extract all per-site revenue data from this dash.ltv.so dashboard screenshot.

The screenshot shows a table of sites with columns like: Site, Revenue, FBR (FB Revenue), FBS (FB Spend), FBM (FB Margin %), Gross, Margin.

For each site row that has revenue > 0 or spend > 0, extract:
- site_name: the domain name shown
- abbreviation: the abbreviation in parentheses (e.g. "MBM", "GXP", "NASI")
- revenue: total revenue number
- fb_spend: FBS column value (Facebook Spend)
- fb_revenue: FBR column value (Facebook Revenue)
- gross: Gross profit
- margin_pct: Margin percentage

Also extract the totals row if visible.

Return valid JSON:
{
  "period": "string - date range if visible, e.g. 'Feb 1, 2026 - Feb 28, 2026'",
  "total": {
    "revenue": 0,
    "fb_spend": 0,
    "fb_revenue": 0,
    "gross": 0,
    "margin_pct": 0
  },
  "sites": [
    {
      "site_name": "moneyblog.mhbharti.com",
      "abbreviation": "MBM",
      "revenue": 6412.78,
      "fb_spend": 5531.56,
      "fb_revenue": 6412.78,
      "gross": 727.08,
      "margin_pct": 10.92
    }
  ]
}

Only include sites with revenue > 0 or fb_spend > 0. Use null for values you can't read clearly.`;

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
