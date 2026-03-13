import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveUserId } from "@/lib/supabase/route-helpers";


export async function POST(request: NextRequest) {
  const userId = await resolveUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const files = formData.getAll("files") as File[];

  if (!files.length) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  if (files.length > 3) {
    return NextResponse.json({ error: "Maximum 3 reference images allowed" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const uploadedUrls: string[] = [];

  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop() || "png";
    const fileId = crypto.randomUUID();
    const storagePath = `${userId}/${fileId}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("reference-images")
      .upload(storagePath, buffer, {
        contentType: file.type || "image/png",
      });

    if (uploadError) {
      console.error("Reference image upload failed:", uploadError);
      continue;
    }

    // For reference images (private bucket), generate a signed URL
    const { data: signedData } = await supabase.storage
      .from("reference-images")
      .createSignedUrl(storagePath, 60 * 60 * 24); // 24 hour expiry

    if (signedData?.signedUrl) {
      uploadedUrls.push(signedData.signedUrl);
    }
  }

  if (!uploadedUrls.length) {
    return NextResponse.json({ error: "Failed to upload images" }, { status: 500 });
  }

  return NextResponse.json({ urls: uploadedUrls }, { status: 201 });
}
