import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUserId } from "@/lib/supabase/auth-helper";
import { getApiKeyUserId } from "@/lib/supabase/api-key-auth";

async function resolveUserId(request: NextRequest): Promise<string | null> {
  let userId = await getAuthUserId();
  if (!userId) {
    userId = await getApiKeyUserId(request.headers.get("authorization"));
  }
  return userId;
}

/**
 * GET /api/campaigns/by-name?name=KFC
 * Returns aggregated campaign data across all campaign rows matching the name.
 */
export async function GET(request: NextRequest) {
  const userId = await resolveUserId(request);
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
  const userId = await resolveUserId(request);
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

  // Verify campaign exists first
  const { data: existing } = await supabase
    .from("campaigns")
    .select("id")
    .eq("user_id", userId)
    .ilike("name", name)
    .limit(1);

  if (!existing || existing.length === 0) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
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

/**
 * POST /api/campaigns/by-name?name=KFC
 * Add ad copy variants to a campaign by name. Auto-creates the campaign if it doesn't exist.
 * Body: { headlines?: string[], primary_texts?: string[], descriptions?: string[], site?: string }
 */
export async function POST(request: NextRequest) {
  const userId = await resolveUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const name = new URL(request.url).searchParams.get("name");

  if (!name) {
    return NextResponse.json({ error: "name parameter required" }, { status: 400 });
  }

  const body = await request.json();
  const { headlines, primary_texts, descriptions, site } = body as {
    headlines?: string[];
    primary_texts?: string[];
    descriptions?: string[];
    site?: string;
  };

  // Find or create campaign
  let campaignId: string;

  const { data: existing } = await supabase
    .from("campaigns")
    .select("id")
    .eq("user_id", userId)
    .ilike("name", name)
    .limit(1)
    .single();

  if (existing) {
    campaignId = existing.id;
  } else {
    const { data: created, error: createError } = await supabase
      .from("campaigns")
      .insert({
        user_id: userId,
        name,
        site: site || null,
        platform: "facebook",
      })
      .select("id")
      .single();

    if (createError || !created) {
      return NextResponse.json({ error: createError?.message || "Failed to create campaign" }, { status: 500 });
    }
    campaignId = created.id;
  }

  // Build variant inserts
  const inserts: Array<{
    user_id: string;
    campaign_id: string;
    field_type: string;
    content: string;
    sort_order: number;
  }> = [];

  // Get current max sort_order per field_type
  const { data: existingVariants } = await supabase
    .from("ad_copy_variants")
    .select("field_type, sort_order")
    .eq("campaign_id", campaignId)
    .eq("user_id", userId)
    .order("sort_order", { ascending: false });

  const maxOrder: Record<string, number> = {};
  if (existingVariants) {
    for (const row of existingVariants) {
      if (!(row.field_type in maxOrder)) {
        maxOrder[row.field_type] = row.sort_order;
      }
    }
  }

  for (const [fieldType, items] of [
    ["headline", headlines],
    ["primary_text", primary_texts],
    ["description", descriptions],
  ] as const) {
    if (items?.length) {
      let order = (maxOrder[fieldType] ?? -1) + 1;
      for (const content of items) {
        if (content.trim()) {
          inserts.push({
            user_id: userId,
            campaign_id: campaignId,
            field_type: fieldType,
            content: content.trim(),
            sort_order: order++,
          });
        }
      }
    }
  }

  if (inserts.length === 0) {
    return NextResponse.json({ error: "No variants provided" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("ad_copy_variants")
    .insert(inserts)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ campaign_id: campaignId, variants: data });
}

/**
 * DELETE /api/campaigns/by-name?name=KFC
 * Delete all campaign rows matching a name, plus their variants.
 */
export async function DELETE(request: NextRequest) {
  const userId = await resolveUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const name = new URL(request.url).searchParams.get("name");
  if (!name) return NextResponse.json({ error: "name parameter required" }, { status: 400 });

  // Find all campaign rows matching this name
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id")
    .eq("user_id", userId)
    .ilike("name", name);

  if (!campaigns?.length) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const ids = campaigns.map((c) => c.id);

  // Delete variants first, then campaigns
  await supabase.from("ad_copy_variants").delete().in("campaign_id", ids).eq("user_id", userId);
  await supabase.from("campaigns").delete().in("id", ids).eq("user_id", userId);

  return NextResponse.json({ success: true, deleted: ids.length });
}
