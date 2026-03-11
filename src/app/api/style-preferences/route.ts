import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUserId } from "@/lib/supabase/auth-helper";
import { getApiKeyUserId } from "@/lib/supabase/api-key-auth";

async function resolveUserId(request: NextRequest): Promise<string | null> {
  let userId = await getAuthUserId();
  if (!userId) {
    userId = await getApiKeyUserId(request.headers.get("authorization"));
  }
  return userId;
}

export async function GET(request: NextRequest) {
  const userId = await resolveUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("style_preferences")
    .select("*")
    .eq("user_id", userId)
    .is("campaign_id", null)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: "Failed to fetch preferences" }, { status: 500 });
  }

  return NextResponse.json({ preferences: data || null });
}

export async function PUT(request: NextRequest) {
  const userId = await resolveUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const supabase = createAdminClient();

  // Check if a profile-level record exists (campaign_id IS NULL)
  const { data: existing } = await supabase
    .from("style_preferences")
    .select("id")
    .eq("user_id", userId)
    .is("campaign_id", null)
    .single();

  // Only include fields that are explicitly provided in the request body.
  // This prevents auto-save from CustomForm (sends styles/language/format)
  // from wiping copy_pool managed by the Settings → CopyPoolEditor,
  // and vice versa.
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if ("styles" in body) updatePayload.styles = body.styles;
  if ("default_language" in body) updatePayload.default_language = body.default_language;
  if ("default_format_split" in body) updatePayload.default_format_split = body.default_format_split;
  if ("copy_pool" in body) updatePayload.copy_pool = body.copy_pool;

  let data, error;

  if (existing) {
    // Partial update — only touch fields present in the request
    ({ data, error } = await supabase
      .from("style_preferences")
      .update(updatePayload)
      .eq("id", existing.id)
      .select()
      .single());
  } else {
    // Insert — provide full defaults for any missing fields
    const insertPayload = {
      user_id: userId,
      campaign_id: null,
      styles: body.styles || [],
      default_language: body.default_language || "English",
      default_format_split: body.default_format_split || { square: 6, portrait: 6 },
      copy_pool: body.copy_pool || { headlines: [], subheadlines: [], ctas: [], disclaimers: [] },
      ...updatePayload,
    };
    ({ data, error } = await supabase
      .from("style_preferences")
      .insert(insertPayload)
      .select()
      .single());
  }

  if (error) {
    console.error("Failed to save style preferences:", error);
    return NextResponse.json({ error: "Failed to save preferences" }, { status: 500 });
  }

  return NextResponse.json({ preferences: data });
}
