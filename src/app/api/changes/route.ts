import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUserId } from "@/lib/supabase/auth-helper";

export async function GET(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { searchParams } = new URL(request.url);

  const limit = parseInt(searchParams.get("limit") || "50");
  const page = parseInt(searchParams.get("page") || "1");
  const campaign = searchParams.get("campaign");
  const actionType = searchParams.get("action_type");
  const reviewStatus = searchParams.get("review_status");
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");
  const search = searchParams.get("search");

  let query = supabase
    .from("changes")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (campaign) {
    query = query.ilike("campaign_name", `%${campaign}%`);
  }
  if (actionType) {
    query = query.eq("action_type", actionType);
  }
  if (dateFrom) {
    query = query.gte("change_date", dateFrom);
  }
  if (dateTo) {
    query = query.lte("change_date", dateTo);
  }
  if (search) {
    query = query.or(
      `campaign_name.ilike.%${search}%,description.ilike.%${search}%`
    );
  }
  if (reviewStatus === "pending") {
    query = query
      .not("impact_review_due", "is", null)
      .is("impact_reviewed_at", null);
  } else if (reviewStatus === "reviewed") {
    query = query.not("impact_reviewed_at", "is", null);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    changes: data || [],
    total: count || 0,
    page,
    pages: Math.ceil((count || 0) / limit),
  });
}

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from("changes")
    .insert(body)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
