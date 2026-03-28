"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { Button } from "@/components/ui/button";

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
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <motion.div
            className="w-full max-w-xl rounded-xl border border-border/70 bg-card shadow-xl"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
          >
            <div className="border-b border-border/70 px-6 py-4">
              <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
              <p className="text-sm text-muted-foreground">
                {mode === "create"
                  ? "Preencha os campos para criar um novo registro."
                  : "Atualize os dados e salve as alterações."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
              <motion.div
                className="grid gap-4 sm:grid-cols-2"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: {},
                  visible: {
                    transition: {
                      staggerChildren: 0.04,
                      delayChildren: 0.06,
                    },
                  },
                }}
              >
                {fields.map((field) => (
                  <motion.label
                    key={field.key}
                    className="space-y-2 text-sm font-medium"
                    variants={{
                      hidden: { opacity: 0, y: 6 },
                      visible: { opacity: 1, y: 0 },
                    }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
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
                  </motion.label>
                ))}
              </motion.div>

              <motion.div
                className="flex flex-wrap justify-end gap-2 border-t border-border/70 pt-4"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.14, ease: "easeOut" }}
              >
                <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                  {cancelButtonLabel}
                </Button>

                <Button type="submit" disabled={isSubmitting}>
                  {mode === "create" ? "Criar" : "Salvar"}
                </Button>
              </motion.div>
            </form>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
