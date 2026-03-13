import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveUserId } from "@/lib/supabase/route-helpers";


interface MergeEntry {
  from: string[];
  to: string;
}

export async function POST(request: NextRequest) {
  const userId = await resolveUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const merges: MergeEntry[] = (body.merges as MergeEntry[]);

  if (!Array.isArray(merges) || merges.length === 0) {
    return NextResponse.json(
      { error: "merges array is required" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const results: { to: string; renamed: number; from: string[] }[] = [];

  for (const merge of merges) {
    if (!merge.to || !Array.isArray(merge.from) || merge.from.length === 0) {
      continue;
    }

    let totalRenamed = 0;
    const renamedFrom: string[] = [];

    for (const fromName of merge.from) {
      // Find campaigns matching the from name for this user
      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("id")
        .eq("user_id", userId)
        .ilike("name", fromName);

      if (campaigns && campaigns.length > 0) {
        const ids = campaigns.map((c) => c.id);

        // Rename campaign rows
        const { count } = await supabase
          .from("campaigns")
          .update({ name: merge.to })
          .in("id", ids)
          .eq("user_id", userId);

        totalRenamed += count || 0;
        renamedFrom.push(fromName);
      }
    }

    if (totalRenamed > 0) {
      results.push({ to: merge.to, renamed: totalRenamed, from: renamedFrom });
    }
  }

  return NextResponse.json({
    message: `Consolidated ${results.length} brand groups`,
    results,
  });
}
