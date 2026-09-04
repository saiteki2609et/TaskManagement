"use client";

import * as React from "react";
import { X } from "lucide-react";

type TagsInputProps = {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
};

export function TagsInput({ tags, onChange, placeholder }: TagsInputProps) {
  const [draft, setDraft] = React.useState("");

  function commitDraft() {
    const value = draft.trim();
    setDraft("");
    if (!value || tags.includes(value)) return;
    onChange([...tags, value]);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commitDraft();
    } else if (e.key === "Backspace" && draft === "" && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-input bg-transparent px-2 py-1.5 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
      {tags.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-foreground"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            aria-label={`${tag} を削除`}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commitDraft}
        placeholder={tags.length === 0 ? placeholder : undefined}
        className="min-w-24 flex-1 bg-transparent py-0.5 text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
