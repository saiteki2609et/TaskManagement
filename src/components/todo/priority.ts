import type { Priority } from "@/components/todo/types";

export const PRIORITIES: Priority[] = [1, 2, 3];

export const PRIORITY_META: Record<
  Priority,
  { label: string; dot: string; badge: string; ring: string }
> = {
  1: {
    label: "高",
    dot: "bg-rose-500",
    badge:
      "bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-1 ring-inset ring-rose-500/20",
    ring: "border-rose-500/60",
  },
  2: {
    label: "中",
    dot: "bg-amber-500",
    badge:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-inset ring-amber-500/20",
    ring: "border-amber-500/60",
  },
  3: {
    label: "低",
    dot: "bg-sky-500",
    badge:
      "bg-sky-500/10 text-sky-600 dark:text-sky-400 ring-1 ring-inset ring-sky-500/20",
    ring: "border-sky-500/60",
  },
};
