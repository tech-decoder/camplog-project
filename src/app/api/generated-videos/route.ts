import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveUserId } from "@/lib/supabase/route-helpers";


export async function GET(request: NextRequest) {
  const userId = await resolveUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get("campaign_id");

  let query = supabase
    .from("generated_videos")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (campaignId) {
    query = query.eq("campaign_id", campaignId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ videos: data || [] });
}

export async function DELETE(request: NextRequest) {
  const userId = await resolveUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { ids } = await request.json();

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "No video IDs provided" }, { status: 400 });
  }

  // Get video URLs for storage cleanup
  const { data: videos } = await supabase
    .from("generated_videos")
    .select("id, video_url")
    .eq("user_id", userId)
    .in("id", ids);

  if (!videos?.length) {
    return NextResponse.json({ error: "No videos found" }, { status: 404 });
  }

  // Delete from storage
  const storagePaths = videos
    .map((v) => {
      try {
        const url = new URL(v.video_url);
        const match = url.pathname.match(/generated-videos\/(.+)/);
        return match?.[1] || null;
      } catch {
        return null;
      }
    })
    .filter(Boolean) as string[];

  if (storagePaths.length > 0) {
    await supabase.storage.from("generated-videos").remove(storagePaths);
  }

  // Delete from DB
  const { error } = await supabase
    .from("generated_videos")
    .delete()
    .eq("user_id", userId)
    .in("id", ids);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: ids.length });
}
