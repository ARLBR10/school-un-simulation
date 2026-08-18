"use client";

import { isValidElement, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingFn,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  CalendarDays,
  CheckCircle2,
  Copy,
  FileText,
  Filter,
  Globe,
  Hash,
  KeyRound,
  ListChecks,
  Mail,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Search,
  Settings2,
  Text,
  Trash2,
  User,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useLocation, useNavigate } from "@tanstack/react-router";

import {
  AdminTableFormDialog,
  type AdminTableFormField,
} from "@/components/admin/AdminTableFormDialog";
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
import { Card, CardContent } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/reui/data-grid/data-grid";
import { DataGridColumnHeader } from "@/components/reui/data-grid/data-grid-column-header";
import { DataGridColumnVisibility } from "@/components/reui/data-grid/data-grid-column-visibility";
import { DataGridPagination } from "@/components/reui/data-grid/data-grid-pagination";
import { DataGridTable } from "@/components/reui/data-grid/data-grid-table";
import { cn } from "@/lib/utils";

export type { AdminTableSelectOption } from "@/components/admin/AdminTableSelectInput";

type AdminTableRow = Record<string, ReactNode>;

type ReadOnlyFieldKey = "_id" | "_creationTime";
type SearchParamKey<T extends AdminTableRow> = Extract<keyof T, string>;

type EditableFormKey<T extends AdminTableRow> = Exclude<
  Extract<keyof T, string>,
  ReadOnlyFieldKey
>;

type AdminTableFormValues<T extends AdminTableRow> = {
  [K in EditableFormKey<T>]?: string;
};

type AdminTableActionResult = boolean | void;

export type DynamicTableFilter<T extends AdminTableRow = AdminTableRow> = {
  id: string;
  label: string;
  options: AdminTableSelectOption[];
  key?: keyof T;
  value?: string;
  onValueChange?: (value: string) => void;
  getValue?: (row: T) => ReactNode;
  matches?: (row: T, value: string) => boolean;
};

export type DynamicTableFilterPreset = Record<string, string>;

export type AdminTableColumn<T extends AdminTableRow> = {
  key: keyof T;
  label: ReactNode;
  icon?: ReactNode;
  className?: string;
  showInTable?: boolean;
  hiddenByDefault?: boolean;
  showInForm?: boolean;
  showInCreateForm?: boolean;
  showInEditForm?: boolean;
  formLabel?: string;
  formRender?: (props: {
    value: string;
    values: Record<string, string>;
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
  showColumnVisibility?: boolean;
  showPagination?: boolean;
  filters?: DynamicTableFilter<T>[];
  defaultFilterPreset?: DynamicTableFilterPreset;
  openLabel?: ReactNode;
  rowKey?: keyof T;
  copyIdKey?: keyof T;
  searchParamKey?: SearchParamKey<T>;
  onOpen?: (row: T, index: number) => void;
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

function formatFormValue(value: ReactNode) {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (
    Array.isArray(value) &&
    value.every(
      (item) => typeof item === "string" || typeof item === "number",
    )
  ) {
    return value.join(", ");
  }

  return "";
}

function stringifyReactNode(value: ReactNode): string {
  if (value === null || value === undefined || typeof value === "boolean") {
    return "";
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => stringifyReactNode(item)).join(" ");
  }

  if (isValidElement<{ children?: ReactNode }>(value)) {
    return stringifyReactNode(value.props.children);
  }

  return "";
}

function normalizeSearchValue(value: ReactNode) {
  return stringifyReactNode(value).toLocaleLowerCase("pt-BR");
}

function compareCellValues(leftValue: ReactNode, rightValue: ReactNode) {
  const leftText = stringifyReactNode(leftValue);
  const rightText = stringifyReactNode(rightValue);
  const leftNumber = Number(leftText);
  const rightNumber = Number(rightText);

  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    return leftNumber - rightNumber;
  }

  return leftText.localeCompare(rightText, "pt-BR", {
    numeric: true,
    sensitivity: "base",
  });
}

function getColumnLabelText<T extends AdminTableRow>(
  column: AdminTableColumn<T>,
) {
  return stringifyReactNode(column.label) || String(column.key);
}

function getColumnSearchValue<T extends AdminTableRow>(
  row: T,
  column: AdminTableColumn<T>,
) {
  const renderedValue = column.render ? column.render(row) : row[column.key];
  const renderedText = stringifyReactNode(renderedValue);

  if (renderedText) {
    return renderedText;
  }

  return stringifyReactNode(row[column.key]);
}

function getDefaultColumnIcon(key: string): LucideIcon {
  const normalizedKey = key.toLocaleLowerCase("en-US");

  if (normalizedKey.includes("email")) return Mail;
  if (normalizedKey.includes("phone") || normalizedKey.includes("cellphone")) {
    return Phone;
  }
  if (normalizedKey.includes("date") || normalizedKey.includes("time")) {
    return CalendarDays;
  }
  if (normalizedKey.includes("verified") || normalizedKey.startsWith("is")) {
    return CheckCircle2;
  }
  if (normalizedKey.includes("country") || normalizedKey.includes("committee")) {
    return Globe;
  }
  if (normalizedKey.includes("user")) return User;
  if (normalizedKey.includes("member") || normalizedKey.includes("delegate")) {
    return Users;
  }
  if (normalizedKey.includes("topic") || normalizedKey.includes("type")) {
    return ListChecks;
  }
  if (normalizedKey.includes("description")) return FileText;
  if (normalizedKey.includes("password")) return KeyRound;
  if (normalizedKey.includes("id")) return Hash;

  return Text;
}

function isReadOnlyFieldKey(key: string) {
  return key === "_id" || key === "_creationTime";
}

function shouldShowColumnInForm<T extends AdminTableRow>(
  column: AdminTableColumn<T>,
  mode: "create" | "edit",
) {
  if (column.showInForm === false) {
    return false;
  }

  if (mode === "create") {
    return column.showInCreateForm !== false;
  }

  return column.showInEditForm !== false;
}

function getDefaultColumnVisibility<T extends AdminTableRow>(
  columns: AdminTableColumn<T>[],
): VisibilityState {
  return Object.fromEntries(
    columns
      .filter(
        (column) => column.showInTable !== false && column.hiddenByDefault,
      )
      .map((column) => [String(column.key), false]),
  );
}

function removeReadOnlyFields(values: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(values).filter(([key]) => !isReadOnlyFieldKey(key)),
  );
}

function resolveSearchParamValue<T extends AdminTableRow>(
  row: T,
  searchParamKey: SearchParamKey<T>,
) {
  const value = row[searchParamKey];

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  return null;
}

function resolveCopyIdValue<T extends AdminTableRow>(
  row: T,
  copyIdKey?: keyof T,
  rowKey?: keyof T,
) {
  const keys = [copyIdKey, "_id" as keyof T, rowKey];

  for (const key of keys) {
    if (!key || !Object.prototype.hasOwnProperty.call(row, key)) {
      continue;
    }

    const value = stringifyReactNode(row[key]);

    if (value) {
      return value;
    }
  }

  return "";
}

export function DynamicTable<T extends AdminTableRow>({
  columns,
  data,
  isLoading = false,
  className,
  showColumnVisibility = true,
  showPagination = true,
  filters = [],
  defaultFilterPreset = {},
  openLabel = "Abrir",
  rowKey,
  copyIdKey,
  searchParamKey,
  onOpen,
  onChange,
  onCreate,
  onUpdate,
  onDelete,
}: DynamicTableProps<T>) {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const searchParams = new URLSearchParams(location.searchStr);
  const [tableData, setTableData] = useState<T[]>(data);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() =>
    getDefaultColumnVisibility(columns),
  );
  const [globalFilter, setGlobalFilter] = useState("");
  const [filterValues, setFilterValues] = useState<DynamicTableFilterPreset>(
    defaultFilterPreset,
  );
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [rowToEdit, setRowToEdit] = useState<T | null>(null);
  const [rowToEditIndex, setRowToEditIndex] = useState<number | null>(null);
  const referencedRowValue = searchParamKey ? searchParams.get(searchParamKey) : null;

  useEffect(() => {
    setTableData(data);
  }, [data]);

  useEffect(() => {
    if (!searchParamKey) {
      return;
    }

    if (!referencedRowValue) {
      if (isFormOpen && formMode === "edit") {
        setIsFormOpen(false);
        setRowToEdit(null);
        setRowToEditIndex(null);
      }

      return;
    }

    const nextRowIndex = tableData.findIndex(
      (row) => resolveSearchParamValue(row, searchParamKey) === referencedRowValue,
    );

    if (nextRowIndex === -1) {
      if (isFormOpen && formMode === "edit") {
        setIsFormOpen(false);
        setRowToEdit(null);
        setRowToEditIndex(null);
      }

      return;
    }

    const nextRow = tableData[nextRowIndex];
    const currentRowReference =
      rowToEdit && searchParamKey
        ? resolveSearchParamValue(rowToEdit, searchParamKey)
        : null;

    if (
      isFormOpen &&
      formMode === "edit" &&
      currentRowReference === referencedRowValue &&
      rowToEditIndex === nextRowIndex &&
      rowToEdit === nextRow
    ) {
      return;
    }

    setFormMode("edit");
    setRowToEdit(nextRow);
    setRowToEditIndex(nextRowIndex);
    setIsFormOpen(true);
  }, [
    formMode,
    isFormOpen,
    referencedRowValue,
    rowToEdit,
    rowToEditIndex,
    searchParamKey,
    tableData,
  ]);

  const formFields = useMemo<AdminTableFormField[]>(
    () =>
      columns
        .filter((column) => {
          if (!shouldShowColumnInForm(column, formMode)) {
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
              ? ({ value, values, onChange, mode }) =>
                  formRender({
                    value,
                    values,
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
    [columns, formMode, rowToEdit],
  );

  const tableColumns = useMemo(
    () => columns.filter((column) => column.showInTable !== false),
    [columns],
  );

  function getFilterValue(filter: DynamicTableFilter<T>) {
    return filter.value ?? filterValues[filter.id] ?? "";
  }

  function updateFilterValue(filter: DynamicTableFilter<T>, value: string) {
    if (filter.value === undefined) {
      setFilterValues((currentValues) => ({
        ...currentValues,
        [filter.id]: value,
      }));
    }

    filter.onValueChange?.(value);
  }

  const filteredTableData = useMemo(
    () =>
      tableData.filter((row) =>
        filters.every((filter) => {
          const filterValue = getFilterValue(filter);

          if (!filterValue) {
            return true;
          }

          if (filter.matches) {
            return filter.matches(row, filterValue);
          }

          const rowValue = filter.getValue
            ? filter.getValue(row)
            : filter.key
              ? row[filter.key]
              : row[filter.id];

          if (Array.isArray(rowValue)) {
            return rowValue.some(
              (value) => normalizeSearchValue(value) === normalizeSearchValue(filterValue),
            );
          }

          return normalizeSearchValue(rowValue) === normalizeSearchValue(filterValue);
        }),
      ),
    [filterValues, filters, tableData],
  );

  const activeFilterCount = filters.filter((filter) => getFilterValue(filter)).length;

  function resetFilters() {
    setFilterValues((currentValues) =>
      filters.reduce<DynamicTableFilterPreset>(
        (nextValues, filter) => ({
          ...nextValues,
          [filter.id]: "",
        }),
        currentValues,
      ),
    );

    for (const filter of filters) {
      filter.onValueChange?.("");
    }
  }

  const cellSortingFn = useMemo<SortingFn<T>>(
    () => (leftRow, rightRow, columnId) =>
      compareCellValues(leftRow.getValue(columnId), rightRow.getValue(columnId)),
    [],
  );
  const hasRowActions = Boolean(onOpen || onUpdate || onDelete);

  const dataGridColumns: ColumnDef<T>[] = [
    ...tableColumns.map<ColumnDef<T>>((column) => {
      const columnId = String(column.key);
      const title = getColumnLabelText(column);
      const Icon = getDefaultColumnIcon(columnId);

      return {
        id: columnId,
        accessorFn: (row) => row[column.key],
        header: ({ column: tableColumn }) => (
          <DataGridColumnHeader
            column={tableColumn}
            title={title}
            icon={column.icon ?? <Icon />}
            visibility
          />
        ),
        cell: ({ row }) => (
          <div className="min-w-0 truncate">
            {column.render
              ? column.render(row.original)
              : formatCellValue(row.original[column.key])}
          </div>
        ),
        enableHiding: true,
        enableSorting: true,
        sortingFn: cellSortingFn,
        meta: {
          headerTitle: title,
          headerClassName: column.className,
          cellClassName: column.className,
        },
      };
    }),
    ...(hasRowActions
      ? [
          {
            id: "actions",
            header: () => <span className="sr-only">Ações</span>,
            cell: ({ row }) => {
              const rowId = resolveCopyIdValue(row.original, copyIdKey, rowKey);

              if (onOpen) {
                return (
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onOpen(row.original, tableData.indexOf(row.original))}
                    >
                      {openLabel}
                    </Button>
                  </div>
                );
              }

              return (
                <div className="flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Abrir ações"
                        />
                      }
                    >
                      <MoreHorizontal />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuGroup>
                        <DropdownMenuItem
                          disabled={!onUpdate}
                          onClick={() =>
                            handleOpenEdit(row.original, tableData.indexOf(row.original))
                          }
                        >
                          <Pencil />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={!rowId}
                          onClick={() => void navigator.clipboard.writeText(rowId)}
                        >
                          <Copy />
                          Copiar ID
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                      {onDelete ? (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuGroup>
                            <AlertDialog>
                              <AlertDialogTrigger
                                nativeButton={false}
                                render={
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onSelect={(event) => event.preventDefault()}
                                  />
                                }
                              >
                                <Trash2 />
                                Excluir
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
                                    onClick={() =>
                                      void handleDeleteRow(
                                        row.original,
                                        tableData.indexOf(row.original),
                                      )
                                    }
                                  >
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuGroup>
                        </>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            },
            enableHiding: false,
            enableSorting: false,
            size: onOpen ? 88 : 48,
            meta: {
              headerClassName: "px-1 text-right",
              cellClassName: "px-1 text-right",
            },
          } satisfies ColumnDef<T>,
        ]
      : []),
  ];

  const table = useReactTable({
    data: filteredTableData,
    columns: dataGridColumns,
    state: {
      sorting,
      columnVisibility,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 10,
      },
    },
    autoResetPageIndex: false,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, filterValue) => {
      const normalizedFilter = String(filterValue)
        .trim()
        .toLocaleLowerCase("pt-BR");

      if (!normalizedFilter) {
        return true;
      }

      const rowReferenceValues = [
        resolveCopyIdValue(row.original, copyIdKey, rowKey),
        searchParamKey ? resolveSearchParamValue(row.original, searchParamKey) : null,
      ];

      if (
        rowReferenceValues.some((value) =>
          normalizeSearchValue(value).includes(normalizedFilter),
        )
      ) {
        return true;
      }

      return tableColumns.some((column) =>
        normalizeSearchValue(getColumnSearchValue(row.original, column)).includes(
          normalizedFilter,
        ),
      );
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  useEffect(() => {
    if (!showPagination) {
      table.setPageSize(Math.max(tableData.length, 1));
    }
  }, [showPagination, table, tableData.length]);

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

      accumulator[field.key] = formatFormValue(value);

      return accumulator;
    }, baseValues);
  }, [formFields, formMode, rowToEdit]);

  function updateSearchParam(nextValue: string | null) {
    if (!searchParamKey) {
      return;
    }

    const nextSearchParams = new URLSearchParams(searchParams.toString());

    if (nextValue) {
      nextSearchParams.set(searchParamKey, nextValue);
    } else {
      nextSearchParams.delete(searchParamKey);
    }

    const nextQuery = nextSearchParams.toString();
    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;

    void navigate({ to: nextUrl, replace: true });
  }

  function handleOpenCreate() {
    setFormMode("create");
    setRowToEdit(null);
    setRowToEditIndex(null);
    setIsFormOpen(true);

    if (referencedRowValue) {
      updateSearchParam(null);
    }
  }

  function handleOpenEdit(row: T, index: number) {
    const nextReferencedRowValue =
      searchParamKey ? resolveSearchParamValue(row, searchParamKey) : null;

    setFormMode("edit");
    setRowToEdit(row);
    setRowToEditIndex(index);
    setIsFormOpen(true);

    if (nextReferencedRowValue && nextReferencedRowValue !== referencedRowValue) {
      updateSearchParam(nextReferencedRowValue);
    }
  }

  function handleCloseForm() {
    setIsFormOpen(false);
    setRowToEdit(null);
    setRowToEditIndex(null);

    if (referencedRowValue) {
      updateSearchParam(null);
    }
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

      if (onCreate && !onChange) {
        handleCloseForm();
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
    const deletedRowReference =
      searchParamKey ? resolveSearchParamValue(row, searchParamKey) : null;

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

    if (deletedRowReference && deletedRowReference === referencedRowValue) {
      setIsFormOpen(false);
      setRowToEdit(null);
      setRowToEditIndex(null);
      updateSearchParam(null);
    }
  }

  return (
    <section className={cn("flex flex-col gap-4", className)}>
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full sm:max-w-xs">
              <div className="relative w-full sm:max-w-xs [&_svg]:size-4">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={globalFilter}
                  onChange={(event) => setGlobalFilter(event.target.value)}
                  placeholder="Buscar registros..."
                  className="pl-9"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 self-end sm:self-auto">
              {filters.length > 0 ? (
                <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                  <PopoverTrigger
                    render={
                      <Button type="button" variant="outline" size="sm" />
                    }
                  >
                    <Filter data-icon="inline-start" />
                    Filtros
                    {activeFilterCount > 0 ? (
                      <span className="border-l border-border pl-2 text-muted-foreground">
                        {activeFilterCount}
                      </span>
                    ) : null}
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-72 p-0">
                    <PopoverHeader className="sr-only">
                      <PopoverTitle>Filtros da tabela</PopoverTitle>
                    </PopoverHeader>
                    <Command>
                      <CommandInput placeholder="Buscar filtros..." />
                      <CommandList>
                        <CommandEmpty>Nenhum filtro encontrado.</CommandEmpty>
                        {filters.map((filter) => {
                          const value = getFilterValue(filter);

                          return (
                            <CommandGroup key={filter.id} heading={filter.label}>
                              <CommandItem
                                value={`${filter.id} ${filter.label} Todos`}
                                data-checked={!value}
                                onSelect={() => updateFilterValue(filter, "")}
                              >
                                Todos
                              </CommandItem>
                              {filter.options.map((option) => (
                                <CommandItem
                                  key={option.value}
                                  value={`${filter.id} ${filter.label} ${option.label}`}
                                  disabled={option.disabled}
                                  data-checked={option.value === value}
                                  onSelect={() =>
                                    updateFilterValue(
                                      filter,
                                      option.value === value ? "" : option.value,
                                    )
                                  }
                                >
                                  {option.label}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          );
                        })}
                        {activeFilterCount > 0 ? (
                          <>
                            <CommandSeparator />
                            <CommandGroup>
                              <CommandItem onSelect={resetFilters}>
                                <X />
                                Limpar filtros
                              </CommandItem>
                            </CommandGroup>
                          </>
                        ) : null}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              ) : null}
              {showColumnVisibility ? (
                <DataGridColumnVisibility
                  table={table}
                  trigger={
                    <Button type="button" variant="outline" size="sm">
                      <Settings2 data-icon="inline-start" />
                      Colunas
                    </Button>
                  }
                />
              ) : null}
              {onCreate || onChange ? (
                <Button type="button" size="sm" onClick={handleOpenCreate}>
                  <Plus data-icon="inline-start" />
                  Criar
                </Button>
              ) : null}
            </div>
          </div>

          <DataGrid
            table={table}
            recordCount={table.getFilteredRowModel().rows.length}
            isLoading={isLoading}
            emptyMessage="Nenhum registro encontrado."
            tableLayout={{
              columnsVisibility: true,
              headerBackground: true,
              headerBorder: true,
              rowBorder: true,
              width: "fixed",
            }}
          >
            <DataGridContainer className="overflow-x-auto">
              <DataGridTable />
            </DataGridContainer>
            {showPagination ? (
              <DataGridPagination
                info="{from} - {to} de {count}"
                rowsPerPageLabel="Linhas por página"
                previousPageLabel="Página anterior"
                nextPageLabel="Próxima página"
              />
            ) : null}
          </DataGrid>
        </CardContent>
      </Card>

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
