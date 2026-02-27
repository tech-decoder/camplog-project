import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUserId } from "@/lib/supabase/auth-helper";

export async function GET(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");

  let query = supabase
    .from("revenue_goals")
    .select("*")
    .eq("user_id", userId)
    .order("month", { ascending: false });

  if (month) {
    query = query.eq("month", `${month}-01`);
  }

  const { data, error } = await query.limit(12);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ goals: data || [] });
}

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const body = await request.json();

  const { month, target_revenue, target_profit, target_margin_pct, target_fb_spend, notes } = body;

  if (!month) {
    return NextResponse.json({ error: "Month is required" }, { status: 400 });
  }

  const monthDate = `${month}-01`;

  // Upsert: create or update goal for the month
  const { data, error } = await supabase
    .from("revenue_goals")
    .upsert(
      {
        user_id: userId,
        month: monthDate,
        target_revenue: target_revenue || null,
        target_profit: target_profit || null,
        target_margin_pct: target_margin_pct || null,
        target_fb_spend: target_fb_spend || null,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,month" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ goal: data }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const body = await request.json();

  const { id, actual_revenue, actual_fb_spend, actual_profit, actual_margin_pct } = body;

  if (!id) {
    return NextResponse.json({ error: "Goal ID is required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (actual_revenue !== undefined) updates.actual_revenue = actual_revenue;
  if (actual_fb_spend !== undefined) updates.actual_fb_spend = actual_fb_spend;
  if (actual_profit !== undefined) updates.actual_profit = actual_profit;
  if (actual_margin_pct !== undefined) updates.actual_margin_pct = actual_margin_pct;

  const { data, error } = await supabase
    .from("revenue_goals")
    .update(updates)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ goal: data });
}
