import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveUserId } from "@/lib/supabase/route-helpers";


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await resolveUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: campaignId } = await params;
  const supabase = createAdminClient();

  // Verify campaign ownership
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id")
    .eq("id", campaignId)
    .eq("user_id", userId)
    .single();

  if (!campaign) {
    return NextResponse.json(
      { error: "Campaign not found" },
      { status: 404 }
    );
  }

  const { data: videos, error } = await supabase
    .from("generated_videos")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ videos: videos || [] });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await resolveUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: campaignId } = await params;
  const supabase = createAdminClient();
  const body = await request.json();
  const { videoId } = body;

  if (!videoId) {
    return NextResponse.json(
      { error: "videoId is required" },
      { status: 400 }
    );
  }

  // Verify ownership
  const { data: video } = await supabase
    .from("generated_videos")
    .select("id, video_url")
    .eq("id", videoId)
    .eq("campaign_id", campaignId)
    .eq("user_id", userId)
    .single();

  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  // Extract storage path from URL and delete from storage
  const url = new URL(video.video_url);
  const storagePath = url.pathname.split("/generated-videos/")[1];
  if (storagePath) {
    await supabase.storage
      .from("generated-videos")
      .remove([decodeURIComponent(storagePath)]);
  }

  // Delete DB record
  await supabase.from("generated_videos").delete().eq("id", videoId);

  return NextResponse.json({ success: true });
}
