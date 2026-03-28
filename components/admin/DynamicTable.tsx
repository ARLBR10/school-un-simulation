"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { AdminTableFormDialog, type AdminTableFormField } from "@/components/admin/AdminTableFormDialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AdminTableRow = Record<string, ReactNode>;

type ReadOnlyFieldKey = "_id" | "_creationTime";

type EditableFormKey<T extends AdminTableRow> = Exclude<
  Extract<keyof T, string>,
  ReadOnlyFieldKey
>;

type AdminTableFormValues<T extends AdminTableRow> = {
  [K in EditableFormKey<T>]?: string;
};

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
  className?: string;
  rowKey?: keyof T;
  onChange?: (
    data: T[],
    event: AdminTableChangeEvent<T>,
  ) => void | Promise<void>;
  onCreate?: (values: AdminTableFormValues<T>) => void | Promise<void>;
  onUpdate?: (row: T, values: AdminTableFormValues<T>) => void | Promise<void>;
  onDelete?: (row: T) => void | Promise<void>;
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
      let nextData: T[] = [];

      setTableData((currentData) => {
        nextData = [...currentData, newRow];
        return nextData;
      });

      if (onCreate) {
        await onCreate(typedValues);
      }

      if (onChange) {
        await onChange(nextData, {
          type: "create",
          row: newRow,
          index: nextData.length - 1,
        });
      }
    }

    if (formMode === "edit" && rowToEdit && rowToEditIndex !== null) {
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

      if (onUpdate) {
        await onUpdate(rowToEdit, typedValues);
      }

      if (onChange) {
        await onChange(nextData, {
          type: "update",
          row: updatedRow,
          index: rowToEditIndex,
          previousRow: rowToEdit,
        });
      }
    }

    handleCloseForm();
  }

  async function handleDeleteRow(row: T, index: number) {
    let nextData: T[] = [];

    setTableData((currentData) => {
      nextData = currentData.filter((_, currentIndex) => currentIndex !== index);
      return nextData;
    });

    if (onDelete) {
      await onDelete(row);
    }

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

            <tbody>
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
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => void handleDeleteRow(row, index)}
                        >
                          Excluir
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
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
