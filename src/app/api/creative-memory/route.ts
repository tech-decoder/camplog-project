import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveUserId } from "@/lib/supabase/route-helpers";
import { getOpenAIClient } from "@/lib/openai/client";


// GET /api/creative-memory?brand_name=X
// Returns brand-specific + global (brand_name IS NULL) memory items for user
export async function GET(request: NextRequest) {
  const userId = await resolveUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const brandName = searchParams.get("brand_name");

  const supabase = createAdminClient();

  let query = supabase
    .from("creative_memory")
    .select("id, brand_name, memory_type, content, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (brandName) {
    query = query.or(`brand_name.eq.${brandName},brand_name.is.null`);
  } else {
    query = query.is("brand_name", null);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Failed to load memory" }, { status: 500 });
  }

  return NextResponse.json({ items: data || [] });
}

// POST /api/creative-memory/synthesize
// Body: { brand_name?: string }
// Loads last 30 rated images, synthesizes learnings via GPT-4.1, inserts into creative_memory
export async function POST(request: NextRequest) {
  const userId = await resolveUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { brand_name } = body;

  const supabase = createAdminClient();

  // Load last 30 rated images with their metadata
  const ratingQuery = supabase
    .from("image_ratings")
    .select(
      `rating, notes, created_at,
       generated_images (
         id, ad_style, headline_ref, job_id,
         generation_jobs ( brand_name )
       )`
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);

  const { data: ratings, error: ratingsError } = await ratingQuery;

  if (ratingsError) {
    return NextResponse.json(
      { error: "Failed to load ratings" },
      { status: 500 }
    );
  }

  if (!ratings || ratings.length === 0) {
    return NextResponse.json({ message: "No ratings to synthesize", inserted: 0 });
  }

  // Supabase returns nested relations as arrays even for one-to-one joins
  type RatingRow = {
    rating: number;
    notes: string | null;
    created_at: string;
    generated_images: Array<{
      id: string;
      ad_style: string | null;
      headline_ref: string | null;
      job_id: string;
      generation_jobs: Array<{ brand_name: string }>;
    }>;
  };

  // Build summary for the AI
  const ratingLines = (ratings as unknown as RatingRow[]).map((r) => {
    const img = r.generated_images?.[0];
    const brand = img?.generation_jobs?.[0]?.brand_name || "Unknown brand";
    const sentiment = r.rating === 1 ? "THUMBS UP ✅" : "THUMBS DOWN ❌";
    const style = img?.ad_style || "unknown style";
    const headline = img?.headline_ref ? `"${img.headline_ref}"` : "no headline";
    const note = r.notes ? ` (note: ${r.notes})` : "";
    return `- ${sentiment} | ${brand} | ${style} | ${headline}${note}`;
  });

  const brandContext = brand_name
    ? `Focus especially on patterns specific to the brand "${brand_name}".`
    : "Identify global cross-brand patterns.";

  const openai = getOpenAIClient();
  const completion = await openai.chat.completions.create({
    model: "gpt-4.1",
    max_tokens: 800,
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "user",
        content: `You are an advertising creative analyst. Analyze these thumbs-up/down ratings on ad creatives and extract actionable insights.

${brandContext}

Rated creatives:
${ratingLines.join("\n")}

Output 3-5 concise learning bullets (each 1-2 sentences). Categorize each as one of:
- style_learning: insights about which visual styles perform better
- copy_learning: insights about headlines, CTAs, messaging that works/doesn't
- composition_learning: layout, placement, proportion insights
- brand_insight: brand-specific observations

Return as a JSON object with a "learnings" key containing an array:
{ "learnings": [
  { "memory_type": "style_learning", "content": "..." },
  { "memory_type": "copy_learning", "content": "..." }
] }`,
      },
    ],
  });

  const text = completion.choices[0].message.content ?? "{}";
  const cleaned = text.replace(/```(?:json)?\n?([\s\S]*?)```/, "$1").trim();

  let learnings: { memory_type: string; content: string }[] = [];
  try {
    const parsed = JSON.parse(cleaned);
    learnings = Array.isArray(parsed) ? parsed : (parsed.learnings || []);
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
  }

  if (!learnings.length) {
    return NextResponse.json({ message: "No learnings extracted", inserted: 0 });
  }

  // Insert into creative_memory
  const rows = learnings.map((l) => ({
    user_id: userId,
    brand_name: brand_name || null,
    memory_type: l.memory_type,
    content: l.content,
  }));

  const { error: insertError } = await supabase
    .from("creative_memory")
    .insert(rows);

  if (insertError) {
    console.error("Failed to insert memory:", insertError);
    return NextResponse.json({ error: "Failed to save memory" }, { status: 500 });
  }

  return NextResponse.json({ message: "Synthesis complete", inserted: learnings.length, learnings });
}
