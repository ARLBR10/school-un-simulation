import { Ocr } from "@mistralai/mistralai/sdk/ocr";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

import { env } from "./_generated/server";

export async function getMistralOcrClient() {
  const apiKey = env.MISTRALAI_API_KEY;

  if (!apiKey) {
    throw new Error("MISTRALAI_API_KEY is required to use Mistral AI.");
  }

  return new Ocr({ apiKey });
}

export async function getOpenrouterProvider() {
  if (!env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is required to use OpenRouter.");
  }

  return createOpenRouter({
    apiKey: env.OPENROUTER_API_KEY,
  });
}
