import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUserId } from "@/lib/supabase/auth-helper";
import { getApiKeyUserId } from "@/lib/supabase/api-key-auth";
import { CreateJobRequest } from "@/lib/types/generation-jobs";

async function resolveUserId(request: NextRequest): Promise<string | null> {
  let userId = await getAuthUserId();
  if (!userId) {
    userId = await getApiKeyUserId(request.headers.get("authorization"));
  }
  return userId;
}

export async function POST(request: NextRequest) {
  const userId = await resolveUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: CreateJobRequest = await request.json();

  if (!body.brand_name?.trim()) {
    return NextResponse.json({ error: "Brand name is required" }, { status: 400 });
  }
  if (!body.mode) {
    return NextResponse.json({ error: "Mode is required" }, { status: 400 });
  }
  if (!body.model) {
    return NextResponse.json({ error: "Model is required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const formatSplit = body.format_split || { square: 6, portrait: 6 };
  const totalCount = body.total_count || formatSplit.square + formatSplit.portrait;

  const { data: job, error } = await supabase
    .from("generation_jobs")
    .insert({
      user_id: userId,
      campaign_id: body.campaign_id || null,
      mode: body.mode,
      brand_name: body.brand_name.trim(),
      model: body.model,
      quality: "premium",
      language: body.language || "English",
      total_count: totalCount,
      format_split: formatSplit,
      reference_images: body.reference_images || [],
      status: "pending",
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
