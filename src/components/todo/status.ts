import type { TaskStatus } from "@/components/todo/types";

export const STATUS_META: Record<
  TaskStatus,
  { label: string; badge: string; dot: string }
> = {
  not_started: {
    label: "未着手",
    badge: "bg-muted text-muted-foreground ring-1 ring-inset ring-border",
    dot: "bg-muted-foreground/50",
  },
  in_progress: {
    label: "進行中",
    badge:
      "bg-sky-500/10 text-sky-600 dark:text-sky-400 ring-1 ring-inset ring-sky-500/20",
    dot: "bg-sky-500",
  },
  done: {
    label: "完了",
    badge:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-inset ring-emerald-500/20",
    dot: "bg-emerald-500",
  },
};
