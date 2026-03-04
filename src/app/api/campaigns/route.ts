import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUserId } from "@/lib/supabase/auth-helper";

export async function GET(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const site = searchParams.get("site") || "";

  // Fetch all campaigns for the user
  let query = supabase
    .from("campaigns")
    .select("id, name, site, platform, status, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  const { data: campaigns, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch change counts + last change dates
  const campaignIds = (campaigns || []).map((c) => c.id);
  let changeRows: { campaign_id: string; change_date: string; site: string | null }[] = [];

  if (campaignIds.length > 0) {
    const { data } = await supabase
      .from("changes")
      .select("campaign_id, change_date, site")
      .eq("user_id", userId)
      .in("campaign_id", campaignIds)
      .order("change_date", { ascending: false });
    changeRows = data || [];
  }

  // Group campaigns by name (case-insensitive)
  const grouped = new Map<
    string,
    {
      name: string;
      campaign_ids: string[];
      sites: string[];
      status: string;
      platform: string;
      created_at: string;
      updated_at: string;
      change_count: number;
      last_change_date: string | null;
    }
  >();

  for (const c of campaigns || []) {
    const key = c.name.toLowerCase().trim();
    const existing = grouped.get(key);
    if (existing) {
      existing.campaign_ids.push(c.id);
      if (c.site && !existing.sites.includes(c.site)) {
        existing.sites.push(c.site);
      }
      // Keep the most recent updated_at
      if (c.updated_at > existing.updated_at) {
        existing.updated_at = c.updated_at;
        existing.status = c.status;
      }
      // Keep the earliest created_at
      if (c.created_at < existing.created_at) {
        existing.created_at = c.created_at;
      }
    } else {
      grouped.set(key, {
        name: c.name,
        campaign_ids: [c.id],
        sites: c.site ? [c.site] : [],
        status: c.status,
        platform: c.platform,
        created_at: c.created_at,
        updated_at: c.updated_at,
        change_count: 0,
        last_change_date: null,
      });
    }
  }

  // Aggregate change counts and last dates per group
  for (const row of changeRows) {
    for (const [, group] of grouped) {
      if (group.campaign_ids.includes(row.campaign_id)) {
        group.change_count++;
        if (!group.last_change_date || row.change_date > group.last_change_date) {
          group.last_change_date = row.change_date;
        }
        // Capture sites from changes too (changes may have site even if campaign row doesn't)
        if (row.site && !group.sites.includes(row.site)) {
          group.sites.push(row.site);
        }
        break;
      }
    }
  }

  // Convert to array, apply site filter, sort by most recent activity
  let result = Array.from(grouped.values());

  if (site) {
    result = result.filter((g) => g.sites.includes(site));
  }

  result.sort((a, b) => {
    const dateA = a.last_change_date || a.updated_at;
    const dateB = b.last_change_date || b.updated_at;
    return dateB.localeCompare(dateA);
  });

  return NextResponse.json({ campaigns: result });
}
