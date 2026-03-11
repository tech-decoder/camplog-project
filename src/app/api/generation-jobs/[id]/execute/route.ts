import { NextRequest, NextResponse, after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUserId } from "@/lib/supabase/auth-helper";
import { getApiKeyUserId } from "@/lib/supabase/api-key-auth";
import { executeGenerationJob } from "@/lib/image-gen/generate-batch";

async function resolveUserId(request: NextRequest): Promise<string | null> {
  let userId = await getAuthUserId();
  if (!userId) {
    userId = await getApiKeyUserId(request.headers.get("authorization"));
  }
  return userId;
}

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
    .select("id, user_id, status, strategy")
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

  // Use after() to keep execution alive after response is sent
  after(() => executeGenerationJob(jobId).catch(console.error));

  return NextResponse.json({ status: "generating", jobId });
}
