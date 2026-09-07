import type {
  CellAggregateStatus,
  DeliverableStatus,
} from "@/components/dashboard/types";

export const DELIVERABLE_STATUS_META: Record<
  DeliverableStatus,
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
  on_hold: {
    label: "保留",
    badge:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-inset ring-amber-500/20",
    dot: "bg-amber-500",
  },
  in_review: {
    label: "レビュー中",
    badge:
      "bg-violet-500/10 text-violet-600 dark:text-violet-400 ring-1 ring-inset ring-violet-500/20",
    dot: "bg-violet-500",
  },
  done: {
    label: "完了",
    badge:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-inset ring-emerald-500/20",
    dot: "bg-emerald-500",
  },
};

export const CELL_AGGREGATE_STATUS_META: Record<
  CellAggregateStatus,
  { label: string; badge: string }
> = {
  not_applicable: {
    label: "対象外",
    badge: "bg-muted/50 text-muted-foreground/60",
  },
  partially_delayed: {
    label: "一部遅延",
    badge:
      "bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-1 ring-inset ring-rose-500/30 font-semibold",
  },
  done: {
    label: "完了",
    badge:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-inset ring-emerald-500/20",
  },
  not_started: {
    label: "未着手",
    badge: "bg-muted text-muted-foreground ring-1 ring-inset ring-border",
  },
  in_progress: {
    label: "進行中",
    badge:
      "bg-sky-500/10 text-sky-600 dark:text-sky-400 ring-1 ring-inset ring-sky-500/20",
  },
};
