"use client";

import { STATUS_META } from "@/components/todo/status";
import { TASK_STATUSES, type TaskStatus } from "@/components/todo/types";
import { cn } from "@/lib/utils";

type StatusPickerProps = {
  value: TaskStatus;
  onChange: (value: TaskStatus) => void;
};

export function StatusPicker({ value, onChange }: StatusPickerProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {TASK_STATUSES.map((status) => (
        <button
          key={status}
          type="button"
          onClick={() => onChange(status)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            value === status
              ? cn(STATUS_META[status].badge, "border-transparent")
              : "border-border text-muted-foreground hover:bg-muted"
          )}
        >
          {STATUS_META[status].label}
        </button>
      ))}
    </div>
  );
}
