import Anthropic from "@anthropic-ai/sdk";

export function getClaudeClient(): Anthropic {
  return new Anthropic({
    apiKey: process.env.CLAUDE_API_KEY,
  });
}
