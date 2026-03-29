"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export type AdminTableFormField = {
  key: string;
  label: string;
  renderInput?: (props: {
    value: string;
    onChange: (value: string) => void;
    mode: "create" | "edit";
  }) => ReactNode;
};

type AdminTableFormDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  fields: AdminTableFormField[];
  initialValues: Record<string, string>;
  cancelButtonLabel?: string;
  onClose: () => void;
  onSubmit: (values: Record<string, string>) => Promise<void>;
};

export function AdminTableFormDialog({
  open,
  mode,
  fields,
  initialValues,
  cancelButtonLabel = "Cancelar",
  onClose,
  onSubmit,
}: AdminTableFormDialogProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setValues(initialValues);
  }, [initialValues, open]);

  const title = useMemo(
    () => (mode === "create" ? `Criar registro` : `Editar registro`),
    [mode],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await onSubmit(values);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
    >
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto border-border/70 bg-card p-0 sm:max-w-xl"
      >
        <SheetHeader className="border-b border-border/70 px-6 py-4">
          <SheetTitle className="text-lg font-semibold tracking-tight">{title}</SheetTitle>
          <SheetDescription>
            {mode === "create"
              ? "Preencha os campos para criar um novo registro."
              : "Atualize os dados e salve as alterações."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          <div className="flex flex-col gap-2">
            {fields.map((field) => (
              <label key={field.key} className="flex flex-col gap-1 text-sm font-medium">
                <span>{field.label}</span>
                {field.renderInput ? (
                  field.renderInput({
                    value: values[field.key] ?? "",
                    mode,
                    onChange: (value) =>
                      setValues((currentValues) => ({
                        ...currentValues,
                        [field.key]: value,
                      })),
                  })
                ) : (
                  <input
                    type="text"
                    value={values[field.key] ?? ""}
                    onChange={(event) =>
                      setValues((currentValues) => ({
                        ...currentValues,
                        [field.key]: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring/50"
                  />
                )}
              </label>
            ))}
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-border/70 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              {cancelButtonLabel}
            </Button>

            <Button type="submit" disabled={isSubmitting}>
              {mode === "create" ? "Criar" : "Salvar"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
