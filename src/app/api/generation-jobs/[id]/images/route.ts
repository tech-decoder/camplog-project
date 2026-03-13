import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveUserId } from "@/lib/supabase/route-helpers";


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await resolveUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: jobId } = await params;
  const supabase = createAdminClient();

  // Verify job ownership
  const { data: job } = await supabase
    .from("generation_jobs")
    .select("id")
    .eq("id", jobId)
    .eq("user_id", userId)
    .single();

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const { data: images, error } = await supabase
    .from("generated_images")
    .select("*")
    .eq("job_id", jobId)
    .order("generation_index", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch images" }, { status: 500 });
  }

  return NextResponse.json({ images: images || [] });
}
