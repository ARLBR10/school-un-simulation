"use client";

import { useRef, useState } from "react";
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  TRANSFORMERS,
} from "@lexical/markdown";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { CodeHighlightNode, CodeNode } from "@lexical/code";
import { LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";

import { ContentEditable } from "@/components/editor/editor-ui/content-editable";
import { editorTheme } from "@/components/editor/themes/editor-theme";
import { FloatingLinkEditorPlugin } from "@/components/editor/plugins/floating-link-editor-plugin";
import { FontFormatToolbarPlugin } from "@/components/editor/plugins/toolbar/font-format-toolbar-plugin";
import { HistoryToolbarPlugin } from "@/components/editor/plugins/toolbar/history-toolbar-plugin";
import { LinkToolbarPlugin } from "@/components/editor/plugins/toolbar/link-toolbar-plugin";
import { ToolbarPlugin } from "@/components/editor/plugins/toolbar/toolbar-plugin";
import { BlockFormatDropDown } from "@/components/editor/plugins/toolbar/block-format-toolbar-plugin";
import { FormatBulletedList } from "@/components/editor/plugins/toolbar/block-format/format-bulleted-list";
import { FormatHeading } from "@/components/editor/plugins/toolbar/block-format/format-heading";
import { FormatNumberedList } from "@/components/editor/plugins/toolbar/block-format/format-numbered-list";
import { FormatParagraph } from "@/components/editor/plugins/toolbar/block-format/format-paragraph";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export function MarkdownEditor({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const [isLinkEditMode, setIsLinkEditMode] = useState(false);

  return (
    <LexicalComposer
      initialConfig={{
        namespace: "NewsMarkdownEditor",
        theme: editorTheme,
        nodes: [
          HeadingNode,
          QuoteNode,
          ListNode,
          ListItemNode,
          CodeNode,
          CodeHighlightNode,
          LinkNode,
        ],
        editorState: () => {
          $convertFromMarkdownString(value, TRANSFORMERS);
        },
        onError(error) {
          throw error;
        },
      }}
    >
      <div
        ref={editorContainerRef}
        className={cn(
          "overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm",
          className,
        )}
      >
        <ToolbarPlugin>
          {() => (
            <div className="flex flex-wrap items-center gap-2 border-b border-border/70 bg-muted/20 px-3 py-2">
              <HistoryToolbarPlugin />
              <Separator orientation="vertical" className="h-6" />
              <BlockFormatDropDown>
                <FormatParagraph />
                <FormatHeading levels={["h1", "h2", "h3"]} />
                <FormatBulletedList />
                <FormatNumberedList />
              </BlockFormatDropDown>
              <FontFormatToolbarPlugin />
              <Separator orientation="vertical" className="h-6" />
              <LinkToolbarPlugin setIsLinkEditMode={setIsLinkEditMode} />
            </div>
          )}
        </ToolbarPlugin>

        <div className="relative">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                placeholder="Escreva o corpo da notícia em markdown..."
                className="min-h-[62vh] text-sm text-foreground"
              />
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <ListPlugin />
          <LinkPlugin />
          <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
          <FloatingLinkEditorPlugin
            anchorElem={editorContainerRef.current}
            isLinkEditMode={isLinkEditMode}
            setIsLinkEditMode={setIsLinkEditMode}
          />
          <OnChangePlugin
            ignoreSelectionChange
            onChange={(editorState) => {
              editorState.read(() => {
                onChange($convertToMarkdownString(TRANSFORMERS));
              });
            }}
          />
        </div>
      </div>
    </LexicalComposer>
  );
}
