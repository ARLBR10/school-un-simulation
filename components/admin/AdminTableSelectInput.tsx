"use client";

import { useState } from "react";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  disabled?: boolean;
  value: string;
  onChange: (value: string) => void;
};

export function AdminTableSelectInput({
  fieldKey,
  mode,
  options,
  placeholder,
  disabled = false,
  value,
  onChange,
}: AdminTableSelectInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const selectedOption =
    options.find((option) => option.value === value) ?? null;

  function isOptionDisabled(option: AdminTableSelectOption) {
    return option.disabled && !(mode === "edit" && option.value === value);
  }

  return (
    <div className="relative w-full">
      <Combobox
        key={`${fieldKey}-${value || "empty"}`}
        items={options}
        open={disabled ? false : isOpen}
        inputValue={searchValue}
        value={selectedOption}
        itemToStringLabel={(option) => option.label}
        itemToStringValue={(option) => option.value}
        isItemEqualToValue={(option, selectedValue) =>
          option.value === selectedValue.value
        }
        onOpenChange={(nextOpen) => {
          if (disabled) {
            return;
          }

          setIsOpen(nextOpen);

          if (!nextOpen) {
            setSearchValue("");
          }
        }}
        onInputValueChange={setSearchValue}
        onValueChange={(option) => {
          if (disabled) {
            return;
          }

          onChange(option?.value ?? "");
          setIsOpen(false);
          setSearchValue("");
        }}
        autoHighlight
      >
        <ComboboxTrigger
          render={
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              className={cn(
                "h-10 w-full justify-between rounded-md border-input bg-background px-3 font-normal text-foreground shadow-sm hover:bg-background dark:bg-background",
                !selectedOption && "text-muted-foreground",
              )}
            />
          }
        >
          <span className="min-w-0 flex-1 truncate text-left">
            <ComboboxValue placeholder={placeholder} />
          </span>
        </ComboboxTrigger>
        <ComboboxContent>
          <ComboboxInput
            showTrigger={false}
            placeholder={placeholder ?? "Buscar opção"}
          />
          <ComboboxEmpty>Nenhuma opção encontrada.</ComboboxEmpty>
          <ComboboxList>
            {(option) => (
              <ComboboxItem
                key={option.value}
                value={option}
                disabled={isOptionDisabled(option)}
              >
                {option.label}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}
