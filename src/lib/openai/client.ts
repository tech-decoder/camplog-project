import OpenAI from "openai";

export function getOpenAIClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY_NEW,
  });
}

export function getOpenAIErrorMessage(err: unknown): { message: string; status: number } {
  if (err instanceof OpenAI.APIError) {
    if (err.status === 401 || err.code === "account_deactivated") {
      return { message: "OpenAI API credits have been exhausted or the account is deactivated. Please update your API key.", status: 402 };
    }
    if (err.status === 429) {
      return { message: "OpenAI API rate limit reached. Please try again in a moment.", status: 429 };
    }
    if (err.code === "insufficient_quota") {
      return { message: "OpenAI API credits have been exhausted. Please add credits to your OpenAI account.", status: 402 };
    }
  }
  return { message: "An unexpected error occurred with the AI service.", status: 500 };
}
