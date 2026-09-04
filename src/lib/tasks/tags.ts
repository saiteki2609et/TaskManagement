export function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function serializeTags(tags: string[]): string {
  return tags
    .map((tag) => tag.trim())
    .filter(Boolean)
    .join(",");
}
