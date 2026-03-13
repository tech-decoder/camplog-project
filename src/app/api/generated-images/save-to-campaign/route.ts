import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveUserId } from "@/lib/supabase/route-helpers";


export async function POST(request: NextRequest) {
  const userId = await resolveUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const imageIds: string[] = body.image_ids;
  const campaignName: string = body.campaign_name?.trim();

  if (!imageIds?.length) {
    return NextResponse.json({ error: "No images selected" }, { status: 400 });
  }

  if (!campaignName) {
    return NextResponse.json({ error: "Campaign name is required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Verify all images belong to user
  const { data: images, error: imgError } = await supabase
    .from("generated_images")
    .select("id")
    .eq("user_id", userId)
    .in("id", imageIds);

  if (imgError) {
    return NextResponse.json({ error: "Failed to verify images" }, { status: 500 });
  }

  if (!images || images.length !== imageIds.length) {
    return NextResponse.json({ error: "Some images not found or unauthorized" }, { status: 403 });
  }

  // Find or create campaign (case-insensitive)
  const { data: existingCampaign } = await supabase
    .from("campaigns")
    .select("id, name")
    .eq("user_id", userId)
    .ilike("name", campaignName)
    .limit(1)
    .single();

  let campaign: { id: string; name: string };

  if (existingCampaign) {
    campaign = existingCampaign;
  } else {
    const { data: newCampaign, error: campaignError } = await supabase
      .from("campaigns")
      .insert({
        user_id: userId,
        name: campaignName,
        platform: "facebook",
        status: "active",
      })
      .select("id, name")
      .single();

    if (campaignError || !newCampaign) {
      console.error("Failed to create campaign:", campaignError);
      return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 });
    }
    campaign = newCampaign;
  }

  // Link images to campaign
  const { error: updateError } = await supabase
    .from("generated_images")
    .update({ campaign_id: campaign.id })
    .in("id", imageIds);

  if (updateError) {
    console.error("Failed to link images:", updateError);
    return NextResponse.json({ error: "Failed to save images to campaign" }, { status: 500 });
  }

  return NextResponse.json({
    campaign,
    images_saved: imageIds.length,
  });
}
