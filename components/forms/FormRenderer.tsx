"use client";

import { Check, Plus, Send } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type {
  FormAnswerValue,
  FormDefinition,
  FormField,
} from "@/lib/forms";

export type FormAnswers = Record<string, FormAnswerValue>;

export type FormSubmitHandler = (answers: FormAnswers) => Promise<void>;

function getInitialValue(field: FormField): FormAnswerValue {
  if (
    field.type === "multipleOptions" ||
    field.type === "multipleOptionsWithCustom"
  ) {
    return [];
  }
  if (field.type === "boolean") return false;
  return "";
}

function buildInitialAnswers(
  definition: FormDefinition,
  initialAnswers?: FormAnswers,
) {
  return Object.fromEntries(
    definition.fields.map((field) => [
      field.id,
      initialAnswers?.[field.id] ?? getInitialValue(field),
    ]),
  ) as FormAnswers;
}

function isEmpty(value: FormAnswerValue) {
  return (
    (typeof value === "string" && !value.trim()) ||
    (Array.isArray(value) && value.length === 0)
  );
}

function FieldImage({ field }: { field: FormField }) {
  if (!field.imageUrl) return null;
  return (
    <img
      src={field.imageUrl}
      alt=""
      className="mb-2 max-h-64 w-full rounded-lg object-cover ring-1 ring-foreground/10"
    />
  );
}

function MultipleOptionsField({
  field,
  value,
  invalid,
  onChange,
}: {
  field: Extract<
    FormField,
    { type: "multipleOptions" | "multipleOptionsWithCustom" }
  >;
  value: string[];
  invalid: boolean;
  onChange: (value: string[]) => void;
}) {
  const [customValue, setCustomValue] = useState("");
  const knownValues = new Set(field.options.map((option) => option.value));
  const customValues = value.filter((item) => !knownValues.has(item));
  const selectionLimitReached =
    field.maxSelections !== undefined && value.length >= field.maxSelections;

  function addCustomValue() {
    const nextValue = customValue.trim();
    if (!nextValue || value.includes(nextValue) || selectionLimitReached) return;
    onChange([...value, nextValue]);
    setCustomValue("");
  }

  return (
    <FieldSet>
      <FieldLegend className="sr-only">{field.name}</FieldLegend>
      <FieldGroup data-slot="checkbox-group" className="gap-3">
        {field.options.map((option) => (
          <Field key={option.value} orientation="horizontal">
            <Checkbox
              id={`${field.id}-${option.value}`}
              checked={value.includes(option.value)}
              disabled={selectionLimitReached && !value.includes(option.value)}
              aria-invalid={invalid}
              onCheckedChange={(checked) => {
                onChange(
                  checked
                    ? [...value, option.value]
                    : value.filter((item) => item !== option.value),
                );
              }}
            />
            <FieldLabel
              htmlFor={`${field.id}-${option.value}`}
              className="flex-col items-start gap-1"
            >
              <span>{option.label}</span>
              {option.description ? (
                <span className="text-sm leading-normal font-normal text-muted-foreground">
                  {option.description}
                </span>
              ) : null}
            </FieldLabel>
          </Field>
        ))}
      </FieldGroup>

      {field.type === "multipleOptionsWithCustom" ? (
        <div className="flex flex-col gap-3">
          {customValues.map((item) => (
            <Field key={item} orientation="horizontal">
              <Checkbox
                id={`${field.id}-custom-${item}`}
                checked
                onCheckedChange={(checked) => {
                  if (!checked) onChange(value.filter((entry) => entry !== item));
                }}
              />
              <FieldLabel htmlFor={`${field.id}-custom-${item}`}>
                {item}
              </FieldLabel>
            </Field>
          ))}
          <div className="flex gap-2">
            <Input
              value={customValue}
              disabled={selectionLimitReached}
              placeholder="Outra sugestão"
              aria-label={`Outra opção para ${field.name}`}
              onChange={(event) => setCustomValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addCustomValue();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              disabled={selectionLimitReached}
              onClick={addCustomValue}
            >
              <Plus data-icon="inline-start" />
              Adicionar
            </Button>
          </div>
        </div>
      ) : null}
    </FieldSet>
  );
}

function FormControl({
  field,
  value,
  invalid,
  onChange,
}: {
  field: FormField;
  value: FormAnswerValue;
  invalid: boolean;
  onChange: (value: FormAnswerValue) => void;
}) {
  if (field.type === "textarea") {
    return (
      <Textarea
        id={field.id}
        value={typeof value === "string" ? value : ""}
        aria-invalid={invalid}
        rows={5}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }
  if (field.type === "number") {
    return (
      <Input
        id={field.id}
        type="number"
        value={typeof value === "number" ? value : ""}
        aria-invalid={invalid}
        onChange={(event) =>
          onChange(event.target.value === "" ? "" : event.target.valueAsNumber)
        }
      />
    );
  }
  if (field.type === "boolean") {
    return (
      <Switch
        id={field.id}
        checked={value === true}
        aria-invalid={invalid}
        onCheckedChange={onChange}
      />
    );
  }
  if (field.type === "option") {
    return (
      <Select
        value={typeof value === "string" ? value : ""}
        onValueChange={(nextValue) => onChange(nextValue ?? "")}
      >
        <SelectTrigger id={field.id} className="w-full" aria-invalid={invalid}>
          <SelectValue placeholder="Selecione uma opção" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {field.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    );
  }
  if (
    field.type === "multipleOptions" ||
    field.type === "multipleOptionsWithCustom"
  ) {
    return (
      <MultipleOptionsField
        field={field}
        value={Array.isArray(value) ? value : []}
        invalid={invalid}
        onChange={onChange}
      />
    );
  }
  return (
    <Input
      id={field.id}
      value={typeof value === "string" ? value : ""}
      aria-invalid={invalid}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export function FormRenderer({
  definition,
  initialAnswers,
  onSubmit,
}: {
  definition: FormDefinition;
  initialAnswers?: FormAnswers;
  onSubmit: FormSubmitHandler;
}) {
  const [answers, setAnswers] = useState(() =>
    buildInitialAnswers(definition, initialAnswers),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = Object.fromEntries(
      definition.fields.flatMap((field) => {
        const value = answers[field.id];
        if (field.required && isEmpty(value)) {
          return [[field.id, "Este campo é obrigatório."]];
        }
        if (
          (field.type === "multipleOptions" ||
            field.type === "multipleOptionsWithCustom") &&
          Array.isArray(value)
        ) {
          if (
            field.minSelections !== undefined &&
            value.length < field.minSelections
          ) {
            return [[
              field.id,
              `Selecione pelo menos ${field.minSelections} ${field.minSelections === 1 ? "opção" : "opções"}.`,
            ]];
          }
          if (
            field.maxSelections !== undefined &&
            value.length > field.maxSelections
          ) {
            return [[
              field.id,
              `Selecione no máximo ${field.maxSelections} opções.`,
            ]];
          }
        }
        return [];
      }),
    );
    setErrors(nextErrors);
    setSubmitError(null);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      await onSubmit(answers);
      setIsSubmitted(true);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Não foi possível enviar o formulário.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSubmitted) {
    return (
      <Card>
        <CardHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Check aria-hidden="true" />
          </div>
          <CardTitle>{definition.successTitle ?? "Resposta enviada"}</CardTitle>
          <CardDescription>
            {definition.successDescription ?? "Sua resposta foi salva com sucesso."}
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button type="button" variant="outline" onClick={() => setIsSubmitted(false)}>
            Editar respostas
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      {definition.imageUrl ? (
        <img
          src={definition.imageUrl}
          alt=""
          className="max-h-80 w-full object-cover"
        />
      ) : null}
      <CardHeader className="border-b">
        <CardTitle className="text-xl sm:text-2xl">{definition.title}</CardTitle>
        {definition.description ? (
          <CardDescription className="max-w-2xl leading-6">
            {definition.description}
          </CardDescription>
        ) : null}
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent>
          <FieldGroup>
            {definition.fields.map((field, index) => {
              const error = errors[field.id];
              return (
                <Field
                  key={field.id}
                  data-invalid={Boolean(error)}
                  className={index > 0 ? "border-t pt-5" : undefined}
                >
                  <FieldImage field={field} />
                  <FieldLabel htmlFor={field.id} className="text-base">
                    {field.name}
                    {field.required ? (
                      <span className="text-destructive" aria-hidden="true">*</span>
                    ) : null}
                  </FieldLabel>
                  {field.description ? (
                    <FieldDescription>{field.description}</FieldDescription>
                  ) : null}
                  <FormControl
                    field={field}
                    value={answers[field.id]}
                    invalid={Boolean(error)}
                    onChange={(value) => {
                      setAnswers((current) => ({ ...current, [field.id]: value }));
                      setErrors((current) => {
                        const { [field.id]: _removed, ...remaining } = current;
                        return remaining;
                      });
                    }}
                  />
                  <FieldError>{error}</FieldError>
                </Field>
              );
            })}
          </FieldGroup>
          {submitError ? (
            <p role="alert" className="mt-5 text-sm text-destructive">
              {submitError}
            </p>
          ) : null}
        </CardContent>
        <CardFooter className="mt-5 justify-end">
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <Send data-icon="inline-start" />
            )}
            {definition.submitLabel ?? "Enviar resposta"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
