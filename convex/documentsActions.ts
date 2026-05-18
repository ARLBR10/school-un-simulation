"use node";

import { v } from "convex/values";
import { generateText, Output } from "ai";
import { webSearch } from "@exalabs/ai-sdk";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { PostHogTraceExporter } from "@posthog/ai/otel";

import {
  documentAnalysesParams,
  hasDocumentAnalysisConfig,
  type DocumentAnalysisOutput,
} from "@/lib/document-config";
import { sanitizeOcrPages } from "@/lib/ocr";

import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";
import { getMistralClient, getOpenrouterProvider } from "./ai";
import { getPostHog } from "./posthog";

async function otelAI() {
  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      deployment: process.env.CONVEX_DEPLOYMENT,
    }),
    traceExporter: new PostHogTraceExporter({
      apiKey: process.env.POSTHOG_API_KEY!,
      host: process.env.POSTHOG_HOST!,
    }),
  });

  await sdk.start()
  return sdk;
}

function getImageMeaning(imageAnnotation: unknown) {
  if (typeof imageAnnotation !== "string") {
    return "[Image]";
  }

  try {
    const annotation: unknown = JSON.parse(imageAnnotation);

    if (
      annotation &&
      typeof annotation === "object" &&
      "about" in annotation &&
      typeof annotation.about === "string"
    ) {
      return `[Image: ${annotation.about}]`;
    }
  } catch {
    return "[Image]";
  }

  return "[Image]";
}

function replaceImageMarkdown(markdown: string, images: unknown) {
  if (!Array.isArray(images)) {
    return markdown;
  }

  let content = markdown;

  for (const image of images) {
    if (!image || typeof image !== "object" || !("id" in image)) {
      continue;
    }

    const { id, imageAnnotation } = image;

    if (typeof id !== "string") {
      continue;
    }

    content = content.replaceAll(
      `![${id}](${id})`,
      getImageMeaning(imageAnnotation),
    );
  }

  return content;
}

function formatOcrPageForAgent(page: unknown, pageIndex: number) {
  if (!page || typeof page !== "object") {
    return `# Page ${pageIndex + 1}`;
  }

  const markdown =
    "markdown" in page && typeof page.markdown === "string"
      ? page.markdown
      : "";
  const index =
    "index" in page && typeof page.index === "number" ? page.index : pageIndex;
  const images = "images" in page ? page.images : null;

  return `# Page ${index + 1}\n\n${replaceImageMarkdown(markdown, images)}`;
}

export const extractMd = internalAction({
  args: {
    documentId: v.id("docs"),
    url: v.string(),
  },
  async handler(ctx, args) {
    const startedAt = Date.now();
    const mistralClient = await getMistralClient();
    const ocr = await mistralClient.ocr.process({
      model: "mistral-ocr-latest",
      document: {
        type: "document_url",
        documentUrl: args.url,
      },
      bboxAnnotationFormat: {
        type: "json_schema",
        jsonSchema: {
          name: "response_schema",
          schemaDefinition: {
            type: "object",
            title: "SimpleResponse",
            properties: {
              about: {
                type: "string",
                description: "What is this image about?",
              },
              nationRepresentation: {
                description: "Is this image a representation of a nation?",
                type: "boolean",
              },
            },
            required: ["about", "nationRepresentation"],
          },
          strict: true,
        },
      },
      tableFormat: "markdown",
    });

    const markdownPages = sanitizeOcrPages(ocr.pages);
    const removedPageCount = ocr.pages.length - markdownPages.length;

    await Promise.all([
      getPostHog().capture(ctx, {
        distinctId: "system:documents",
        event: "mistral_ocr_usage",
        properties: {
          action: "documents.extractMd",
          model: ocr.model,
          pagesProcessed: ocr.usageInfo.pagesProcessed,
          docSizeBytes: ocr.usageInfo.docSizeBytes,
          pageCount: ocr.pages.length,
          storedPageCount: markdownPages.length,
          removedPageCount,
          durationMs: Date.now() - startedAt,
        },
      }),
      ctx.runMutation(internal.documents.updateDocs, {
        documentId: args.documentId,
        aiAnalysis: {
          markdown: markdownPages,
        },
      }),
    ]);

    return markdownPages;
  },
});

export const aisdkAnalysis = internalAction({
  args: {
    documentId: v.id("docs"),
  },
  async handler(ctx, args): Promise<DocumentAnalysisOutput> {
    const document: Doc<"docs"> | null = await ctx.runQuery(
      internal.documents.get,
      {
        documentId: args.documentId,
      },
    );

    if (!document) {
      throw new Error("Document was not found for analysis.");
    }

    const evaluatingParams = hasDocumentAnalysisConfig(document.type)
      ? documentAnalysesParams[document.type]
      : null;

    if (!evaluatingParams) {
      throw new Error(`Unsupported document analysis type: ${document.type}`);
    }

    const member = await ctx.runQuery(internal.members.get, {
      id: document.member,
    });
    const committee = await ctx.runQuery(internal.committees.get, {
      id: member!.committee!,
    });

    let system = evaluatingParams.system;

    if (document.type === "position_paper") {
      system += `\n\n# RUNTIME CONTEXT

The student represents the following country:
${new Intl.DisplayNames(["en-US"], {
  type: "region",
}).of(member!.delegatedCountry!)}

The document belongs to the following committee:
${committee!.theme!}

The committee topics are:
${committee!.topics!}

Use this runtime (on observations just call it Instruções) context when evaluating whether the document is coherent with the represented country, the committee, and the proposed debate theme.

If the document refers to a different country, ignores the committee theme, or presents arguments unrelated to this context, mention it in "observations" and consider setting "needs_human_review" to true.

Do not replace the student’s arguments with your own knowledge of the country. Use the runtime context only to evaluate alignment, coherence, and factual consistency.
`;
    }

    const openrouter = await getOpenrouterProvider();
    const documentContent = document.aiAnalysis?.markdown
      ?.map((page, pageIndex) => formatOcrPageForAgent(page, pageIndex))
      .join("\n\n");

    if (!documentContent) {
      throw new Error("Document markdown was not found for analysis.");
    }

    const sdk = await otelAI(); // OpenTelemetry tracking for AI Usage through Posthog
    const { output } = await generateText({
      model: openrouter("openai/gpt-5.4-nano"),
      messages: [
        {
          content: system,
          role: "system",
        },
        {
          content: documentContent,
          role: "user",
        },
      ],
      output: Output.object({
        schema: evaluatingParams.schema,
      }),
      tools: {
        webSearch: webSearch(),
      },
      experimental_telemetry: {
        isEnabled: true,
        recordInputs: true,
        recordOutputs: true,
        functionId: "documentsActions.aisdkAnalysis",
        metadata: {
          documentId: args.documentId,
          memberId: document.member,
        },
      },
    }).catch(async (e) => {
      await Promise.all([
        ctx.runMutation(internal.documents.updateDocs, {
          documentId: args.documentId,
          aiAnalysis: {
            job_status: {
              llmReviewed: false,
              llmReviewFailed: true,
              requiresHumanReview: true,
            },
          },
        }),
        getPostHog().captureException(ctx, {
          error: e,
          additionalProperties: {
            action: "documentsActions.aisdkAnalysis",
            documentId: args.documentId,
          }
        })
      ]);

      throw e;
    });
    await sdk.shutdown();

    return output;
  },
});
