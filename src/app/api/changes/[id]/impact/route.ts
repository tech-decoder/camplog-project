import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateImpactAssessment } from "@/lib/openai/generate-impact";
import { Change, CampaignMetrics } from "@/lib/types/changes";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();
  const body = await request.json();
  const postMetrics: CampaignMetrics = body.post_metrics;

  // Fetch the existing change
  const { data: change, error: fetchError } = await supabase
    .from("changes")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !change) {
    return NextResponse.json({ error: "Change not found" }, { status: 404 });
  }

  // Generate impact assessment using AI
  const assessment = await generateImpactAssessment(
    change as Change,
    postMetrics
  );

  // Update the change with post metrics and assessment
  const { data: updated, error: updateError } = await supabase
    .from("changes")
    .update({
      post_metrics: postMetrics,
      impact_summary: assessment.impact_summary,
      impact_verdict: assessment.impact_verdict,
      impact_reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json(updated);
}
