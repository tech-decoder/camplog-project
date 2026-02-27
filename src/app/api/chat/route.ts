import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractChangesFromMessage } from "@/lib/openai/extract-changes";
import { getImpactReviewDueDate, todayString } from "@/lib/utils/dates";
import { getAuthUserId } from "@/lib/supabase/auth-helper";
import { toNumericValue } from "@/lib/utils/metrics";

export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();

  const { data: messages, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Attach extracted changes to assistant messages
  const enrichedMessages = await Promise.all(
    (messages || []).map(async (msg) => {
      if (
        msg.role === "assistant" &&
        msg.metadata?.extracted_change_ids?.length > 0
      ) {
        const { data: changes } = await supabase
          .from("changes")
          .select("id, campaign_name, site, action_type, geo, change_value, description, confidence")
          .in("id", msg.metadata.extracted_change_ids);
        return { ...msg, extracted_changes: changes || [] };
      }
      return { ...msg, extracted_changes: [] };
    })
  );

  return NextResponse.json({ messages: enrichedMessages });
}

export async function POST(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();

  const formData = await request.formData();
  const content = (formData.get("content") as string) || "";
  const imageFiles = formData.getAll("images") as File[];

  // Upload images to Supabase Storage and convert to base64 for OpenAI
  const imageUrls: string[] = [];
  const imageBase64List: string[] = [];

  for (const file of imageFiles) {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;
    imageBase64List.push(base64);

    // Upload to Supabase Storage
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${file.type.split("/")[1]}`;
    const { data: uploadData } = await supabase.storage
      .from("screenshots")
      .upload(fileName, buffer, { contentType: file.type });

    if (uploadData) {
      const { data: urlData } = supabase.storage
        .from("screenshots")
        .getPublicUrl(uploadData.path);
      imageUrls.push(urlData.publicUrl);
    }
  }

  // Save user message
  const { data: userMsg, error: userMsgError } = await supabase
    .from("chat_messages")
    .insert({
      user_id: userId,
      role: "user",
      content,
      image_urls: imageUrls,
      metadata: { processing_status: "complete" },
    })
    .select()
    .single();

  if (userMsgError) {
    return NextResponse.json({ error: userMsgError.message }, { status: 500 });
  }

  // Fetch user's sites for context
  const { data: userSites } = await supabase
    .from("user_sites")
    .select("site_abbreviation, site_name, site_url")
    .eq("user_id", userId);

  const sitesContext = userSites?.length
    ? "User's managed sites (use these abbreviations for the 'site' field):\n" + userSites.map((s) => `- ${s.site_name || s.site_abbreviation} (${s.site_abbreviation})${s.site_url ? ` — ${s.site_url}` : ""}`).join("\n")
    : "User has no sites configured yet. If they mention sites, suggest going to My Sites in the sidebar to add them.";

  // Fetch recent changes for conversational context
  const { data: recentChanges } = await supabase
    .from("changes")
    .select("campaign_name, site, action_type, geo, change_value, change_date, impact_verdict, pre_metrics")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  const activityContext = [
    sitesContext,
    recentChanges?.length
      ? "Recent change history:\n" + recentChanges
          .map(
            (c) =>
              `${c.change_date}: ${c.action_type} on ${c.campaign_name}${c.site ? ` (${c.site})` : ""}${c.geo ? ` ${c.geo}` : ""} ${c.change_value || ""} - verdict: ${c.impact_verdict || "pending"}${c.pre_metrics?.margin_pct != null ? ` margin: ${c.pre_metrics.margin_pct}%` : ""}`
          )
          .join("\n")
      : "This user is new and has no change history yet. Be welcoming and guide them on how to use CampLog.",
  ].join("\n\n");

  // Extract changes using OpenAI (with recent activity context for smarter conversations)
  const extraction = await extractChangesFromMessage(content, imageBase64List, activityContext);

  // Save extracted changes to database
  const extractedChangeIds: string[] = [];
  const extractedChangesWithIds: Array<Record<string, unknown>> = [];

  for (const change of extraction.changes) {
    // Find or create campaign
    let campaignId: string | null = null;
    const { data: existingCampaign } = await supabase
      .from("campaigns")
      .select("id")
      .eq("name", change.campaign_name)
      .maybeSingle();

    if (existingCampaign) {
      campaignId = existingCampaign.id;
    } else {
      const { data: newCampaign } = await supabase
        .from("campaigns")
        .insert({
          user_id: userId,
          name: change.campaign_name,
          site: change.site || null,
          platform: "facebook",
        })
        .select("id")
        .single();
      if (newCampaign) campaignId = newCampaign.id;
    }

    const today = todayString();
    const isPause = change.action_type === "pause_campaign" || change.action_type === "pause_geo";
    const reviewDue = isPause ? null : getImpactReviewDueDate(today);

    // Clean metrics: remove null/undefined, coerce strings like "24.53%" to 24.53
    const cleanMetrics: Record<string, number | string> = {};
    if (change.metrics) {
      for (const [key, val] of Object.entries(change.metrics)) {
        if (val === null || val === undefined) continue;
        if (key === "time_range" || key === "source_date") {
          cleanMetrics[key] = String(val);
        } else {
          const num = toNumericValue(val);
          if (num !== null) cleanMetrics[key] = num;
        }
      }
    }

    const { data: savedChange, error: changeError } = await supabase
      .from("changes")
      .insert({
        user_id: userId,
        campaign_id: campaignId,
        chat_message_id: userMsg.id,
        action_type: change.action_type,
        campaign_name: change.campaign_name,
        site: change.site || null,
        geo: change.geo,
        change_value: change.change_value,
        description: change.description,
        confidence: change.confidence,
        pre_metrics: cleanMetrics,
        change_date: today,
        metrics_time_range: cleanMetrics.time_range as string || null,
        impact_review_due: reviewDue,
        test_category: change.test_category || null,
        hypothesis: change.hypothesis || null,
      })
      .select()
      .single();

    if (savedChange && !changeError) {
      extractedChangeIds.push(savedChange.id);
      extractedChangesWithIds.push({
        ...change,
        id: savedChange.id,
      });
    }
  }

  // Save assistant message
  const { data: assistantMsg, error: assistantMsgError } = await supabase
    .from("chat_messages")
    .insert({
      user_id: userId,
      role: "assistant",
      content: extraction.assistant_message,
      image_urls: [],
      metadata: {
        extracted_change_ids: extractedChangeIds,
        processing_status: "complete",
      },
    })
    .select()
    .single();

  if (assistantMsgError) {
    return NextResponse.json(
      { error: assistantMsgError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    userMessage: userMsg,
    assistantMessage: assistantMsg,
    extractedChanges: extractedChangesWithIds,
  });
}
