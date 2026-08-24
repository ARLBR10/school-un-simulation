import { v } from "convex/values";

import { api } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import {
  getFormDefinition,
  getFormField,
  getFormOptionLabel,
  type FormAnswerValue,
  type FormDefinition,
  type FormField,
} from "../lib/forms";

const formAnswerValueValidator = v.union(
  v.string(),
  v.number(),
  v.boolean(),
  v.array(v.string()),
);

const formAnswerValidator = v.object({
  fieldId: v.string(),
  value: formAnswerValueValidator,
});

const formAnswerResultValidator = v.object({
  fieldId: v.string(),
  value: formAnswerValueValidator,
});

const adminFormAnswerResultValidator = formAnswerResultValidator.extend({
  fieldName: v.string(),
  displayValue: v.string(),
});

const submissionResultValidator = v.object({
  _id: v.id("formSubmissions"),
  submittedAt: v.number(),
  respondent: v.object({
    _id: v.id("members"),
    name: v.string(),
    schoolClass: v.union(v.string(), v.null()),
    tuitionId: v.union(v.string(), v.null()),
  }),
  answers: v.array(adminFormAnswerResultValidator),
});

const MAX_FIELDS = 50;
const MAX_TEXT_LENGTH = 10_000;
const MAX_OPTIONS = 50;
const MAX_OPTION_LENGTH = 500;

export type SaveFormSubmissionArgs = {
  formKey: string;
  answers: Array<{ fieldId: string; value: FormAnswerValue }>;
};

type CurrentMemberInfo = {
  _id: string;
  member: Doc<"members"> | null;
} | null;

type MyFormResponse = {
  submissionId: Id<"formSubmissions">;
  submittedAt: number;
  answers: SaveFormSubmissionArgs["answers"];
};

type AdminFormResponse = {
  _id: Id<"formSubmissions">;
  submittedAt: number;
  respondent: {
    _id: Id<"members">;
    name: string;
    schoolClass: string | null;
    tuitionId: string | null;
  };
  answers: Array<SaveFormSubmissionArgs["answers"][number] & {
    fieldName: string;
    displayValue: string;
  }>;
};

function isEmptyValue(value: FormAnswerValue) {
  return (
    (typeof value === "string" && value.trim() === "") ||
    (Array.isArray(value) && value.length === 0)
  );
}

function validateFieldValue(field: FormField, value: FormAnswerValue) {
  if (field.type === "number") return typeof value === "number";
  if (field.type === "boolean") return typeof value === "boolean";
  if (field.type === "multipleOptions") {
    return (
      Array.isArray(value) &&
      (field.minSelections === undefined ||
        value.length >= field.minSelections) &&
      (field.maxSelections === undefined ||
        value.length <= field.maxSelections) &&
      value.length <= MAX_OPTIONS &&
      new Set(value).size === value.length &&
      value.every((item) => item.length <= MAX_OPTION_LENGTH) &&
      value.every((item) => field.options.some((option) => option.value === item))
    );
  }
  if (field.type === "multipleOptionsWithCustom") {
    return (
      Array.isArray(value) &&
      (field.minSelections === undefined ||
        value.length >= field.minSelections) &&
      (field.maxSelections === undefined ||
        value.length <= field.maxSelections) &&
      value.length <= MAX_OPTIONS &&
      new Set(value).size === value.length &&
      value.every(
        (item) => item.trim().length > 0 && item.length <= MAX_OPTION_LENGTH,
      )
    );
  }
  if (field.type === "option") {
    return (
      typeof value === "string" &&
      value.length <= MAX_OPTION_LENGTH &&
      field.options.some((option) => option.value === value)
    );
  }
  return typeof value === "string" && value.length <= MAX_TEXT_LENGTH;
}

function validateAnswers(
  definition: FormDefinition,
  answers: SaveFormSubmissionArgs["answers"],
) {
  const answersByField = new Map(answers.map((answer) => [answer.fieldId, answer]));
  if (definition.fields.length > MAX_FIELDS || answers.length > MAX_FIELDS) {
    throw new Error("O formulário excede o limite de campos permitido.");
  }
  if (answersByField.size !== answers.length) {
    throw new Error("O formulário contém respostas duplicadas.");
  }

  for (const answer of answers) {
    const field = getFormField(definition, answer.fieldId);
    if (!field || !validateFieldValue(field, answer.value)) {
      throw new Error(`Resposta inválida para o campo ${answer.fieldId}.`);
    }
  }

  for (const field of definition.fields) {
    const answer = answersByField.get(field.id);
    if (field.required && (!answer || isEmptyValue(answer.value))) {
      throw new Error(`O campo ${field.name} é obrigatório.`);
    }
  }
}

// Custom Convex mutations can call this helper to add side effects while keeping
// the same validation, ownership and storage behavior as the default flow.
export async function saveFormSubmission(
  ctx: MutationCtx,
  args: SaveFormSubmissionArgs,
): Promise<Id<"formSubmissions">> {
  const userInfo: CurrentMemberInfo = await ctx.runQuery(
    api.auth.getCurrentUser,
  );
  if (!userInfo?.member) {
    throw new Error("É necessário ser membro para responder.");
  }

  const definition = getFormDefinition(args.formKey);
  if (!definition) throw new Error("Formulário não encontrado.");

  validateAnswers(definition, args.answers);

  const event = await ctx.db
    .query("events")
    .withIndex("by_slug", (q) => q.eq("slug", definition.eventSlug))
    .unique();
  if (!event) {
    throw new Error("O evento vinculado a este formulário não foi encontrado.");
  }

  const existingSubmission = await ctx.db
    .query("formSubmissions")
    .withIndex("by_formKey_and_formVersion_and_respondentUserId", (q) =>
      q
        .eq("formKey", args.formKey)
        .eq("formVersion", definition.version)
        .eq("respondentUserId", userInfo._id),
    )
    .unique();

  const submissionId = existingSubmission?._id ??
    (await ctx.db.insert("formSubmissions", {
      formKey: args.formKey,
      formVersion: definition.version,
      respondentUserId: userInfo._id,
      respondentMemberId: userInfo.member._id,
      eventId: event._id,
      submittedAt: Date.now(),
    }));

  if (existingSubmission) {
    const previousAnswers = await ctx.db
      .query("formAnswers")
      .withIndex("by_submissionId", (q) => q.eq("submissionId", submissionId))
      .take(100);
    for (const answer of previousAnswers) {
      await ctx.db.delete("formAnswers", answer._id);
    }
    await ctx.db.patch("formSubmissions", submissionId, {
      eventId: event._id,
      respondentMemberId: userInfo.member._id,
      submittedAt: Date.now(),
    });
  }

  for (const answer of args.answers) {
    if (!isEmptyValue(answer.value)) {
      await ctx.db.insert("formAnswers", {
        submissionId,
        fieldId: answer.fieldId,
        fieldName: getFormField(definition, answer.fieldId)!.name,
        displayValue: Array.isArray(answer.value)
          ? answer.value
              .map((item) =>
                getFormOptionLabel(
                  getFormField(definition, answer.fieldId)!,
                  item,
                ),
              )
              .join(", ")
          : typeof answer.value === "boolean"
            ? answer.value
              ? "Sim"
              : "Não"
            : String(answer.value),
        value: answer.value,
      });
    }
  }

  return submissionId;
}

export const submit = mutation({
  args: {
    formKey: v.string(),
    answers: v.array(formAnswerValidator),
  },
  returns: v.id("formSubmissions"),
  handler: async (ctx, args): Promise<Id<"formSubmissions">> => {
    return await saveFormSubmission(ctx, args);
  },
});

export const getMyResponse = query({
  args: { formKey: v.string() },
  returns: v.union(
    v.object({
      submissionId: v.id("formSubmissions"),
      submittedAt: v.number(),
      answers: v.array(formAnswerResultValidator),
    }),
    v.null(),
  ),
  handler: async (ctx, args): Promise<MyFormResponse | null> => {
    const definition = getFormDefinition(args.formKey);
    if (!definition) return null;
    const userInfo: CurrentMemberInfo = await ctx.runQuery(
      api.auth.getCurrentUser,
    );
    if (!userInfo?.member) return null;

    const submission = await ctx.db
      .query("formSubmissions")
      .withIndex("by_formKey_and_formVersion_and_respondentUserId", (q) =>
        q
          .eq("formKey", args.formKey)
          .eq("formVersion", definition.version)
          .eq("respondentUserId", userInfo._id),
      )
      .unique();
    if (!submission) return null;

    const answers = await ctx.db
      .query("formAnswers")
      .withIndex("by_submissionId", (q) => q.eq("submissionId", submission._id))
      .take(100);
    return {
      submissionId: submission._id,
      submittedAt: submission.submittedAt,
      answers: answers.map(({ fieldId, value }) => ({ fieldId, value })),
    };
  },
});

export const listResponses = query({
  args: { formKey: v.string() },
  returns: v.union(v.array(submissionResultValidator), v.null()),
  handler: async (ctx, args): Promise<AdminFormResponse[] | null> => {
    if (!getFormDefinition(args.formKey)) return null;
    const userInfo: CurrentMemberInfo = await ctx.runQuery(
      api.auth.getCurrentUser,
    );
    if (userInfo?.member?.type !== "admin") return null;

    const submissions = await ctx.db
      .query("formSubmissions")
      .withIndex("by_formKey", (q) => q.eq("formKey", args.formKey))
      .order("desc")
      .take(250);

    return await Promise.all(
      submissions.map(async (submission) => {
        const [respondent, answers] = await Promise.all([
          ctx.db.get("members", submission.respondentMemberId),
          ctx.db
            .query("formAnswers")
            .withIndex("by_submissionId", (q) =>
              q.eq("submissionId", submission._id),
            )
            .take(100),
        ]);
        if (!respondent) return null;
        return {
          _id: submission._id,
          submittedAt: submission.submittedAt,
          respondent: {
            _id: respondent._id,
            name: respondent.name,
            schoolClass: respondent.schoolClass ?? null,
            tuitionId: respondent.tuitionId ?? null,
          },
          answers: answers.map(
            ({ fieldId, fieldName, displayValue, value }) => ({
              fieldId,
              fieldName,
              displayValue,
              value,
            }),
          ),
        };
      }),
    ).then((responses) => responses.filter((response) => response !== null));
  },
});
