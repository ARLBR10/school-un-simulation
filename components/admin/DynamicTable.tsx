"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  type ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type HeaderContext,
  type PaginationState,
  type Row,
  type SortingState,
  type VisibilityState,
  useReactTable,
} from "@tanstack/react-table";
import {
  MoreHorizontalIcon,
  SearchIcon,
  Settings2Icon,
  XIcon,
} from "lucide-react";

import { AdminTableFormDialog, type AdminTableFormField } from "@/components/admin/AdminTableFormDialog";
import {
  AdminTableSelectInput,
  type AdminTableSelectOption,
} from "@/components/admin/AdminTableSelectInput";
import { DataGrid } from "@/components/reui/data-grid/data-grid";
import { DataGridColumnHeader } from "@/components/reui/data-grid/data-grid-column-header";
import { DataGridColumnVisibility } from "@/components/reui/data-grid/data-grid-column-visibility";
import { DataGridPagination } from "@/components/reui/data-grid/data-grid-pagination";
import { DataGridScrollArea } from "@/components/reui/data-grid/data-grid-scroll-area";
import { DataGridTable } from "@/components/reui/data-grid/data-grid-table";
import {
  Frame,
  FrameFooter,
  FrameHeader,
  FramePanel,
} from "@/components/reui/frame";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
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
const defaultPageIndex = 0;
const defaultPageSize = 10;

export type AdminTableColumn<T extends AdminTableRow> = {
  key: keyof T;
  label: ReactNode;
  className?: string;
  showInTable?: boolean;
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
  rowKey?: keyof T;
  searchParamKey?: SearchParamKey<T>;
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

function parsePositiveInteger(value: string | null, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue < 1) {
    return fallback;
  }

  return parsedValue;
}

function normalizeSearchableValue(value: ReactNode): string {
  if (value === null || value === undefined || typeof value === "boolean") {
    return "";
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(normalizeSearchableValue).join(" ");
  }

  return "";
}

function rowMatchesSearch<T extends AdminTableRow>(row: T, searchQuery: string) {
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  if (!normalizedSearchQuery) {
    return true;
  }

  return Object.values(row)
    .map(normalizeSearchableValue)
    .join(" ")
    .toLowerCase()
    .includes(normalizedSearchQuery);
}

function resolveTableHeader<T extends AdminTableRow>(
  columnDefinition: AdminTableColumn<T>,
  column: HeaderContext<T, unknown>["column"],
) {
  if (typeof columnDefinition.label !== "string") {
    return columnDefinition.label;
  }

  return (
    <DataGridColumnHeader
      title={columnDefinition.label}
      visibility={true}
      column={column}
    />
  );
}

function DynamicTableActionsCell<T extends AdminTableRow>({
  row,
  onEdit,
  onDelete,
}: {
  row: Row<T>;
  onEdit: (row: T, index: number) => void;
  onDelete: (row: T, index: number) => void;
}) {
  return (
    <AlertDialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label="Abrir ações"
          >
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => onEdit(row.original, row.index)}>
              Editar
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <AlertDialogTrigger asChild>
              <DropdownMenuItem
                variant="destructive"
                onSelect={(event) => event.preventDefault()}
              >
                Excluir
              </DropdownMenuItem>
            </AlertDialogTrigger>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

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
            onClick={() => onDelete(row.original, row.index)}
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function DynamicTable<T extends AdminTableRow>({
  columns,
  data,
  isLoading = false,
  className,
  rowKey,
  searchParamKey,
  onChange,
  onCreate,
  onUpdate,
  onDelete,
}: DynamicTableProps<T>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tableData, setTableData] = useState<T[]>(data);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [rowToEdit, setRowToEdit] = useState<T | null>(null);
  const [rowToEditIndex, setRowToEditIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState(
    () => searchParams.get("q") ?? "",
  );
  const [pagination, setPagination] = useState<PaginationState>(() => ({
    pageIndex:
      parsePositiveInteger(searchParams.get("page"), defaultPageIndex + 1) - 1,
    pageSize: parsePositiveInteger(searchParams.get("perPage"), defaultPageSize),
  }));
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
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

  const [columnOrder, setColumnOrder] = useState<string[]>(() => [
    ...tableColumns.map((column) => String(column.key)),
    "actions",
  ]);

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

  const replaceQueryParams = useCallback(
    (updates: Record<string, string | null>) => {
      const nextSearchParams = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          nextSearchParams.set(key, value);
        } else {
          nextSearchParams.delete(key);
        }
      }

      const nextQuery = nextSearchParams.toString();
      const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;

      router.replace(nextUrl);
    },
    [pathname, router, searchParams],
  );

  function updateSearchParam(nextValue: string | null) {
    if (!searchParamKey) {
      return;
    }

    replaceQueryParams({ [searchParamKey]: nextValue });
  }

  function handleSearchQueryChange(nextSearchQuery: string) {
    setSearchQuery(nextSearchQuery);
    setPagination((currentPagination) => ({
      ...currentPagination,
      pageIndex: defaultPageIndex,
    }));
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

  function resolveRowKey(row: T, index: number) {
    if (!rowKey) {
      return `row-${index}`;
    }

    const value = row[rowKey];

    if (typeof value === "string" || typeof value === "number") {
      return `${String(value)}-${index}`;
    }

    return `row-${index}`;
  }

  const dataGridColumns: ColumnDef<T>[] = [
    ...tableColumns.map((columnDefinition) => ({
      id: String(columnDefinition.key),
      accessorFn: (row) => row[columnDefinition.key],
      header: ({ column }) => resolveTableHeader(columnDefinition, column),
      cell: ({ row }) => {
        const originalRow = row.original;

        return columnDefinition.render
          ? columnDefinition.render(originalRow)
          : formatCellValue(originalRow[columnDefinition.key]);
      },
      enableSorting: true,
      enableHiding: true,
      size: 180,
      meta: {
        headerTitle:
          typeof columnDefinition.label === "string"
            ? columnDefinition.label
            : String(columnDefinition.key),
        headerClassName: columnDefinition.className,
        cellClassName: columnDefinition.className,
        skeleton: <Skeleton className="h-4 w-full max-w-44" />,
      },
    } satisfies ColumnDef<T>)),
    {
      id: "actions",
      header: "Ações",
      cell: ({ row }) => (
        <DynamicTableActionsCell
          row={row}
          onEdit={handleOpenEdit}
          onDelete={(nextRow, index) => void handleDeleteRow(nextRow, index)}
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 80,
      meta: {
        headerTitle: "Ações",
        headerClassName: "text-right",
        cellClassName: "text-right",
        skeleton: <Skeleton className="ml-auto h-7 w-7" />,
      },
    },
  ];

  useEffect(() => {
    const nextSearchQuery = searchParams.get("q") ?? "";
    const nextPageIndex =
      parsePositiveInteger(searchParams.get("page"), defaultPageIndex + 1) - 1;
    const nextPageSize = parsePositiveInteger(
      searchParams.get("perPage"),
      defaultPageSize,
    );

    setSearchQuery((currentSearchQuery) =>
      currentSearchQuery === nextSearchQuery
        ? currentSearchQuery
        : nextSearchQuery,
    );
    setPagination((currentPagination) => {
      if (
        currentPagination.pageIndex === nextPageIndex &&
        currentPagination.pageSize === nextPageSize
      ) {
        return currentPagination;
      }

      return {
        pageIndex: nextPageIndex,
        pageSize: nextPageSize,
      };
    });
  }, [searchParams]);

  useEffect(() => {
    const nextPage = pagination.pageIndex > 0
      ? String(pagination.pageIndex + 1)
      : null;
    const nextPageSize = pagination.pageSize !== defaultPageSize
      ? String(pagination.pageSize)
      : null;
    const nextSearchQuery = searchQuery.trim() || null;

    if (
      (searchParams.get("page") ?? null) === nextPage &&
      (searchParams.get("perPage") ?? null) === nextPageSize &&
      (searchParams.get("q") ?? null) === nextSearchQuery
    ) {
      return;
    }

    replaceQueryParams({
      page: nextPage,
      perPage: nextPageSize,
      q: nextSearchQuery,
    });
  }, [
    pagination.pageIndex,
    pagination.pageSize,
    replaceQueryParams,
    searchParams,
    searchQuery,
  ]);

  useEffect(() => {
    const nextColumnIds = [
      ...tableColumns.map((column) => String(column.key)),
      "actions",
    ];

    setColumnOrder((currentColumnOrder) => {
      const currentColumnIds = new Set(nextColumnIds);
      const preservedColumnIds = currentColumnOrder.filter((columnId) =>
        currentColumnIds.has(columnId),
      );
      const addedColumnIds = nextColumnIds.filter(
        (columnId) => !preservedColumnIds.includes(columnId),
      );

      if (
        preservedColumnIds.length === currentColumnOrder.length &&
        addedColumnIds.length === 0
      ) {
        return currentColumnOrder;
      }

      return [...preservedColumnIds, ...addedColumnIds];
    });
  }, [tableColumns]);

  const table = useReactTable({
    columns: dataGridColumns,
    data: tableData,
    getRowId: resolveRowKey,
    state: {
      pagination,
      sorting,
      columnOrder,
      columnVisibility,
      globalFilter: searchQuery,
    },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onColumnOrderChange: setColumnOrder,
    onColumnVisibilityChange: setColumnVisibility,
    autoResetPageIndex: false,
    globalFilterFn: (row, _columnId, filterValue) =>
      rowMatchesSearch(row.original, String(filterValue)),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const filteredRecordCount = table.getFilteredRowModel().rows.length;

  useEffect(() => {
    setPagination((currentPagination) => {
      const pageCount = Math.max(
        1,
        Math.ceil(filteredRecordCount / currentPagination.pageSize),
      );

      if (currentPagination.pageIndex < pageCount) {
        return currentPagination;
      }

      return {
        ...currentPagination,
        pageIndex: pageCount - 1,
      };
    });
  }, [filteredRecordCount]);

  return (
    <section className={cn("space-y-4", className)}>
      <DataGrid
        table={table}
        recordCount={filteredRecordCount}
        isLoading={isLoading}
        emptyMessage="Nenhum registro encontrado."
        loadingMessage="Carregando..."
        tableLayout={{
          columnsMovable: true,
          columnsPinnable: true,
          columnsResizable: false,
          columnsVisibility: true,
        }}
      >
        <Frame className="w-full" stacked dense>
          <FrameHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <InputGroup className="w-full bg-background sm:w-72">
              <InputGroupAddon align="inline-start">
                <SearchIcon />
              </InputGroupAddon>
              <InputGroupInput
                aria-label="Buscar registros"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(event) => handleSearchQueryChange(event.target.value)}
              />
              {searchQuery.length > 0 && (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    aria-label="Limpar busca"
                    title="Limpar"
                    size="icon-xs"
                    onClick={() => handleSearchQueryChange("")}
                  >
                    <XIcon />
                  </InputGroupButton>
                </InputGroupAddon>
              )}
            </InputGroup>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <DataGridColumnVisibility
                table={table}
                trigger={
                  <Button type="button" variant="outline" size="sm">
                    <Settings2Icon />
                    Colunas
                  </Button>
                }
              />
              <Button type="button" size="sm" onClick={handleOpenCreate}>
                Criar
              </Button>
            </div>
          </FrameHeader>
          <FramePanel className="p-0 shadow-none">
            <DataGridScrollArea>
              <DataGridTable />
            </DataGridScrollArea>
          </FramePanel>
          {(isLoading || filteredRecordCount > 0) && (
            <FrameFooter className="px-2.5 py-1.5">
              <DataGridPagination
                info="{from} - {to} de {count}"
                rowsPerPageLabel="Linhas por página"
                previousPageLabel="Ir para a página anterior"
                nextPageLabel="Ir para a próxima página"
              />
            </FrameFooter>
          )}
        </Frame>
      </DataGrid>

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
