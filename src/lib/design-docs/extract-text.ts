import path from "node:path";

export type ExtractedSection = { label: string; text: string };

export const SUPPORTED_EXTENSIONS = [".md", ".txt", ".docx", ".xlsx", ".pdf"];

export async function extractSections(
  filePath: string,
  buffer: Buffer
): Promise<ExtractedSection[]> {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".md":
      return extractMarkdown(buffer.toString("utf-8"));
    case ".txt":
      return extractPlainText(buffer.toString("utf-8"));
    case ".docx":
      return extractDocx(buffer);
    case ".xlsx":
      return extractXlsx(buffer);
    case ".pdf":
      return extractPdf(buffer);
    default:
      throw new Error(`未対応のファイル形式です: ${ext}`);
  }
}

function extractMarkdown(text: string): ExtractedSection[] {
  const lines = text.split(/\r?\n/);
  const sections: ExtractedSection[] = [];
  let currentLabel = "先頭";
  let buffer: string[] = [];

  function flush() {
    const content = buffer.join("\n").trim();
    if (content) sections.push({ label: currentLabel, text: content });
    buffer = [];
  }

  for (const line of lines) {
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flush();
      currentLabel = heading[2].trim();
    } else {
      buffer.push(line);
    }
  }
  flush();

  return sections.length > 0 ? sections : [{ label: "本文", text: text.trim() }];
}

function extractPlainText(text: string): ExtractedSection[] {
  const trimmed = text.trim();
  return trimmed ? [{ label: "本文", text: trimmed }] : [];
}

function stripHtmlTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

async function extractDocx(buffer: Buffer): Promise<ExtractedSection[]> {
  const mammoth = await import("mammoth");
  const { value: html } = await mammoth.convertToHtml({ buffer });

  const parts = html.split(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi);
  if (parts.length === 1) {
    const content = stripHtmlTags(parts[0]);
    return content ? [{ label: "本文", text: content }] : [];
  }

  const sections: ExtractedSection[] = [];
  const lead = stripHtmlTags(parts[0]);
  if (lead) sections.push({ label: "先頭", text: lead });

  for (let i = 1; i < parts.length; i += 2) {
    const label = stripHtmlTags(parts[i]) || `見出し${Math.ceil(i / 2)}`;
    const content = stripHtmlTags(parts[i + 1] ?? "");
    if (content) sections.push({ label, text: content });
  }
  return sections;
}

async function extractXlsx(buffer: Buffer): Promise<ExtractedSection[]> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, { type: "buffer" });
  return workbook.SheetNames.map((name) => ({
    label: name,
    text: XLSX.utils.sheet_to_txt(workbook.Sheets[name]).trim(),
  })).filter((section) => section.text.length > 0);
}

async function extractPdf(buffer: Buffer): Promise<ExtractedSection[]> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.pages
      .filter((page) => page.text.trim().length > 0)
      .map((page) => ({ label: `page${page.num}`, text: page.text.trim() }));
  } finally {
    await parser.destroy();
  }
}
