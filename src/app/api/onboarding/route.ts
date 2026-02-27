import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUserId } from "@/lib/supabase/auth-helper";

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { nickname, sites } = (await request.json()) as {
    nickname: string;
    sites: { name: string; url?: string; abbreviation: string }[];
  };

  if (!nickname || nickname.trim().length === 0) {
    return NextResponse.json({ error: "Nickname is required" }, { status: 400 });
  }

  if (!Array.isArray(sites) || sites.length === 0) {
    return NextResponse.json({ error: "Add at least one site" }, { status: 400 });
  }

  // Update profile
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      nickname: nickname.trim().slice(0, 20),
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // Replace sites
  await supabase.from("user_sites").delete().eq("user_id", userId);
  await supabase.from("user_sites").insert(
    sites.map((s) => ({
      user_id: userId,
      site_abbreviation: s.abbreviation.slice(0, 10),
      site_name: s.name.slice(0, 100),
      site_url: s.url || null,
    }))
  );

  return NextResponse.json({ success: true });
}
