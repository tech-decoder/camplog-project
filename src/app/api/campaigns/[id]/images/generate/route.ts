import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveUserId } from "@/lib/supabase/route-helpers";
import { generateImageWithOpenAI } from "@/lib/openai/generate-images";
import { generateImageWithGemini, generateImageWithGeminiFlash, generateImageWithGeminiPro } from "@/lib/gemini/client";
import { buildImagePrompt } from "@/lib/image-gen/prompt-builder";
import { GenerateImageRequest, ImageModel } from "@/lib/types/generated-images";


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

  const body: GenerateImageRequest = await request.json();
  const {
    headline,
    primary_text,
    description,
    style_preset,
    model = "gpt-image-1" as ImageModel,
    quality = "standard",
    custom_instructions,
    count = 1,
  } = body;

  const imageCount = Math.min(Math.max(count, 1), 4);

  const prompt = buildImagePrompt({
    campaignName: campaign.name,
    headline,
    primaryText: primary_text,
    description,
    stylePreset: style_preset,
    customInstructions: custom_instructions,
  });

  try {
    let imageResults: Array<{
      b64Data: string;
      mimeType?: string;
      revisedPrompt?: string;
    }>;

    if (model === "gemini-pro-image") {
      const proResults = await generateImageWithGeminiPro({
        prompt,
        count: imageCount,
      });
      imageResults = proResults.map((r) => ({
        b64Data: r.b64Data,
        mimeType: r.mimeType,
      }));
    } else if (model === "gemini-flash-image") {
      const flashResults = await generateImageWithGeminiFlash({
        prompt,
        count: imageCount,
      });
      imageResults = flashResults.map((r) => ({
        b64Data: r.b64Data,
        mimeType: r.mimeType,
      }));
    } else if (model === "imagen-3") {
      const geminiResults = await generateImageWithGemini({
        prompt,
        count: imageCount,
      });
      imageResults = geminiResults.map((r) => ({
        b64Data: r.b64Data,
        mimeType: r.mimeType,
      }));
    } else {
      const openaiResults = await generateImageWithOpenAI({
        prompt,
        quality,
        count: imageCount,
      });
      imageResults = openaiResults.map((r) => ({
        b64Data: r.b64Data,
        mimeType: "image/png",
        revisedPrompt: r.revisedPrompt,
      }));
    }

    // Upload to Supabase Storage and save records
    const savedImages = [];

    for (const result of imageResults) {
      const imageId = crypto.randomUUID();
      const ext = result.mimeType === "image/jpeg" ? "jpg" : "png";
      const storagePath = `${userId}/${campaignId}/${imageId}.${ext}`;
      const buffer = Buffer.from(result.b64Data, "base64");

      const { error: uploadError } = await supabase.storage
        .from("generated-images")
        .upload(storagePath, buffer, {
          contentType: result.mimeType || "image/png",
        });

      if (uploadError) {
        console.error("Image upload failed:", uploadError);
        continue;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("generated-images").getPublicUrl(storagePath);

      const { data: saved, error: dbError } = await supabase
        .from("generated_images")
        .insert({
          id: imageId,
          user_id: userId,
          campaign_id: campaignId,
          image_url: publicUrl,
          prompt,
          model,
          quality,
          style_preset: style_preset || null,
          dimensions: "1024x1024",
          headline_ref: headline || null,
          primary_text_ref: primary_text || null,
          metadata: {
            revised_prompt: result.revisedPrompt || null,
          },
          status: "completed",
        })
        .select()
        .single();

      if (saved && !dbError) {
        savedImages.push(saved);
      }
    }

    if (savedImages.length === 0) {
      return NextResponse.json(
        { error: "Failed to generate images. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ images: savedImages }, { status: 201 });
  } catch (err) {
    console.error("Image generation failed:", err);

    // Check for OpenAI-specific errors
    const isOpenAIError =
      err instanceof Error &&
      (err.message.includes("deactivated") ||
        err.message.includes("quota") ||
        err.message.includes("rate_limit"));

    if (isOpenAIError) {
      return NextResponse.json(
        {
          error:
            "AI service credits exhausted or account issue. Please check your API key.",
        },
        { status: 402 }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate images. Please try again." },
      { status: 500 }
    );
  }
}
