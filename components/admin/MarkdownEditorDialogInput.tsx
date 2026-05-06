"use client";

import { useState } from "react";
import { Edit3 } from "lucide-react";

import { MarkdownEditor } from "@/components/admin/MarkdownEditor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function getBodySummary(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "Nenhum conteúdo escrito.";
  }

  return `${trimmedValue.length} caracteres em markdown.`;
}

export function MarkdownEditorDialogInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draftValue, setDraftValue] = useState(value);
  const [editorKey, setEditorKey] = useState(0);

  function openEditor() {
    setDraftValue(value);
    setEditorKey((currentKey) => currentKey + 1);
    setOpen(true);
  }

  function applyDraft() {
    onChange(draftValue);
    setOpen(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        className="justify-start"
        onClick={openEditor}
      >
        <Edit3 data-icon="inline-start" />
        Editar corpo da notícia
      </Button>
      <p className="text-xs font-normal text-muted-foreground">
        {getBodySummary(value)}
      </p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex h-[min(92vh,920px)] w-[calc(100vw-1.5rem)] max-w-none flex-col gap-0 overflow-hidden border-border/70 bg-card p-0 sm:max-w-[calc(100vw-1.5rem)] xl:max-w-[1600px]">
          <DialogHeader className="border-b border-border/70 px-6 py-4">
            <DialogTitle>Editor de notícia</DialogTitle>
            <DialogDescription>
              Edite o corpo em markdown, incluindo links e formatação básica.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <MarkdownEditor
              key={editorKey}
              value={draftValue}
              onChange={setDraftValue}
              className="min-h-full"
            />
          </div>

          <DialogFooter className="mx-0 mb-0 rounded-none border-t border-border/70 bg-muted/20 px-6 py-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={applyDraft}>
              Aplicar conteúdo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
