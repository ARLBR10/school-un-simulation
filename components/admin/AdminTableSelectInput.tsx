"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type AdminTableSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type AdminTableSelectInputProps = {
  fieldKey: string;
  mode: "create" | "edit";
  options: AdminTableSelectOption[];
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
};

export function AdminTableSelectInput({
  fieldKey,
  mode,
  options,
  placeholder,
  value,
  onChange,
}: AdminTableSelectInputProps) {
  return (
    <Select
      key={`${fieldKey}-${value || "empty"}`}
      value={value || undefined}
      onValueChange={onChange}
    >
      <SelectTrigger className="w-full rounded-md border-input bg-background px-3 text-foreground shadow-sm hover:bg-background dark:bg-background data-[size=default]:h-10">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            disabled={option.disabled && !(mode === "edit" && option.value === value)}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
