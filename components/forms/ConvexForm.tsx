"use client";

import { useMutation, useQuery } from "convex/react";

import { FormRenderer, type FormAnswers } from "@/components/forms/FormRenderer";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
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
        await submit({
          formKey: definition.key,
          answers: Object.entries(answers)
            .filter(([, value]) => {
              if (typeof value === "string") return value.trim() !== "";
              if (Array.isArray(value)) return value.length > 0;
              return true;
            })
            .map(([fieldId, value]) => ({ fieldId, value })),
        });
      }}
    />
  );
}
