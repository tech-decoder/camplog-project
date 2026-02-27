import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_USER_ID } from "@/lib/constants";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .eq("user_id", DEFAULT_USER_ID)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();
  const body = await request.json();

  const allowedFields = ["name", "site", "platform", "status", "notes"];

  const updates: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body) {
      updates[key] = body[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("campaigns")
    .update(updates)
    .eq("id", id)
    .eq("user_id", DEFAULT_USER_ID)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If site was updated, also update all changes under this campaign
  if ("site" in body) {
    await supabase
      .from("changes")
      .update({ site: body.site, updated_at: new Date().toISOString() })
      .eq("campaign_id", id)
      .eq("user_id", DEFAULT_USER_ID);
  }

  return NextResponse.json(data);
}
