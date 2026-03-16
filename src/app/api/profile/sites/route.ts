import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUserId } from "@/lib/supabase/auth-helper";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("user_sites")
    .select("id, site_abbreviation, site_name, site_url")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  return NextResponse.json({
    sites: (data || []).map((s) => ({
      id: s.id,
      abbreviation: s.site_abbreviation,
      name: s.site_name || s.site_abbreviation,
      url: s.site_url || null,
    })),
  });
}

function generateAbbr(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 4);
}

export async function PUT(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();

  let body: {
    sites: { name: string; url?: string; abbreviation: string }[];
    renames?: { old_abbreviation: string; new_abbreviation: string }[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { sites, renames = [] } = body;

  if (!Array.isArray(sites)) {
    return NextResponse.json({ error: "sites must be an array" }, { status: 400 });
  }

  // Normalize and deduplicate abbreviations before hitting the DB.
  // The unique index on (user_id, site_abbreviation) will reject duplicates,
  // so we resolve collisions here by appending a counter.
  const seen = new Set<string>();
  const normalizedSites = sites.map((s) => {
    let abbr = (s.abbreviation ?? "").trim().toUpperCase().slice(0, 10);
    if (!abbr) abbr = generateAbbr(s.name);

    let finalAbbr = abbr;
    let counter = 2;
    while (seen.has(finalAbbr)) {
      finalAbbr = (abbr.slice(0, 8) + counter).toUpperCase();
      counter++;
    }
    seen.add(finalAbbr);

    return {
      user_id: userId,
      site_abbreviation: finalAbbr,
      site_name: s.name.trim().slice(0, 100),
      site_url: s.url?.trim() || null,
    };
  });

  // Step 1: Fetch existing sites so we know which IDs to delete afterwards.
  // We do this BEFORE any write so we have an accurate snapshot.
  const { data: existingSites, error: fetchError } = await supabase
    .from("user_sites")
    .select("id, site_abbreviation")
    .eq("user_id", userId);

  if (fetchError) {
    console.error("[sites] FETCH existing failed:", fetchError);
    return NextResponse.json(
      { error: `Could not read existing sites: ${fetchError.message}` },
      { status: 500 }
    );
  }

  // Step 2: Upsert new/updated sites.
  // Using UPSERT (not INSERT) means if a row with the same abbreviation already
  // exists it is updated in-place — no unique-constraint failure, and crucially
  // the old data is never deleted until we know the new data was written.
  if (normalizedSites.length > 0) {
    const { error: upsertError } = await supabase
      .from("user_sites")
      .upsert(normalizedSites, { onConflict: "user_id,site_abbreviation" });

    if (upsertError) {
      console.error("[sites] UPSERT failed:", upsertError);
      // Old data is still intact — safe to surface the real error.
      return NextResponse.json(
        {
          error: `Failed to save sites: ${upsertError.message} (code: ${upsertError.code ?? "unknown"})`,
        },
        { status: 500 }
      );
    }
  }

  // Step 2b: Cascade abbreviation renames into site_monthly_revenue.
  // When a user renames "M2" → "MOD", their stored revenue rows keep the old key "M2"
  // and become invisible in Goals. We update them here so historical data is preserved.
  for (const { old_abbreviation, new_abbreviation } of renames) {
    if (!old_abbreviation || !new_abbreviation || old_abbreviation === new_abbreviation) continue;
    const { error: renameError } = await supabase
      .from("site_monthly_revenue")
      .update({ site: new_abbreviation })
      .eq("user_id", userId)
      .eq("site", old_abbreviation);
    if (renameError) {
      // Non-fatal: upsert succeeded, just log the cascade failure
      console.error(`[sites] rename cascade ${old_abbreviation}→${new_abbreviation} failed:`, renameError.message);
    }
  }

  // Step 3: Delete rows that are no longer in the submitted list.
  // We identify them by the abbreviations present in the old snapshot
  // but absent from the new list.
  const newAbbrs = new Set(normalizedSites.map((s) => s.site_abbreviation));
  const idsToDelete = (existingSites ?? [])
    .filter((s) => !newAbbrs.has(s.site_abbreviation))
    .map((s) => s.id);

  if (idsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from("user_sites")
      .delete()
      .in("id", idsToDelete);

    if (deleteError) {
      // New sites are already saved — this is a non-fatal cleanup failure.
      console.error("[sites] DELETE old sites failed:", deleteError);
      return NextResponse.json(
        {
          success: true,
          warning: `Sites saved, but ${idsToDelete.length} old entr${idsToDelete.length === 1 ? "y" : "ies"} could not be removed: ${deleteError.message}`,
        }
      );
    }
  }

  // Edge case: user cleared all sites (normalizedSites is empty).
  // Nothing was upserted, so we must explicitly delete everything.
  if (normalizedSites.length === 0 && (existingSites ?? []).length > 0) {
    const { error: deleteAllError } = await supabase
      .from("user_sites")
      .delete()
      .eq("user_id", userId);

    if (deleteAllError) {
      console.error("[sites] DELETE all failed:", deleteAllError);
      return NextResponse.json(
        { error: `Failed to clear sites: ${deleteAllError.message}` },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true });
}
