import { NextRequest, NextResponse, after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveUserId } from "@/lib/supabase/route-helpers";
import { executeGenerationJob } from "@/lib/image-gen/generate-batch";
import { executeVideoGenerationJob } from "@/lib/video-gen/generate-batch";

export const maxDuration = 300; // 5 min for video generation


export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await resolveUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: jobId } = await params;
  const supabase = createAdminClient();

  // Load and verify the job
  const { data: job, error } = await supabase
    .from("generation_jobs")
    .select("id, user_id, status, strategy, media_type")
    .eq("id", jobId)
    .eq("user_id", userId)
    .single();

  if (error || !job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.status !== "strategy_ready") {
    return NextResponse.json(
      { error: "Job must have a strategy before execution" },
      { status: 400 }
    );
  }

  if (!job.strategy?.items?.length) {
    return NextResponse.json(
      { error: "No strategy items to generate" },
      { status: 400 }
    );
  }

  // Branch execution by media type
  if (job.media_type === "video") {
    after(() => executeVideoGenerationJob(jobId).catch(console.error));
  } else {
    after(() => executeGenerationJob(jobId).catch(console.error));
  }

  return NextResponse.json({ status: "generating", jobId });
}
