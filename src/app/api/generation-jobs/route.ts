import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveUserId } from "@/lib/supabase/route-helpers";
import { CreateJobRequest } from "@/lib/types/generation-jobs";


export async function POST(request: NextRequest) {
  const userId = await resolveUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: CreateJobRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.brand_name?.trim()) {
    return NextResponse.json({ error: "Brand name is required" }, { status: 400 });
  }
  if (!body.mode) {
    return NextResponse.json({ error: "Mode is required" }, { status: 400 });
  }
  const isVideo = body.media_type === "video";

  if (!isVideo && !body.model) {
    return NextResponse.json({ error: "Model is required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  let formatSplit;
  let totalCount;

  if (isVideo) {
    const vfs = body.video_format_split || { landscape: 2, portrait: 1 };
    formatSplit = { square: vfs.landscape, portrait: vfs.portrait };
    totalCount = body.total_count || vfs.landscape + vfs.portrait;
  } else {
    formatSplit = body.format_split || { square: 6, portrait: 6 };
    totalCount = body.total_count || formatSplit.square + formatSplit.portrait;
  }

  const { data: job, error } = await supabase
    .from("generation_jobs")
    .insert({
      user_id: userId,
      campaign_id: body.campaign_id || null,
      mode: isVideo ? "ai_takeover" : body.mode,
      brand_name: body.brand_name.trim(),
      model: isVideo ? "veo-3-fast" : body.model,
      quality: "premium",
      language: body.language || "English",
      total_count: totalCount,
      format_split: formatSplit,
      reference_images: body.reference_images || [],
      status: "pending",
      media_type: isVideo ? "video" : "image",
      video_duration: isVideo ? (body.video_duration || 4) : null,
      video_model: isVideo ? "veo-3-fast" : null,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create generation job:", error);
    return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
  }

  return NextResponse.json({ job }, { status: 201 });
}

export async function GET(request: NextRequest) {
  const userId = await resolveUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();

  const { data: jobs, error } = await supabase
    .from("generation_jobs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }

  return NextResponse.json({ jobs: jobs || [] });
}
