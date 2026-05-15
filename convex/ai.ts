import { Mistral } from "@mistralai/mistralai";

export function getMistralClient() {
  const apiKey = process.env.MISTRALAI_API_KEY;

  if (!apiKey) {
    throw new Error("MISTRALAI_API_KEY is required to use Mistral AI.");
  }

  return new Mistral({ apiKey });
}
