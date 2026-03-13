import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUserId } from "@/lib/supabase/auth-helper";
import { exportImagesToDrive } from "@/lib/google-drive";

/**
 * POST /api/campaigns/[id]/export-drive
 * Export campaign images to Google Drive.
 * Body: { imageIds?: string[] } — empty = all images
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: campaignId } = await params;
  const supabase = createAdminClient();

  // Get user's Drive token
  const { data: profile } = await supabase
    .from("profiles")
    .select("google_drive_refresh_token")
    .eq("id", userId)
    .single();

  if (!profile?.google_drive_refresh_token) {
    return NextResponse.json(
      { error: "google_drive_not_connected" },
      { status: 400 }
    );
  }

  // Get campaign info
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, name")
    .eq("id", campaignId)
    .eq("user_id", userId)
    .single();

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  // Get images
  const body = await request.json().catch(() => ({}));
  const { imageIds } = body as { imageIds?: string[] };

  let query = supabase
    .from("generated_images")
    .select("id, image_url, ad_style, generation_index, created_at")
    .eq("campaign_id", campaignId)
    .eq("user_id", userId);

  if (imageIds && imageIds.length > 0) {
    query = query.in("id", imageIds);
  }

  const { data: images, error } = await query.order("created_at", { ascending: false });

  if (error || !images || images.length === 0) {
    return NextResponse.json(
      { error: "No images found" },
      { status: 404 }
    );
  }

  // Build image list for Drive
  const driveImages = images.map((img, i) => {
    const style = img.ad_style || "creative";
    const idx = img.generation_index ?? i + 1;
    const ext = img.image_url.includes(".jpg") || img.image_url.includes("jpeg") ? "jpg" : "png";
    return {
      url: img.image_url,
      filename: `${style}_${idx}.${ext}`,
    };
  });

  try {
    const result = await exportImagesToDrive(
      profile.google_drive_refresh_token,
      driveImages,
      campaign.name
    );

    return NextResponse.json({
      folderUrl: result.folderUrl,
      count: result.count,
    });
  } catch (err) {
    console.error("Drive export error:", err);
    return NextResponse.json(
      { error: "Failed to export to Google Drive" },
      { status: 500 }
    );
  }
}
