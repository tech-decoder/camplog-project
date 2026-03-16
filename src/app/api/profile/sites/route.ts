import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUserId } from "@/lib/supabase/auth-helper";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("user_sites")
    .select("id, site_abbreviation, site_name, site_url")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  return NextResponse.json({
    sites: (data || []).map((s) => ({
      id: s.id,
      abbreviation: s.site_abbreviation,
      name: s.site_name || s.site_abbreviation,
      url: s.site_url || null,
    })),
  });
}

export async function PUT(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { sites } = (await request.json()) as {
    sites: { name: string; url?: string; abbreviation: string }[];
  };

  if (!Array.isArray(sites)) {
    return NextResponse.json({ error: "sites must be an array" }, { status: 400 });
  }

  // Replace all: delete existing, then insert new
  const { error: deleteError } = await supabase
    .from("user_sites")
    .delete()
    .eq("user_id", userId);

  if (deleteError) {
    console.error("[sites] DELETE failed:", deleteError);
    return NextResponse.json({ error: "Failed to clear existing sites" }, { status: 500 });
  }

  if (sites.length > 0) {
    const { error: insertError } = await supabase.from("user_sites").insert(
      sites.map((s) => ({
        user_id: userId,
        site_abbreviation: s.abbreviation.slice(0, 10),
        site_name: s.name.slice(0, 100),
        site_url: s.url || null,
      }))
    );

    if (insertError) {
      console.error("[sites] INSERT failed:", insertError);
      return NextResponse.json({ error: "Failed to save sites" }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
