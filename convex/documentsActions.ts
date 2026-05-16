"use node";

import { v } from "convex/values";
import { generateText, Output } from "ai";
import { webSearch } from "@exalabs/ai-sdk";

import { sanitizeOcrPages } from "@/lib/ocr";

import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";
import {
  getDocumentAnalysesParams,
  getMistralClient,
  getOpenrouterProvider,
} from "./ai";
import { getPostHog } from "./posthog";

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
  async handler(ctx, args) {
    const document: Doc<"docs"> | null = await ctx.runQuery(
      internal.documents.getDoc,
      {
        documentId: args.documentId,
      },
    );

    if (!document) {
      throw new Error("Document was not found for analysis.");
    }

    const documentAnalysesParams = await getDocumentAnalysesParams();
    const evaluatingParams = documentAnalysesParams[document.type];

    if (!evaluatingParams) {
      throw new Error(`Unsupported document analysis type: ${document.type}`);
    }

    const member = await ctx.runQuery(internal.members.get, {
      id: document.member,
    });
    const committee = await ctx.runQuery(internal.committees.get, {
      id: member!.committee!,
    });

    if (document.type === "position_paper") {
      evaluatingParams.system += `\n\n# RUNTIME CONTEXT

The student represents the following country:
${new Intl.DisplayNames(["en-US"], {
  type: "region",
}).of(member!.delegatedCountry!)}

The document belongs to the following committee:
${committee!.theme!}

The committee topics are:
${committee!.topics!}

Use this runtime context when evaluating whether the document is coherent with the represented country, the committee, and the proposed debate theme.

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

    console.log(evaluatingParams.system)
    console.log(documentContent)

    const { output } = await generateText({
      model: openrouter("gpt-5.4-nano"),
      messages: [
        {
          content: evaluatingParams.system,
          role: "system",
        },
        {
          content: documentContent,
          role: "user",
        },
      ],
      output: Output.object({
        schema: evaluatingParams.schema
      }),
      tools: {
        webSearch: webSearch(),
      },
    });

    console.log(output)

    return null;
  },
});
