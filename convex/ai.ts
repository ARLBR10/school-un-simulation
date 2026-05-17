export async function getMistralClient() {
  const apiKey = process.env.MISTRALAI_API_KEY;

  if (!apiKey) {
    throw new Error("MISTRALAI_API_KEY is required to use Mistral AI.");
  }

  const { Mistral } = await import("@mistralai/mistralai");

  return new Mistral({ apiKey });
}

export async function getOpenrouterProvider() {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is required to use OpenRouter.");
  }

  const { createOpenRouter } = await import("@openrouter/ai-sdk-provider");

  return createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
  });
}
