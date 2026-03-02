import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUserId } from "@/lib/supabase/auth-helper";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: goalId } = await params;
  const supabase = createAdminClient();

  // Get the goal to know the month
  const { data: goal } = await supabase
    .from("revenue_goals")
    .select("month")
    .eq("id", goalId)
    .eq("user_id", userId)
    .single();

  if (!goal) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("site_monthly_revenue")
    .select("*")
    .eq("user_id", userId)
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
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: goalId } = await params;
  const supabase = createAdminClient();
  const body = await request.json();

  // Get goal month
  const { data: goal } = await supabase
    .from("revenue_goals")
    .select("month")
    .eq("id", goalId)
    .eq("user_id", userId)
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
    const fbRev = siteData.fb_revenue ?? siteData.revenue;
    const profit =
      siteData.profit ?? fbRev - siteData.fb_spend;
    // Use FBM (FB Margin): (FB Revenue - FB Spend) / FB Revenue
    const fbm =
      siteData.margin_pct ??
      (fbRev > 0
        ? ((fbRev - siteData.fb_spend) / fbRev) * 100
        : 0);

    const { data, error } = await supabase
      .from("site_monthly_revenue")
      .upsert(
        {
          user_id: userId,
          goal_id: goalId,
          site: siteData.site,
          month: goal.month,
          revenue: siteData.revenue,
          fb_spend: siteData.fb_spend,
          fb_revenue: siteData.fb_revenue ?? siteData.fb_spend,
          profit,
          margin_pct: Math.round(fbm * 100) / 100,
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

  // Recalculate goal actuals from ALL site data for this month (not just current request)
  const { data: allSites } = await supabase
    .from("site_monthly_revenue")
    .select("revenue, fb_spend, fb_revenue, profit")
    .eq("user_id", userId)
    .eq("month", goal.month);

  const allSiteRows = allSites || results;
  const totalRevenue = allSiteRows.reduce((s, r) => s + Number(r.revenue), 0);
  const totalSpend = allSiteRows.reduce((s, r) => s + Number(r.fb_spend), 0);
  const totalFbRev = allSiteRows.reduce((s, r) => s + Number(r.fb_revenue || r.revenue), 0);
  const totalProfit = allSiteRows.reduce((s, r) => s + Number(r.profit), 0);
  // FBM = total profit / total FB revenue (uses stored extracted profit values)
  const totalFbm = totalFbRev > 0 ? (totalProfit / totalFbRev) * 100 : 0;

  await supabase
    .from("revenue_goals")
    .update({
      actual_revenue: Math.round(totalRevenue * 100) / 100,
      actual_fb_spend: Math.round(totalSpend * 100) / 100,
      actual_profit: Math.round(totalProfit * 100) / 100,
      actual_margin_pct: Math.round(totalFbm * 100) / 100,
      updated_at: new Date().toISOString(),
    })
    .eq("id", goalId);

  return NextResponse.json({ sites: results });
}
