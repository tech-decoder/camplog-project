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

// POST /api/generated-images/[id]/rate
// Body: { rating: 1 | -1, notes?: string }
// Upserts a rating row (idempotent — changing vote up→down works)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await resolveUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: imageId } = await params;
  const body = await request.json();
  const { rating, notes } = body;

  if (rating !== 1 && rating !== -1) {
    return NextResponse.json(
      { error: "Rating must be 1 (thumbs up) or -1 (thumbs down)" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // Verify image belongs to user
  const { data: image, error: imgError } = await supabase
    .from("generated_images")
    .select("id, user_id")
    .eq("id", imageId)
    .eq("user_id", userId)
    .single();

  if (imgError || !image) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  // Upsert the rating (conflict on image_id + user_id)
  const { data, error } = await supabase
    .from("image_ratings")
    .upsert(
      { image_id: imageId, user_id: userId, rating, notes: notes ?? null },
      { onConflict: "image_id,user_id" }
    )
    .select()
    .single();

  if (error) {
    console.error("Failed to save rating:", error);
    return NextResponse.json({ error: "Failed to save rating" }, { status: 500 });
  }

  return NextResponse.json({ success: true, rating: data });
}

// DELETE /api/generated-images/[id]/rate  — remove rating
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await resolveUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: imageId } = await params;
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("image_ratings")
    .delete()
    .eq("image_id", imageId)
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json({ error: "Failed to delete rating" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
