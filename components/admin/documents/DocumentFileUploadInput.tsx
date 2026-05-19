"use client";

import { useEffect, useRef, useState } from "react";
import {
  CircleAlert,
  CloudUpload,
  FileText,
  ImageIcon,
  RotateCcw,
  Upload,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useUploadThing } from "@/components/uploadthing";
import {
  formatDocumentFileSize,
  getUploadedDocumentFileKind,
  getUploadedDocumentFileKindLabel,
  maxDocumentFileSize,
  parseUploadedDocumentFile,
  serializeUploadedDocumentFile,
  type UploadedDocumentFileMetadata,
} from "@/lib/document-config";
import { cn } from "@/lib/utils";

export function DocumentFileUploadInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFile, setUploadedFile] =
    useState<UploadedDocumentFileMetadata | null>(() =>
      parseUploadedDocumentFile(value),
    );
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { startUpload, isUploading } = useUploadThing("documentUploader", {
    uploadProgressGranularity: "fine",
    onUploadProgress: setUploadProgress,
    onClientUploadComplete: (files) => {
      const file = files[0];

      if (!file) {
        setUploadError("O UploadThing não retornou o arquivo enviado.");
        return;
      }

      const nextUploadedFile: UploadedDocumentFileMetadata = {
        name: file.name,
        size: file.size,
        key: file.key,
        ufsUrl: file.ufsUrl,
        hash: file.fileHash,
        mimeType: file.type,
      };

      setUploadedFile(nextUploadedFile);
      setUploadProgress(100);
      setUploadError(null);
      onChange(serializeUploadedDocumentFile(nextUploadedFile));
    },
    onUploadError: (error) => {
      setUploadError(error.message || "Não foi possível enviar o arquivo.");
      setUploadedFile(null);
      onChange("");
    },
  });

  const displayFileName = uploadedFile?.name ?? selectedFile?.name;
  const displayFileSize = uploadedFile?.size ?? selectedFile?.size;
  const displayFileKind = uploadedFile
    ? getUploadedDocumentFileKind(uploadedFile)
    : selectedFile
      ? getUploadedDocumentFileKind({
          name: selectedFile.name,
          mimeType: selectedFile.type,
        })
      : null;
  const displayFileKindLabel = uploadedFile
    ? getUploadedDocumentFileKindLabel(uploadedFile)
    : selectedFile
      ? getUploadedDocumentFileKindLabel({
          name: selectedFile.name,
          mimeType: selectedFile.type,
        })
      : "Arquivo";
  const hasFile = Boolean(displayFileName);

  useEffect(() => {
    if (!value) {
      return;
    }

    setUploadedFile(parseUploadedDocumentFile(value));
    setSelectedFile(null);
    setUploadProgress(0);
    setUploadError(null);
  }, [value]);

  async function uploadFile(file: File) {
    const fileKind = getUploadedDocumentFileKind({
      name: file.name,
      mimeType: file.type,
    });

    if (!fileKind) {
      setUploadError("Envie apenas arquivos PDF, DOCX ou imagens.");
      return;
    }

    if (file.size > maxDocumentFileSize) {
      setUploadError("O arquivo deve ter no máximo 8 MB.");
      return;
    }

    setSelectedFile(file);
    setUploadedFile(null);
    setUploadProgress(0);
    setUploadError(null);
    onChange("");

    try {
      const uploadedFiles = await startUpload([file]);

      if (!uploadedFiles) {
        setUploadError("Não foi possível iniciar o envio do arquivo.");
      }
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Não foi possível enviar o arquivo.",
      );
    }
  }

  function openFileDialog() {
    inputRef.current?.click();
  }

  function removeFile() {
    setSelectedFile(null);
    setUploadedFile(null);
    setUploadProgress(0);
    setUploadError(null);
    onChange("");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className={cn(
          "rounded-xl border bg-background transition-all duration-200",
          isDragging
            ? "border-primary border-dashed bg-primary/5"
            : hasFile
              ? "border-border"
              : "border-muted-foreground/25 border-dashed bg-muted/30",
        )}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);

          const file = event.dataTransfer.files[0];

          if (file) {
            void uploadFile(file);
          }
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*,.pdf,.docx,.jpg,.jpeg,.png,.webp"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];

            if (file) {
              void uploadFile(file);
            }
          }}
        />

        {hasFile ? (
          <div className="flex flex-col gap-4 p-4">
            <div className="flex flex-col gap-4 rounded-lg bg-muted/40 p-4">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {displayFileKind === "image" ? (
                    <ImageIcon className="size-6" />
                  ) : (
                    <FileText className="size-6" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="break-words text-sm font-medium leading-5">
                    {displayFileName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {displayFileKindLabel}
                    {displayFileSize
                      ? ` - ${formatDocumentFileSize(displayFileSize)} MB`
                      : ""}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="sm:w-fit"
                  onClick={openFileDialog}
                  disabled={isUploading}
                >
                  <Upload data-icon="inline-start" />
                  Trocar arquivo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="sm:w-fit"
                  onClick={removeFile}
                  disabled={isUploading}
                >
                  <X data-icon="inline-start" />
                  Remover
                </Button>
              </div>
            </div>

            {isUploading ? (
              <div className="flex flex-col gap-2" aria-live="polite">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Enviando arquivo...</span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <button
            type="button"
            className="flex aspect-21/9 w-full cursor-pointer flex-col items-center justify-center gap-4 p-8 text-center"
            onClick={openFileDialog}
          >
            <span className="rounded-full bg-primary/10 p-4 text-primary">
              <CloudUpload className="size-8" />
            </span>

            <span className="space-y-2">
              <span className="block text-lg font-semibold">Enviar arquivo</span>
              <span className="block text-sm text-muted-foreground">
                Arraste um arquivo para cá ou clique para selecionar.
              </span>
              <span className="block text-xs text-muted-foreground">
                Formatos aceitos: PDF, DOCX ou imagem - Tamanho máximo: 8 MB
              </span>
            </span>

            <span className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium shadow-xs">
              <FileText className="size-4" />
              Procurar arquivo
            </span>
          </button>
        )}
      </div>

      {uploadError ? (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          <div className="flex flex-1 flex-col gap-2">
            <p>{uploadError}</p>
            {selectedFile ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={() => void uploadFile(selectedFile)}
                disabled={isUploading}
              >
                <RotateCcw data-icon="inline-start" />
                Tentar novamente
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
