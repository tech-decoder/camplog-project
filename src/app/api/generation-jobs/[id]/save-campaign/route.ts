import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveUserId } from "@/lib/supabase/route-helpers";


export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await resolveUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: jobId } = await params;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const campaignName = (body.name as string | undefined)?.trim();

  if (!campaignName) {
    return NextResponse.json({ error: "Campaign name is required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Verify job belongs to user
  const { data: job, error: jobError } = await supabase
    .from("generation_jobs")
    .select("id, user_id, brand_name, campaign_id")
    .eq("id", jobId)
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.user_id !== userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (job.campaign_id) {
    return NextResponse.json({ error: "Job already saved to a campaign" }, { status: 409 });
  }

  // Check if campaign with this name already exists (case-insensitive)
  const { data: existingCampaign } = await supabase
    .from("campaigns")
    .select("id, name")
    .eq("user_id", userId)
    .ilike("name", campaignName)
    .limit(1)
    .single();

  let campaign: { id: string; name: string };
  let isAppend = false;

  if (existingCampaign) {
    // Append to existing campaign
    campaign = existingCampaign;
    isAppend = true;
  } else {
    // Create new campaign
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

  // Link job to campaign
  const { error: jobUpdateError } = await supabase
    .from("generation_jobs")
    .update({ campaign_id: campaign.id })
    .eq("id", jobId);

  if (jobUpdateError) {
    console.error("Failed to link job:", jobUpdateError);
  }

  // Link all images from this job to the campaign
  const { error: imgUpdateError } = await supabase
    .from("generated_images")
    .update({ campaign_id: campaign.id })
    .eq("job_id", jobId);

  if (imgUpdateError) {
    console.error("Failed to link images:", imgUpdateError);
    return NextResponse.json({ error: "Failed to link images to campaign" }, { status: 500 });
  }

  // Link all videos from this job to the campaign
  const { error: vidUpdateError } = await supabase
    .from("generated_videos")
    .update({ campaign_id: campaign.id })
    .eq("job_id", jobId);

  if (vidUpdateError) {
    console.error("Failed to link videos:", vidUpdateError);
    return NextResponse.json({ error: "Failed to link videos to campaign" }, { status: 500 });
  }

  // Verify images were actually linked
  const { count: imageCount } = await supabase
    .from("generated_images")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaign.id)
    .eq("job_id", jobId);

  const { count: videoCount } = await supabase
    .from("generated_videos")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaign.id)
    .eq("job_id", jobId);

  return NextResponse.json({ campaign, appended: isAppend, images_linked: imageCount || 0, videos_linked: videoCount || 0 }, { status: isAppend ? 200 : 201 });
}
