import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUserId } from "@/lib/supabase/auth-helper";

/**
 * GET /api/campaigns/by-name?name=KFC
 * Returns aggregated campaign data across all campaign rows matching the name.
 */
export async function GET(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const name = new URL(request.url).searchParams.get("name");

  if (!name) {
    return NextResponse.json({ error: "name parameter required" }, { status: 400 });
  }

  // Find all campaign rows matching this name (case-insensitive)
  const { data: campaigns, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("user_id", userId)
    .ilike("name", name);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!campaigns || campaigns.length === 0) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const campaignIds = campaigns.map((c) => c.id);

  // Aggregate sites, pick earliest created_at, most recent status
  const sites: string[] = [];
  let earliestCreated = campaigns[0].created_at;
  let latestUpdated = campaigns[0].updated_at;
  let latestStatus = campaigns[0].status;

  for (const c of campaigns) {
    if (c.site && !sites.includes(c.site)) sites.push(c.site);
    if (c.created_at < earliestCreated) earliestCreated = c.created_at;
    if (c.updated_at > latestUpdated) {
      latestUpdated = c.updated_at;
      latestStatus = c.status;
    }
  }

  // Count changes
  const { count } = await supabase
    .from("changes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("campaign_id", campaignIds);

  return NextResponse.json({
    name: campaigns[0].name,
    campaign_ids: campaignIds,
    primary_id: campaignIds[0], // used for variants storage
    sites,
    platform: campaigns[0].platform,
    status: latestStatus,
    created_at: earliestCreated,
    updated_at: latestUpdated,
    change_count: count || 0,
  });
}

/**
 * PATCH /api/campaigns/by-name?name=KFC
 * Rename all campaign rows matching a name.
 */
export async function PATCH(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const name = new URL(request.url).searchParams.get("name");
  const body = await request.json();

  if (!name) {
    return NextResponse.json({ error: "name parameter required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  const allowed = ["name", "status", "notes"];
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from("campaigns")
    .update(updates)
    .eq("user_id", userId)
    .ilike("name", name);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
