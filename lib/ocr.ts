export type OcrPage = {
  markdown?: string | null;
  header?: unknown;
  footer?: unknown;
  hyperlinks?: readonly unknown[] | null;
  images?: readonly unknown[] | null;
  tables?: readonly unknown[] | null;
};

const cjkCharacterRegex = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g;

function hasStructuredOcrContent(page: OcrPage) {
  return Boolean(
    page.header ||
      page.footer ||
      page.hyperlinks?.length ||
      page.images?.length ||
      page.tables?.length,
  );
}

function isLikelyBlankPageHallucination(page: OcrPage) {
  const markdown = page.markdown?.trim() ?? "";

  if (!markdown) {
    return !hasStructuredOcrContent(page);
  }

  if (hasStructuredOcrContent(page)) {
    return false;
  }

  const cjkCharacters = markdown.match(cjkCharacterRegex) ?? [];

  if (cjkCharacters.length < 80) {
    return false;
  }

  const nonWhitespaceLength = markdown.replace(/\s/g, "").length;
  const cjkRatio = cjkCharacters.length / nonWhitespaceLength;
  const uniqueCjkRatio = new Set(cjkCharacters).size / cjkCharacters.length;

  return cjkRatio > 0.6 && uniqueCjkRatio < 0.2;
}

export function sanitizeOcrPages<T extends OcrPage>(pages: readonly T[]) {
  return pages.filter((page) => !isLikelyBlankPageHallucination(page));
}
