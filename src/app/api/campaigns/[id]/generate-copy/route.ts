import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUserId } from "@/lib/supabase/auth-helper";
import { getApiKeyUserId } from "@/lib/supabase/api-key-auth";
import { generateAdCopy } from "@/lib/claude/generate-ad-copy";
import { AdCopyFieldType } from "@/lib/types/ad-copies";

async function resolveUserId(request: NextRequest): Promise<string | null> {
  let userId = await getAuthUserId();
  if (!userId) {
    userId = await getApiKeyUserId(request.headers.get("authorization"));
  }
  return userId;
}

const VALID_FIELD_TYPES: AdCopyFieldType[] = [
  "headline",
  "primary_text",
  "description",
];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await resolveUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: campaignId } = await params;
  const supabase = createAdminClient();

  // Verify campaign ownership
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, name")
    .eq("id", campaignId)
    .eq("user_id", userId)
    .single();

  if (!campaign) {
    return NextResponse.json(
      { error: "Campaign not found" },
      { status: 404 }
    );
  }

  const body = await request.json();
  const { field_type, count = 5 } = body;

  if (!field_type || !VALID_FIELD_TYPES.includes(field_type)) {
    return NextResponse.json(
      { error: "field_type must be one of: headline, primary_text, description" },
      { status: 400 }
    );
  }

  // Fetch existing variants for context
  const { data: existingVariants } = await supabase
    .from("ad_copy_variants")
    .select("content")
    .eq("campaign_id", campaignId)
    .eq("field_type", field_type);

  const existingTexts = (existingVariants || []).map((v) => v.content);

  try {
    const generated = await generateAdCopy({
      campaignName: campaign.name,
      fieldType: field_type as AdCopyFieldType,
      existingVariants: existingTexts,
      count: Math.min(count, 10),
    });

    if (generated.length === 0) {
      return NextResponse.json(
        { error: "Failed to generate ad copy. Please try again." },
        { status: 500 }
      );
    }

    // Get max sort_order for this field type
    const { data: maxSort } = await supabase
      .from("ad_copy_variants")
      .select("sort_order")
      .eq("campaign_id", campaignId)
      .eq("field_type", field_type)
      .order("sort_order", { ascending: false })
      .limit(1);

    let nextOrder = (maxSort?.[0]?.sort_order ?? -1) + 1;

    const rows = generated.map((content) => ({
      user_id: userId,
      campaign_id: campaignId,
      field_type,
      content,
      sort_order: nextOrder++,
    }));

    const { data: saved, error: insertError } = await supabase
      .from("ad_copy_variants")
      .insert(rows)
      .select();

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ variants: saved }, { status: 201 });
  } catch (err) {
    console.error("Ad copy generation failed:", err);
    const isAuthError =
      err instanceof Error &&
      (err.message.includes("401") || err.message.includes("authentication"));

    return NextResponse.json(
      {
        error: isAuthError
          ? "Claude API key is invalid or expired. Please check your CLAUDE_API_KEY."
          : "Failed to generate ad copy. Please try again.",
      },
      { status: isAuthError ? 402 : 500 }
    );
  }
}
