"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { AdminTableFormDialog, type AdminTableFormField } from "@/components/admin/AdminTableFormDialog";
import {
  AdminTableSelectInput,
  type AdminTableSelectOption,
} from "@/components/admin/AdminTableSelectInput";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type { AdminTableSelectOption } from "@/components/admin/AdminTableSelectInput";

type AdminTableRow = Record<string, ReactNode>;

type ReadOnlyFieldKey = "_id" | "_creationTime";

type EditableFormKey<T extends AdminTableRow> = Exclude<
  Extract<keyof T, string>,
  ReadOnlyFieldKey
>;

type AdminTableFormValues<T extends AdminTableRow> = {
  [K in EditableFormKey<T>]?: string;
};

type AdminTableActionResult = boolean | void;

export type AdminTableColumn<T extends AdminTableRow> = {
  key: keyof T;
  label: ReactNode;
  className?: string;
  showInTable?: boolean;
  showInForm?: boolean;
  formLabel?: string;
  formRender?: (props: {
    value: string;
    onChange: (value: string) => void;
    mode: "create" | "edit";
    row: T | null;
  }) => ReactNode;
  formSelectOptions?: AdminTableSelectOption[];
  formSelectPlaceholder?: string;
  render?: (row: T) => ReactNode;
};

export type AdminTableChangeEvent<T extends AdminTableRow> = {
  type: "create" | "update" | "delete";
  row: T;
  index: number;
  previousRow?: T;
};

type DynamicTableProps<T extends AdminTableRow> = {
  columns: AdminTableColumn<T>[];
  data: T[];
  isLoading?: boolean;
  className?: string;
  rowKey?: keyof T;
  onChange?: (
    data: T[],
    event: AdminTableChangeEvent<T>,
  ) => void | Promise<void>;
  onCreate?: (
    values: AdminTableFormValues<T>,
  ) => AdminTableActionResult | Promise<AdminTableActionResult>;
  onUpdate?: (
    row: T,
    values: AdminTableFormValues<T>,
  ) => AdminTableActionResult | Promise<AdminTableActionResult>;
  onDelete?: (row: T) => AdminTableActionResult | Promise<AdminTableActionResult>;
};

function formatCellValue(value: ReactNode) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return value;
}

function isReadOnlyFieldKey(key: string) {
  return key === "_id" || key === "_creationTime";
}

function removeReadOnlyFields(values: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(values).filter(([key]) => !isReadOnlyFieldKey(key)),
  );
}

export function DynamicTable<T extends AdminTableRow>({
  columns,
  data,
  isLoading = false,
  className,
  rowKey,
  onChange,
  onCreate,
  onUpdate,
  onDelete,
}: DynamicTableProps<T>) {
  const [tableData, setTableData] = useState<T[]>(data);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [rowToEdit, setRowToEdit] = useState<T | null>(null);
  const [rowToEditIndex, setRowToEditIndex] = useState<number | null>(null);

  useEffect(() => {
    setTableData(data);
  }, [data]);

  const formFields = useMemo<AdminTableFormField[]>(
    () =>
      columns
        .filter((column) => {
          if (column.showInForm === false) {
            return false;
          }

          return !isReadOnlyFieldKey(String(column.key));
        })
        .map((column) => {
          const formRender = column.formRender;
          const selectOptions = column.formSelectOptions;

          return {
            key: String(column.key),
            label:
              column.formLabel ??
              (typeof column.label === "string" ? column.label : String(column.key)),
            renderInput: formRender
              ? ({ value, onChange, mode }) =>
                  formRender({
                    value,
                    onChange,
                    mode,
                    row: rowToEdit,
                  })
              : selectOptions
                ? ({ value, onChange, mode }) => (
                    <AdminTableSelectInput
                      fieldKey={String(column.key)}
                      mode={mode}
                      options={selectOptions}
                      placeholder={column.formSelectPlaceholder}
                      value={value}
                      onChange={onChange}
                    />
                  )
              : undefined,
          };
        }),
    [columns, rowToEdit],
  );

  const tableColumns = useMemo(
    () => columns.filter((column) => column.showInTable !== false),
    [columns],
  );

  const formInitialValues = useMemo(() => {
    const baseValues: Record<string, string> = {};

    for (const field of formFields) {
      baseValues[field.key] = "";
    }

    if (formMode !== "edit" || !rowToEdit) {
      return baseValues;
    }

    return formFields.reduce<Record<string, string>>((accumulator, field) => {
      const value = rowToEdit[field.key];

      accumulator[field.key] =
        typeof value === "string" || typeof value === "number" ? String(value) : "";

      return accumulator;
    }, baseValues);
  }, [formFields, formMode, rowToEdit]);

  function handleOpenCreate() {
    setFormMode("create");
    setRowToEdit(null);
    setRowToEditIndex(null);
    setIsFormOpen(true);
  }

  function handleOpenEdit(row: T, index: number) {
    setFormMode("edit");
    setRowToEdit(row);
    setRowToEditIndex(index);
    setIsFormOpen(true);
  }

  function handleCloseForm() {
    setIsFormOpen(false);
    setRowToEdit(null);
    setRowToEditIndex(null);
  }

  async function handleSubmitForm(values: Record<string, string>) {
    const typedValues = removeReadOnlyFields(values) as AdminTableFormValues<T>;

    if (formMode === "create") {
      const newRow = typedValues as unknown as T;
      let shouldApplyChange = true;

      if (onCreate) {
        try {
          const createResult = await onCreate(typedValues);
          shouldApplyChange = createResult !== false;
        } catch {
          shouldApplyChange = false;
        }
      }

      if (!shouldApplyChange) {
        return;
      }

      let nextData: T[] = [];

      setTableData((currentData) => {
        nextData = [...currentData, newRow];
        return nextData;
      });

      if (onChange) {
        await onChange(nextData, {
          type: "create",
          row: newRow,
          index: nextData.length - 1,
        });
      }

      handleCloseForm();
      return;
    }

    if (formMode === "edit" && rowToEdit && rowToEditIndex !== null) {
      let shouldApplyChange = true;

      if (onUpdate) {
        try {
          const updateResult = await onUpdate(rowToEdit, typedValues);
          shouldApplyChange = updateResult !== false;
        } catch {
          shouldApplyChange = false;
        }
      }

      if (!shouldApplyChange) {
        return;
      }

      const updatedRow = {
        ...rowToEdit,
        ...(typedValues as unknown as Partial<T>),
      } as T;
      let nextData: T[] = [];

      setTableData((currentData) => {
        nextData = currentData.map((row, index) => {
          if (index === rowToEditIndex) {
            return updatedRow;
          }

          return row;
        });

        return nextData;
      });

      if (onChange) {
        await onChange(nextData, {
          type: "update",
          row: updatedRow,
          index: rowToEditIndex,
          previousRow: rowToEdit,
        });
      }

      handleCloseForm();
    }
  }

  async function handleDeleteRow(row: T, index: number) {
    let shouldApplyChange = true;

    if (onDelete) {
      try {
        const deleteResult = await onDelete(row);
        shouldApplyChange = deleteResult !== false;
      } catch {
        shouldApplyChange = false;
      }
    }

    if (!shouldApplyChange) {
      return;
    }

    let nextData: T[] = [];

    setTableData((currentData) => {
      nextData = currentData.filter((_, currentIndex) => currentIndex !== index);
      return nextData;
    });

    if (onChange) {
      await onChange(nextData, {
        type: "delete",
        row,
        index,
      });
    }
  }

  function resolveRowKey(row: T, index: number) {
    if (!rowKey) {
      return `row-${index}`;
    }

    const value = row[rowKey];

    if (typeof value === "string" || typeof value === "number") {
      return String(value);
    }

    return `row-${index}`;
  }

  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={handleOpenCreate}>
          Criar
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border/70 bg-card">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {tableColumns.map((column) => (
                  <th
                    key={String(column.key)}
                    className={cn(
                      "px-4 py-3 text-left font-medium text-muted-foreground",
                      column.className,
                    )}
                  >
                    {column.label}
                  </th>
                ))}

                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Ações
                </th>
              </tr>
            </thead>

            <AnimatePresence mode="wait" initial={false}>
              {isLoading ? (
                <motion.tbody
                  key="table-loading"
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  {Array.from({ length: 4 }).map((_, index) => (
                    <tr key={`loading-row-${index}`} className="border-t">
                      {tableColumns.map((column) => (
                        <td key={String(column.key)} className="px-4 py-3 align-middle">
                          <div className="h-4 w-full max-w-44 animate-pulse rounded-md bg-muted/70" />
                        </td>
                      ))}
                      <td className="px-4 py-3 align-middle">
                        <div className="h-8 w-24 animate-pulse rounded-md bg-muted/70" />
                      </td>
                    </tr>
                  ))}
                </motion.tbody>
              ) : (
                <motion.tbody
                  key="table-content"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.24, ease: "easeOut" }}
                >
                  {tableData.length === 0 ? (
                    <tr>
                      <td
                        colSpan={tableColumns.length + 1}
                        className="px-4 py-8 text-center text-muted-foreground"
                      >
                        Nenhum registro encontrado.
                      </td>
                    </tr>
                  ) : (
                    tableData.map((row, index) => (
                      <tr key={resolveRowKey(row, index)} className="border-t">
                        {tableColumns.map((column) => (
                          <td key={String(column.key)} className="px-4 py-3 align-middle">
                            {column.render ? column.render(row) : formatCellValue(row[column.key])}
                          </td>
                        ))}

                        <td className="px-4 py-3 align-middle">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEdit(row, index)}
                            >
                              Editar
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button type="button" variant="destructive" size="sm">
                                  Excluir
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent size="sm">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    variant="destructive"
                                    onClick={() => void handleDeleteRow(row, index)}
                                  >
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </motion.tbody>
              )}
            </AnimatePresence>
          </table>
        </div>
      </div>

      <AdminTableFormDialog
        open={isFormOpen}
        mode={formMode}
        fields={formFields}
        initialValues={formInitialValues}
        onClose={handleCloseForm}
        onSubmit={handleSubmitForm}
      />
    </section>
  );
}
