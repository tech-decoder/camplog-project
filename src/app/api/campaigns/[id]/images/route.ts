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

  const { data: images, error } = await supabase
    .from("generated_images")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ images: images || [] });
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
  const { imageId } = body;

  if (!imageId) {
    return NextResponse.json(
      { error: "imageId is required" },
      { status: 400 }
    );
  }

  // Verify ownership
  const { data: image } = await supabase
    .from("generated_images")
    .select("id, image_url")
    .eq("id", imageId)
    .eq("campaign_id", campaignId)
    .eq("user_id", userId)
    .single();

  if (!image) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  // Extract storage path from URL and delete from storage
  const url = new URL(image.image_url);
  const storagePath = url.pathname.split("/generated-images/")[1];
  if (storagePath) {
    await supabase.storage
      .from("generated-images")
      .remove([decodeURIComponent(storagePath)]);
  }

  // Delete DB record
  await supabase.from("generated_images").delete().eq("id", imageId);

  return NextResponse.json({ success: true });
}
