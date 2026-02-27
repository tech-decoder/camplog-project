import { getOpenAIClient } from "./client";
import { CHANGE_EXTRACTION_SYSTEM_PROMPT } from "./prompts";
import { ExtractionResult } from "../types/chat";

export async function extractChangesFromMessage(
  text: string,
  imageBase64List: string[],
  recentActivityContext?: string
): Promise<ExtractionResult> {
  const openai = getOpenAIClient();

  const userContent: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string; detail: "high" | "low" } }
  > = [];

  // Add images first so the model sees them before reading text
  for (const base64 of imageBase64List) {
    userContent.push({
      type: "image_url",
      image_url: {
        url: base64.startsWith("data:")
          ? base64
          : `data:image/png;base64,${base64}`,
        detail: "high",
      },
    });
  }

  // Then add the text
  if (text.trim()) {
    userContent.push({ type: "text", text });
  } else if (imageBase64List.length > 0) {
    userContent.push({
      type: "text",
      text: "Extract all visible data from this screenshot. What campaigns and metrics do you see?",
    });
  }

  // Enhance system prompt with recent activity context for smarter conversations
  let systemPrompt = CHANGE_EXTRACTION_SYSTEM_PROMPT;
  if (recentActivityContext) {
    systemPrompt += `\n\n## Recent Activity (for context when answering questions)\n${recentActivityContext}`;
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    response_format: { type: "json_object" },
    max_tokens: 4096,
    temperature: 0.1,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    return {
      changes: [],
      assistant_message: "I couldn't process that message. Could you try again?",
    };
  }

  try {
    const parsed = JSON.parse(content) as ExtractionResult;
    return {
      changes: parsed.changes || [],
      assistant_message:
        parsed.assistant_message ||
        "I processed your message but couldn't generate a summary.",
    };
  } catch {
    return {
      changes: [],
      assistant_message:
        "I had trouble parsing the response. Could you try rephrasing?",
    };
  }
}
