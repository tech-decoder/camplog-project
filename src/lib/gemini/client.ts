import { GoogleGenAI } from "@google/genai";
import { ImageFormat } from "@/lib/types/generation-jobs";

let geminiInstance: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!geminiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Gemini API key not configured. Please add GEMINI_API_KEY to your environment variables."
      );
    }
    geminiInstance = new GoogleGenAI({ apiKey });
  }
  return geminiInstance;
}

// Imagen 3 supports aspectRatio natively
const IMAGEN_ASPECT_MAP: Record<ImageFormat, string> = {
  "1:1": "1:1",
  "9:16": "9:16",
};

export async function generateImageWithGemini({
  prompt,
  count = 1,
  format = "1:1",
}: {
  prompt: string;
  count?: number;
  format?: ImageFormat;
}): Promise<Array<{ b64Data: string; mimeType: string }>> {
  const ai = getGeminiClient();

  const response = await ai.models.generateImages({
    model: "imagen-3.0-generate-002",
    prompt,
    config: {
      numberOfImages: Math.min(count, 4),
      aspectRatio: IMAGEN_ASPECT_MAP[format],
    },
  });

  const results: Array<{ b64Data: string; mimeType: string }> = [];

  for (const img of response.generatedImages || []) {
    if (img.image?.imageBytes) {
      results.push({
        b64Data: img.image.imageBytes,
        mimeType: img.image.mimeType || "image/png",
      });
    }
  }

  return results;
}

// Flash and Pro use generateContent — aspect ratio goes in the prompt
function appendFormatInstruction(prompt: string, format: ImageFormat): string {
  if (format === "9:16") {
    return `${prompt}\n\nIMPORTANT: Generate this image in portrait/vertical 9:16 aspect ratio (tall, like a phone screen).`;
  }
  return `${prompt}\n\nGenerate this image in square 1:1 aspect ratio.`;
}

export async function generateImageWithGeminiFlash({
  prompt,
  count = 1,
  format = "1:1",
}: {
  prompt: string;
  count?: number;
  format?: ImageFormat;
}): Promise<Array<{ b64Data: string; mimeType: string }>> {
  const ai = getGeminiClient();
  const results: Array<{ b64Data: string; mimeType: string }> = [];
  const finalPrompt = appendFormatInstruction(prompt, format);
  const numImages = Math.min(Math.max(count, 1), 4);

  for (let i = 0; i < numImages; i++) {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-image-generation",
      contents: finalPrompt,
      config: {
        responseModalities: ["Image"],
      },
    });

    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        results.push({
          b64Data: part.inlineData.data,
          mimeType: part.inlineData.mimeType || "image/png",
        });
      }
    }
  }

  return results;
}

export async function generateImageWithGeminiPro({
  prompt,
  count = 1,
  format = "1:1",
}: {
  prompt: string;
  count?: number;
  format?: ImageFormat;
}): Promise<Array<{ b64Data: string; mimeType: string }>> {
  const ai = getGeminiClient();
  const results: Array<{ b64Data: string; mimeType: string }> = [];
  const finalPrompt = appendFormatInstruction(prompt, format);
  const numImages = Math.min(Math.max(count, 1), 4);

  for (let i = 0; i < numImages; i++) {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: finalPrompt,
      config: {
        responseModalities: ["Image"],
      },
    });

    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        results.push({
          b64Data: part.inlineData.data,
          mimeType: part.inlineData.mimeType || "image/png",
        });
      }
    }
  }

  return results;
}
