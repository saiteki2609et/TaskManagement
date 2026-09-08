import type { ExtractedSection } from "@/lib/design-docs/extract-text";

export type Chunk = {
  sectionLabel: string;
  content: string;
  chunkIndex: number;
};

export function chunkText(
  sections: ExtractedSection[],
  options: { maxChars: number; overlapChars: number } = {
    maxChars: 800,
    overlapChars: 100,
  }
): Chunk[] {
  const chunks: Chunk[] = [];
  let chunkIndex = 0;

  for (const section of sections) {
    const text = section.text.trim();
    if (!text) continue;

    if (text.length <= options.maxChars) {
      chunks.push({ sectionLabel: section.label, content: text, chunkIndex: chunkIndex++ });
      continue;
    }

    let start = 0;
    while (start < text.length) {
      const end = Math.min(text.length, start + options.maxChars);
      chunks.push({
        sectionLabel: section.label,
        content: text.slice(start, end),
        chunkIndex: chunkIndex++,
      });
      if (end >= text.length) break;
      start = end - options.overlapChars;
    }
  }

  return chunks;
}
