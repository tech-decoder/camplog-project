import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUserId } from "@/lib/supabase/auth-helper";
import sharp from "sharp";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const AVATAR_SIZE = 256;

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Invalid file type. Accepted: JPEG, PNG, WebP, GIF" },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 5MB" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Resize to 256x256 center-crop and convert to WebP
  const processed = await sharp(buffer)
    .resize(AVATAR_SIZE, AVATAR_SIZE, {
      fit: "cover",
      position: "centre",
    })
    .webp({ quality: 80 })
    .toBuffer();

  const supabase = createAdminClient();
  const storagePath = `${userId}/avatar.webp`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(storagePath, processed, {
      contentType: "image/webp",
      upsert: true,
    });

  if (uploadError) {
    console.error("Avatar upload failed:", uploadError);
    return NextResponse.json(
      { error: "Failed to upload avatar" },
      { status: 500 }
    );
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(storagePath);

  // Cache-busting timestamp so browser fetches new image
  const avatarUrl = `${publicUrl}?v=${Date.now()}`;

  const { error: dbError } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (dbError) {
    console.error("Profile avatar_url update failed:", dbError);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }

  return NextResponse.json({ avatar_url: avatarUrl });
}

export async function DELETE() {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const storagePath = `${userId}/avatar.webp`;

  // Remove from storage (ignore error if file doesn't exist)
  await supabase.storage.from("avatars").remove([storagePath]);

  const { error: dbError } = await supabase
    .from("profiles")
    .update({ avatar_url: null, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (dbError) {
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }

  return NextResponse.json({ avatar_url: null });
}
