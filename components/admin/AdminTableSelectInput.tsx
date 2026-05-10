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
  const [isOpen, setIsOpen] = useState(false);
  const [portalContainer, setPortalContainer] =
    useState<HTMLDivElement | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const selectedOption =
    options.find((option) => option.value === value) ?? null;

  function isOptionDisabled(option: AdminTableSelectOption) {
    return option.disabled && !(mode === "edit" && option.value === value);
  }

  return (
    <div ref={setPortalContainer} className="relative w-full">
      <Combobox
        key={`${fieldKey}-${value || "empty"}`}
        items={options}
        open={isOpen}
        inputValue={searchValue}
        value={selectedOption}
        itemToStringLabel={(option) => option.label}
        itemToStringValue={(option) => option.value}
        isItemEqualToValue={(option, selectedValue) =>
          option.value === selectedValue.value
        }
        onOpenChange={(nextOpen) => {
          setIsOpen(nextOpen);

          if (!nextOpen) {
            setSearchValue("");
          }
        }}
        onInputValueChange={setSearchValue}
        onValueChange={(option) => {
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
        <ComboboxContent portalContainer={portalContainer}>
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
