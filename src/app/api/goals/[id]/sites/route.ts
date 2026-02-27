import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_USER_ID } from "@/lib/constants";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: goalId } = await params;
  const supabase = createAdminClient();

  // Get the goal to know the month
  const { data: goal } = await supabase
    .from("revenue_goals")
    .select("month")
    .eq("id", goalId)
    .eq("user_id", DEFAULT_USER_ID)
    .single();

  if (!goal) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("site_monthly_revenue")
    .select("*")
    .eq("user_id", DEFAULT_USER_ID)
    .eq("month", goal.month)
    .order("revenue", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sites: data || [] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: goalId } = await params;
  const supabase = createAdminClient();
  const body = await request.json();

  // Get goal month
  const { data: goal } = await supabase
    .from("revenue_goals")
    .select("month")
    .eq("id", goalId)
    .eq("user_id", DEFAULT_USER_ID)
    .single();

  if (!goal) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  const { sites } = body as {
    sites: Array<{
      site: string;
      revenue: number;
      fb_spend: number;
      fb_revenue?: number;
      profit?: number;
      margin_pct?: number;
      source?: string;
    }>;
  };

  if (!sites || !Array.isArray(sites)) {
    return NextResponse.json({ error: "Sites array is required" }, { status: 400 });
  }

  const results = [];

  for (const siteData of sites) {
    const profit =
      siteData.profit ?? siteData.revenue - siteData.fb_spend;
    const margin =
      siteData.margin_pct ??
      (siteData.revenue > 0
        ? ((siteData.revenue - siteData.fb_spend) / siteData.revenue) * 100
        : 0);

    const { data, error } = await supabase
      .from("site_monthly_revenue")
      .upsert(
        {
          user_id: DEFAULT_USER_ID,
          goal_id: goalId,
          site: siteData.site,
          month: goal.month,
          revenue: siteData.revenue,
          fb_spend: siteData.fb_spend,
          fb_revenue: siteData.fb_revenue ?? siteData.fb_spend,
          profit,
          margin_pct: Math.round(margin * 100) / 100,
          source: siteData.source || "manual",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,site,month" }
      )
      .select()
      .single();

    if (data) results.push(data);
    if (error) console.error("Failed to upsert site:", siteData.site, error.message);
  }

  // Recalculate goal actuals from site data
  const totalRevenue = results.reduce((s, r) => s + Number(r.revenue), 0);
  const totalSpend = results.reduce((s, r) => s + Number(r.fb_spend), 0);
  const totalProfit = results.reduce((s, r) => s + Number(r.profit), 0);
  const totalMargin = totalRevenue > 0 ? ((totalRevenue - totalSpend) / totalRevenue) * 100 : 0;

  await supabase
    .from("revenue_goals")
    .update({
      actual_revenue: Math.round(totalRevenue * 100) / 100,
      actual_fb_spend: Math.round(totalSpend * 100) / 100,
      actual_profit: Math.round(totalProfit * 100) / 100,
      actual_margin_pct: Math.round(totalMargin * 100) / 100,
      updated_at: new Date().toISOString(),
    })
    .eq("id", goalId);

  return NextResponse.json({ sites: results });
}
