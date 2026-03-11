import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUserId } from "@/lib/supabase/auth-helper";
import { getApiKeyUserId } from "@/lib/supabase/api-key-auth";
import { getClaudeClient } from "@/lib/claude/client";

async function resolveUserId(request: NextRequest): Promise<string | null> {
  let userId = await getAuthUserId();
  if (!userId) {
    userId = await getApiKeyUserId(request.headers.get("authorization"));
  }
  return userId;
}

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
// Loads last 30 rated images, synthesizes learnings via Claude Haiku, inserts into creative_memory
export async function POST(request: NextRequest) {
  const userId = await resolveUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { brand_name } = body;

  const supabase = createAdminClient();

  // Load last 30 rated images with their metadata
  let ratingQuery = supabase
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

  // Build summary for Claude
  const ratingLines = ratings.map((r: any) => {
    const img = r.generated_images;
    const brand = img?.generation_jobs?.brand_name || "Unknown brand";
    const sentiment = r.rating === 1 ? "THUMBS UP ✅" : "THUMBS DOWN ❌";
    const style = img?.ad_style || "unknown style";
    const headline = img?.headline_ref ? `"${img.headline_ref}"` : "no headline";
    const note = r.notes ? ` (note: ${r.notes})` : "";
    return `- ${sentiment} | ${brand} | ${style} | ${headline}${note}`;
  });

  const brandContext = brand_name
    ? `Focus especially on patterns specific to the brand "${brand_name}".`
    : "Identify global cross-brand patterns.";

  const claude = getClaudeClient();
  const response = await claude.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 800,
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

Format as JSON array (no markdown):
[
  { "memory_type": "style_learning", "content": "..." },
  { "memory_type": "copy_learning", "content": "..." }
]`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "[]";
  const cleaned = text.replace(/```(?:json)?\n?([\s\S]*?)```/, "$1").trim();

  let learnings: { memory_type: string; content: string }[] = [];
  try {
    learnings = JSON.parse(cleaned);
  } catch {
    return NextResponse.json({ error: "Failed to parse Claude response" }, { status: 500 });
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
