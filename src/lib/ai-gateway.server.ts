import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function createStudyAi(key: string) {
  return createOpenAICompatible({
    name: "lovable-ai",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: { "Lovable-API-Key": key },
  });
}