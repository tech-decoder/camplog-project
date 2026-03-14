import { getGeminiClient } from "./client";

async function generateText(
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model,
    contents: userPrompt,
    config: {
      systemInstruction: systemPrompt,
    },
  });

  const text = response.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!text) {
    throw new Error(`[Gemini/${model}] Empty response received`);
  }
  return text;
}

/** Gemini 2.5 Pro — high-quality fallback for strategy & creative brief */
export function generateTextWithGeminiPro(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  return generateText("gemini-2.5-pro", systemPrompt, userPrompt);
}

/** Gemini 2.5 Flash — fast, cost-efficient fallback for ad copy */
export function generateTextWithGeminiFlash(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  return generateText("gemini-2.5-flash", systemPrompt, userPrompt);
}
