import { NextRequest, NextResponse, after } from "next/server";
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
  const campaignId = request.nextUrl.searchParams.get("campaign_id");

  let query = supabase
    .from("generated_images")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (campaignId) {
    query = query.eq("campaign_id", campaignId);
  }

  const { data: images, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ images: images || [] });
}

export async function DELETE(request: NextRequest) {
  const userId = await resolveUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const body = await request.json();
  const { imageId, imageIds } = body;

  // Helper: extract storage path from URL
  function storagePathFrom(imageUrl: string): string | null {
    try {
      const u = new URL(imageUrl);
      const p = u.pathname.split("/generated-images/")[1];
      return p ? decodeURIComponent(p) : null;
    } catch {
      return null;
    }
  }

  // ── Batch delete: array of IDs ────────────────────────────────────────────
  if (imageIds && Array.isArray(imageIds)) {
    if (imageIds.length === 0) {
      return NextResponse.json({ deleted: 0 });
    }

    // Fetch URLs + delete DB in parallel — ownership enforced via user_id filter
    const [{ data: images }] = await Promise.all([
      supabase
        .from("generated_images")
        .select("id, image_url")
        .in("id", imageIds)
        .eq("user_id", userId),
      supabase
        .from("generated_images")
        .delete()
        .in("id", imageIds)
        .eq("user_id", userId),
    ]);

    const deletedCount = images?.length ?? imageIds.length;

    // Fire-and-forget storage cleanup after response is sent
    if (images && images.length > 0) {
      const paths = images
        .map((img: { id: string; image_url: string }) =>
          storagePathFrom(img.image_url)
        )
        .filter(Boolean) as string[];

      if (paths.length > 0) {
        after(async () => {
          await supabase.storage.from("generated-images").remove(paths);
        });
      }
    }

    return NextResponse.json({ deleted: deletedCount });
  }

  // ── Single delete: legacy { imageId } ─────────────────────────────────────
  if (!imageId) {
    return NextResponse.json(
      { error: "imageId or imageIds is required" },
      { status: 400 }
    );
  }

  // Fetch URL + delete DB in parallel
  const [{ data: image }] = await Promise.all([
    supabase
      .from("generated_images")
      .select("id, image_url")
      .eq("id", imageId)
      .eq("user_id", userId)
      .single(),
    supabase
      .from("generated_images")
      .delete()
      .eq("id", imageId)
      .eq("user_id", userId),
  ]);

  // Fire-and-forget storage cleanup
  const storagePath = image ? storagePathFrom(image.image_url) : null;
  if (storagePath) {
    after(async () => {
      await supabase.storage.from("generated-images").remove([storagePath]);
    });
  }

  return NextResponse.json({ success: true });
}
