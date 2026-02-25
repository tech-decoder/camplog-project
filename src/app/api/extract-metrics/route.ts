import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai/client";
import { METRICS_EXTRACTION_PROMPT } from "@/lib/openai/prompts";
import { toNumericValue } from "@/lib/utils/metrics";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const imageFile = formData.get("image") as File | null;

  if (!imageFile) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  const bytes = await imageFile.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const base64 = `data:${imageFile.type};base64,${buffer.toString("base64")}`;

  const openai = getOpenAIClient();

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: base64, detail: "high" } },
          { type: "text", text: METRICS_EXTRACTION_PROMPT },
        ],
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 2048,
    temperature: 0.1,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    return NextResponse.json(
      { error: "Failed to extract metrics" },
      { status: 500 }
    );
  }

  try {
    const parsed = JSON.parse(content);
    const metrics: Record<string, number> = {};

    if (parsed.metrics) {
      for (const [key, val] of Object.entries(parsed.metrics)) {
        if (key === "time_range" || key === "source_date") continue;
        const num = toNumericValue(val);
        if (num !== null) metrics[key] = num;
      }
    }

    return NextResponse.json({
      metrics,
      campaign_name: parsed.campaign_name || null,
      site: parsed.site || null,
      time_range: parsed.metrics?.time_range || null,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to parse extraction result" },
      { status: 500 }
    );
  }
}
