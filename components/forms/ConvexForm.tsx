"use client";

import { useMutation, useQuery } from "convex/react";
import posthog from "posthog-js";

import { FormRenderer, type FormAnswers } from "@/components/forms/FormRenderer";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import {
  capturePostHogSafely,
  redactPostHogError,
} from "@/lib/posthog-telemetry";
import type { FormDefinition } from "@/lib/forms";

export function ConvexForm({ definition }: { definition: FormDefinition }) {
  const existingResponse = useQuery(api.forms.getMyResponse, {
    formKey: definition.key,
  });
  const submit = useMutation(api.forms.submit);

  if (existingResponse === undefined) {
    return <Skeleton className="h-96 w-full rounded-xl" />;
  }

  const initialAnswers = existingResponse
    ? (Object.fromEntries(
        existingResponse.answers.map((answer) => [answer.fieldId, answer.value]),
      ) as FormAnswers)
    : undefined;

  return (
    <FormRenderer
      definition={definition}
      initialAnswers={initialAnswers}
      onSubmit={async (answers) => {
        const submittedAnswers = Object.entries(answers)
          .filter(([, value]) => {
            if (typeof value === "string") return value.trim() !== "";
            if (Array.isArray(value)) return value.length > 0;
            return true;
          })
          .map(([fieldId, value]) => ({ fieldId, value }));
        const telemetryProperties = {
          module: "forms",
          form_key: definition.key,
          form_version: definition.version,
          answer_count: submittedAnswers.length,
          submission_mode: existingResponse ? "updated" : "created",
        };

        capturePostHogSafely(() => {
          posthog.capture("form_submission_started", telemetryProperties);
        });

        try {
          await submit({
            formKey: definition.key,
            answers: submittedAnswers,
          });
          capturePostHogSafely(() => {
            posthog.capture("form_submission_succeeded", telemetryProperties);
          });
        } catch (error) {
          const redactedError = redactPostHogError(
            error,
            "form_submission_failed",
          );
          const errorProperties = {
            ...telemetryProperties,
            ...redactedError.properties,
          };

          capturePostHogSafely(() => {
            posthog.capture("form_submission_failed", errorProperties);
          });
          capturePostHogSafely(() => {
            posthog.captureException(redactedError.error, errorProperties);
          });
          throw error;
        }
      }}
    />
  );
}
