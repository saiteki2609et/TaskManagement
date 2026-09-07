"use client";

import { isDelayed } from "@/components/dashboard/aggregate-status";
import {
  dateToOffsetPx,
  type GanttScale,
} from "@/components/dashboard/gantt-date-scale";
import { DELIVERABLE_STATUS_META } from "@/components/dashboard/status";
import type { Deliverable } from "@/components/dashboard/types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function formatDate(value: string | null): string {
  return value ?? "未設定";
}

export function GanttBar({
  deliverable,
  scale,
}: {
  deliverable: Deliverable;
  scale: GanttScale;
}) {
  const plannedStart = deliverable.plannedStartDate
    ? new Date(deliverable.plannedStartDate)
    : null;
  const plannedEnd = deliverable.plannedEndDate
    ? new Date(deliverable.plannedEndDate)
    : null;
  const delayed = isDelayed(deliverable);

  if (!plannedStart && !plannedEnd) {
    return (
      <p className="flex h-10 items-center text-xs text-muted-foreground/70">
        予定日未設定
      </p>
    );
  }

  const anchor = plannedStart ?? plannedEnd!;
  const plannedLeft = dateToOffsetPx(anchor, scale.rangeStart, scale.pxPerDay);
  const plannedEndPx = plannedEnd
    ? dateToOffsetPx(plannedEnd, scale.rangeStart, scale.pxPerDay) + scale.pxPerDay
    : plannedLeft + scale.pxPerDay;
  const plannedWidth = Math.max(scale.pxPerDay, plannedEndPx - plannedLeft);

  let actualLeft: number | null = null;
  let actualWidth = 0;
  if (deliverable.actualStartDate) {
    const actualStart = new Date(deliverable.actualStartDate);
    actualLeft = dateToOffsetPx(actualStart, scale.rangeStart, scale.pxPerDay);
    const actualEndDate = deliverable.actualEndDate
      ? new Date(deliverable.actualEndDate)
      : new Date();
    actualWidth = Math.max(
      scale.pxPerDay,
      dateToOffsetPx(actualEndDate, scale.rangeStart, scale.pxPerDay) +
        scale.pxPerDay -
        actualLeft
    );
  } else if (plannedStart && plannedEnd && deliverable.progress > 0) {
    actualLeft = plannedLeft;
    actualWidth = Math.round((plannedWidth * deliverable.progress) / 100);
  }

  const statusMeta = DELIVERABLE_STATUS_META[deliverable.status];
  const delayDays = delayed
    ? Math.max(
        0,
        Math.round((Date.now() - new Date(deliverable.plannedEndDate!).getTime()) / 86_400_000)
      )
    : 0;

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "absolute top-1/2 h-5 -translate-y-1/2 rounded-full bg-muted-foreground/20",
          delayed && "ring-2 ring-rose-500"
        )}
        style={{ left: plannedLeft, width: plannedWidth }}
      >
        {actualLeft !== null && actualWidth > 0 && (
          <span
            className={cn("absolute inset-y-0 rounded-full", statusMeta.dot)}
            style={{ left: actualLeft - plannedLeft, width: actualWidth }}
          />
        )}
      </PopoverTrigger>
      <PopoverContent className="w-64 space-y-1">
        <p className="text-sm font-medium">{deliverable.name}</p>
        <p className="text-xs text-muted-foreground">
          予定: {formatDate(deliverable.plannedStartDate)} 〜{" "}
          {formatDate(deliverable.plannedEndDate)}
        </p>
        <p className="text-xs text-muted-foreground">
          実績: {formatDate(deliverable.actualStartDate)} 〜{" "}
          {formatDate(deliverable.actualEndDate)}
        </p>
        {delayed && (
          <p className="text-xs font-medium text-rose-600">遅延: {delayDays}日</p>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function GanttRollupBar({
  deliverables,
  scale,
}: {
  deliverables: Deliverable[];
  scale: GanttScale;
}) {
  const starts = deliverables
    .map((d) => d.plannedStartDate)
    .filter((v): v is string => v !== null);
  const ends = deliverables
    .map((d) => d.plannedEndDate)
    .filter((v): v is string => v !== null);
  if (starts.length === 0 || ends.length === 0) return null;

  const minStart = new Date(starts.reduce((a, b) => (a < b ? a : b)));
  const maxEnd = new Date(ends.reduce((a, b) => (a > b ? a : b)));
  const left = dateToOffsetPx(minStart, scale.rangeStart, scale.pxPerDay);
  const width = Math.max(
    scale.pxPerDay,
    dateToOffsetPx(maxEnd, scale.rangeStart, scale.pxPerDay) + scale.pxPerDay - left
  );

  return (
    <div
      className="absolute top-1/2 h-3 -translate-y-1/2 rounded-full bg-muted-foreground/30"
      style={{ left, width }}
    />
  );
}
