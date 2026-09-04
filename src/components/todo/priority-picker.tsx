"use client";

import { PRIORITIES, PRIORITY_META } from "@/components/todo/priority";
import type { Priority } from "@/components/todo/types";
import { cn } from "@/lib/utils";

type PriorityPickerProps = {
  value: Priority | null;
  onChange: (value: Priority | null) => void;
};

export function PriorityPicker({ value, onChange }: PriorityPickerProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={cn(
          "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
          value === null
            ? "border-foreground/30 bg-foreground/5 text-foreground"
            : "border-border text-muted-foreground hover:bg-muted"
        )}
      >
        未設定
      </button>
      {PRIORITIES.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            value === p
              ? cn(PRIORITY_META[p].badge, "border-transparent")
              : "border-border text-muted-foreground hover:bg-muted"
          )}
        >
          {PRIORITY_META[p].label}
        </button>
      ))}
    </div>
  );
}
