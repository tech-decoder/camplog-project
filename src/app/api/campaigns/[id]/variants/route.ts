import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveUserId } from "@/lib/supabase/route-helpers";


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await resolveUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createAdminClient();

  // Verify campaign ownership
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const { data: variants, error } = await supabase
    .from("ad_copy_variants")
    .select("*")
    .eq("campaign_id", id)
    .eq("user_id", userId)
    .order("field_type")
    .order("sort_order");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ variants: variants || [] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await resolveUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createAdminClient();

  // Verify campaign ownership
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  let body: { headlines?: string[]; primary_texts?: string[]; descriptions?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { headlines, primary_texts, descriptions } = body as {
    headlines?: string[];
    primary_texts?: string[];
    descriptions?: string[];
  };

  const inserts: Array<{
    user_id: string;
    campaign_id: string;
    field_type: string;
    content: string;
    sort_order: number;
  }> = [];

  // Get current max sort_order per field_type
  const { data: existing } = await supabase
    .from("ad_copy_variants")
    .select("field_type, sort_order")
    .eq("campaign_id", id)
    .eq("user_id", userId)
    .order("sort_order", { ascending: false });

  const maxOrder: Record<string, number> = {};
  if (existing) {
    for (const row of existing) {
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
            campaign_id: id,
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

  return NextResponse.json({ variants: data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await resolveUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createAdminClient();

  let body: { ids: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { ids } = body;

  if (!ids?.length) {
    return NextResponse.json({ error: "No variant IDs provided" }, { status: 400 });
  }

  const { error } = await supabase
    .from("ad_copy_variants")
    .delete()
    .in("id", ids)
    .eq("campaign_id", id)
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
