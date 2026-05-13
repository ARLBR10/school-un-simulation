import { components } from "./_generated/api";
import { WorkflowManager } from "@convex-dev/workflow";
import { v } from "convex/values";

/**
 * Limits
 * 
 * Openrouter Free models: 1000 request/day
 * Mistral AI: Until rate-limit reaches (its unknown...)
 */
export const workflow = new WorkflowManager(components.workflow, {
  workpoolOptions: {
    maxParallelism: 1, // This will be changed with time.
    defaultRetryBehavior: {
      initialBackoffMs: 10000,
      base: 2,
      maxAttempts: 5
    }
  }
})

/**
 * The document Anaylsis should be a "standard" way of taking a PDF link and extracting it to MD (using Mistral OCR) then have a LLM (with a very strict system prompt) output a object with a score (through out each evaluating parameter) and maybe some observations.
 */ 
export const documentAnalysisWorkflow = workflow.define({
  args: {
    documentId: v.string()
  },
  returns: v.any(), // Temp
  handler: async (step, args) => {
    
  }
})
