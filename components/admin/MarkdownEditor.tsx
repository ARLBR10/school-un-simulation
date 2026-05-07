"use client";

import { useEffect, useRef, useState } from "react";
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  TRANSFORMERS,
  type ElementTransformer,
  type MultilineElementTransformer,
  type TextMatchTransformer,
  type Transformer,
} from "@lexical/markdown";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import {
  $createHorizontalRuleNode,
  $isHorizontalRuleNode,
  HorizontalRuleNode,
} from "@lexical/react/LexicalHorizontalRuleNode";
import { HorizontalRulePlugin } from "@lexical/react/LexicalHorizontalRulePlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { TablePlugin } from "@lexical/react/LexicalTablePlugin";
import { CodeHighlightNode, CodeNode } from "@lexical/code";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import {
  $createTableCellNode,
  $createTableNode,
  $createTableRowNode,
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  TableCellHeaderStates,
  TableCellNode,
  TableNode,
  TableRowNode,
} from "@lexical/table";
import { $wrapNodeInElement } from "@lexical/utils";
import {
  $createParagraphNode,
  $createTextNode,
  $insertNodes,
  $isRootOrShadowRoot,
  COMMAND_PRIORITY_EDITOR,
} from "lexical";

import { ContentEditable } from "@/components/editor/editor-ui/content-editable";
import {
  INSERT_IMAGE_COMMAND,
  type InsertImagePayload,
} from "@/components/editor/extensions/images-extension";
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
import { LayoutPlugin } from "@/components/editor/plugins/layout-plugin";
import { BlockInsertPlugin } from "@/components/editor/plugins/toolbar/block-insert-plugin";
import { InsertColumnsLayout } from "@/components/editor/plugins/toolbar/block-insert/insert-columns-layout";
import { InsertEmbeds } from "@/components/editor/plugins/toolbar/block-insert/insert-embeds";
import { InsertHorizontalRule } from "@/components/editor/plugins/toolbar/block-insert/insert-horizontal-rule";
import { InsertImage } from "@/components/editor/plugins/toolbar/block-insert/insert-image";
import { InsertTable } from "@/components/editor/plugins/toolbar/block-insert/insert-table";
import {
  $isImageNode,
  $createImageNode,
  ImageNode,
} from "@/components/editor/nodes/image-node";
import {
  $isLayoutContainerNode,
  LayoutContainerNode,
} from "@/components/editor/nodes/layout-container-node";
import {
  $isLayoutItemNode,
  LayoutItemNode,
} from "@/components/editor/nodes/layout-item-node";
import {
  $createTweetNode,
  $isTweetNode,
  TweetNode,
} from "@/components/editor/nodes/embeds/tweet-node";
import {
  $createYouTubeNode,
  $isYouTubeNode,
  YouTubeNode,
} from "@/components/editor/nodes/embeds/youtube-node";
import { AutoEmbedPlugin } from "@/components/editor/plugins/embeds/auto-embed-plugin";
import { TwitterPlugin } from "@/components/editor/plugins/embeds/twitter-plugin";
import { YouTubePlugin } from "@/components/editor/plugins/embeds/youtube-plugin";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const YOUTUBE_URL_REG_EXP =
  /^https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})(?:\S*)?$/;
const TWEET_URL_REG_EXP =
  /^https?:\/\/(?:www\.)?(?:twitter|x)\.com\/(?:#!\/)?\w+\/status(?:es)?\/(\d+)(?:\S*)?$/;
const TABLE_ROW_REG_EXP = /^\|(.+)\|\s*$/;
const TABLE_DIVIDER_REG_EXP = /^(\|\s*:?-{3,}:?\s*)+\|\s*$/;

const IMAGE_TRANSFORMER: TextMatchTransformer = {
  dependencies: [ImageNode],
  export: (node) => {
    if (!$isImageNode(node)) {
      return null;
    }

    return `![${escapeMarkdownLinkText(node.getAltText())}](${node.getSrc()})`;
  },
  importRegExp: /!\[([^\]]*)\]\(([^\s)]+)\)/,
  regExp: /!\[([^\]]*)\]\(([^\s)]+)\)$/,
  replace: (textNode, match) => {
    const [, altText, src] = match;
    textNode.replace($createImageNode({ altText, src }));
  },
  trigger: ")",
  type: "text-match",
};

const HORIZONTAL_RULE_TRANSFORMER: ElementTransformer = {
  dependencies: [HorizontalRuleNode],
  export: (node) => ($isHorizontalRuleNode(node) ? "---" : null),
  regExp: /^\s{0,3}(?:---|\*\*\*|___)\s*$/,
  replace: (parentNode) => {
    parentNode.replace($createHorizontalRuleNode());
  },
  type: "element",
};

const TABLE_TRANSFORMER: MultilineElementTransformer = {
  dependencies: [TableNode, TableRowNode, TableCellNode],
  export: (node, traverseChildren) => {
    if (!$isTableNode(node)) {
      return null;
    }

    const rows = node
      .getChildren()
      .filter($isTableRowNode)
      .map((row) =>
        row
          .getChildren()
          .filter($isTableCellNode)
          .map((cell) => formatTableCell(traverseChildren(cell))),
      );

    if (rows.length === 0 || rows[0].length === 0) {
      return null;
    }

    const columns = Math.max(...rows.map((row) => row.length));
    const normalizedRows = rows.map((row) => padCells(row, columns));
    const divider = Array.from({ length: columns }, () => "---");

    return [normalizedRows[0], divider, ...normalizedRows.slice(1)]
      .map((row) => `| ${row.join(" | ")} |`)
      .join("\n");
  },
  handleImportAfterStartMatch: ({ lines, rootNode, startLineIndex }) => {
    const dividerLine = lines[startLineIndex + 1];

    if (!dividerLine || !TABLE_DIVIDER_REG_EXP.test(dividerLine)) {
      return null;
    }

    const rows = [parseTableRow(lines[startLineIndex])];
    let endLineIndex = startLineIndex + 1;

    for (let index = startLineIndex + 2; index < lines.length; index++) {
      if (!TABLE_ROW_REG_EXP.test(lines[index])) {
        break;
      }

      rows.push(parseTableRow(lines[index]));
      endLineIndex = index;
    }

    rootNode.append(createTableNodeFromRows(rows));

    return [true, endLineIndex];
  },
  regExpStart: TABLE_ROW_REG_EXP,
  replace: () => false,
  type: "multiline-element",
};

const YOUTUBE_TRANSFORMER: ElementTransformer = {
  dependencies: [YouTubeNode],
  export: (node) =>
    $isYouTubeNode(node) ? `https://www.youtube.com/watch?v=${node.getId()}` : null,
  regExp: YOUTUBE_URL_REG_EXP,
  replace: (parentNode, _children, match) => {
    parentNode.replace($createYouTubeNode(match[1]));
  },
  type: "element",
};

const TWEET_TRANSFORMER: ElementTransformer = {
  dependencies: [TweetNode],
  export: (node) =>
    $isTweetNode(node) ? `https://x.com/i/web/status/${node.getId()}` : null,
  regExp: TWEET_URL_REG_EXP,
  replace: (parentNode, _children, match) => {
    parentNode.replace($createTweetNode(match[1]));
  },
  type: "element",
};

const COLUMNS_TRANSFORMER: ElementTransformer = {
  dependencies: [LayoutContainerNode, LayoutItemNode],
  export: (node, traverseChildren) => {
    if (!$isLayoutContainerNode(node)) {
      return null;
    }

    return node
      .getChildren()
      .filter($isLayoutItemNode)
      .map((item) => traverseChildren(item))
      .filter(Boolean)
      .join("\n\n");
  },
  regExp: /$^/,
  replace: () => false,
  type: "element",
};

const MARKDOWN_TRANSFORMERS: Array<Transformer> = [
  IMAGE_TRANSFORMER,
  TABLE_TRANSFORMER,
  HORIZONTAL_RULE_TRANSFORMER,
  YOUTUBE_TRANSFORMER,
  TWEET_TRANSFORMER,
  COLUMNS_TRANSFORMER,
  ...TRANSFORMERS,
];

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
          AutoLinkNode,
          HorizontalRuleNode,
          ImageNode,
          LayoutContainerNode,
          LayoutItemNode,
          TableNode,
          TableRowNode,
          TableCellNode,
          TweetNode,
          YouTubeNode,
        ],
        editorState: () => {
          $convertFromMarkdownString(value, MARKDOWN_TRANSFORMERS);
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
              <Separator orientation="vertical" className="h-6" />
              <BlockInsertPlugin>
                <InsertHorizontalRule />
                <InsertImage />
                <InsertTable />
                <InsertColumnsLayout />
                <InsertEmbeds />
              </BlockInsertPlugin>
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
          <HorizontalRulePlugin />
          <TablePlugin hasHorizontalScroll />
          <ImagesPlugin />
          <LayoutPlugin />
          <AutoEmbedPlugin />
          <TwitterPlugin />
          <YouTubePlugin />
          <MarkdownShortcutPlugin transformers={MARKDOWN_TRANSFORMERS} />
          <FloatingLinkEditorPlugin
            anchorElem={editorContainerRef.current}
            isLinkEditMode={isLinkEditMode}
            setIsLinkEditMode={setIsLinkEditMode}
          />
          <OnChangePlugin
            ignoreSelectionChange
            onChange={(editorState) => {
              editorState.read(() => {
                onChange($convertToMarkdownString(MARKDOWN_TRANSFORMERS));
              });
            }}
          />
        </div>
      </div>
    </LexicalComposer>
  );
}

function ImagesPlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([ImageNode])) {
      throw new Error("ImagesPlugin: ImageNode not registered on editor");
    }

    return editor.registerCommand<InsertImagePayload>(
      INSERT_IMAGE_COMMAND,
      (payload) => {
        const imageNode = $createImageNode(payload);
        $insertNodes([imageNode]);

        if ($isRootOrShadowRoot(imageNode.getParentOrThrow())) {
          $wrapNodeInElement(imageNode, $createParagraphNode).selectEnd();
        }

        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );
  }, [editor]);

  return null;
}

function escapeMarkdownLinkText(value: string) {
  return value.replace(/([\\\]])/g, "\\$1");
}

function formatTableCell(value: string) {
  return value.replace(/\n/g, "<br />").replace(/\|/g, "\\|").trim();
}

function padCells(cells: Array<string>, columns: number) {
  return cells.concat(Array.from({ length: columns - cells.length }, () => ""));
}

function parseTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split(/(?<!\\)\|/)
    .map((cell) => cell.trim().replace(/\\\|/g, "|"));
}

function createTableNodeFromRows(rows: Array<Array<string>>) {
  const tableNode = $createTableNode();
  const columns = Math.max(...rows.map((row) => row.length));

  rows.forEach((row, rowIndex) => {
    const tableRowNode = $createTableRowNode();
    const cells = padCells(row, columns);

    cells.forEach((cell) => {
      const paragraphNode = $createParagraphNode();
      const tableCellNode = $createTableCellNode(
        rowIndex === 0
          ? TableCellHeaderStates.COLUMN
          : TableCellHeaderStates.NO_STATUS,
      );

      paragraphNode.append($createTextNode(cell));
      tableCellNode.append(paragraphNode);
      tableRowNode.append(tableCellNode);
    });

    tableNode.append(tableRowNode);
  });

  return tableNode;
}
