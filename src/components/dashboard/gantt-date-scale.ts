import type { Deliverable } from "@/components/dashboard/types";

export type GanttUnit = "week" | "month" | "quarter";

const PX_PER_DAY: Record<GanttUnit, number> = {
  week: 40,
  month: 12,
  quarter: 4,
};

export type GanttColumn = { label: string; offsetPx: number };

export type GanttScale = {
  rangeStart: Date;
  pxPerDay: number;
  totalWidthPx: number;
  columns: GanttColumn[];
};

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
  const d = startOfDay(date);
  d.setDate(d.getDate() + days);
  return d;
}

function diffDays(a: Date, b: Date): number {
  return Math.round(
    (startOfDay(a).getTime() - startOfDay(b).getTime()) / 86_400_000
  );
}

function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  return addDays(d, -d.getDay());
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

// 週表示は1日ごと、月表示は1週間ごと、四半期表示は1か月ごとに目盛りを刻む。
function nextColumnStart(date: Date, unit: GanttUnit): Date {
  if (unit === "week") return addDays(date, 1);
  if (unit === "month") return addDays(date, 7);
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

function formatColumnLabel(date: Date, unit: GanttUnit): string {
  if (unit === "quarter") return `${date.getFullYear()}/${date.getMonth() + 1}`;
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export function dateToOffsetPx(
  date: Date,
  rangeStart: Date,
  pxPerDay: number
): number {
  return diffDays(date, rangeStart) * pxPerDay;
}

export function buildDateScale(
  unit: GanttUnit,
  rangeStart: Date,
  rangeEnd: Date
): GanttScale {
  const pxPerDay = PX_PER_DAY[unit];
  const start =
    unit === "week"
      ? startOfDay(rangeStart)
      : unit === "month"
        ? startOfWeek(rangeStart)
        : startOfMonth(rangeStart);
  const totalDays = Math.max(1, diffDays(rangeEnd, start));
  const totalWidthPx = totalDays * pxPerDay;

  const columns: GanttColumn[] = [];
  let cursor = start;
  while (cursor.getTime() <= rangeEnd.getTime()) {
    columns.push({
      label: formatColumnLabel(cursor, unit),
      offsetPx: dateToOffsetPx(cursor, start, pxPerDay),
    });
    cursor = nextColumnStart(cursor, unit);
  }

  return { rangeStart: start, pxPerDay, totalWidthPx, columns };
}

export function computeDateRange(deliverables: Deliverable[]): {
  start: Date;
  end: Date;
} {
  const dates: Date[] = [];
  for (const d of deliverables) {
    if (d.plannedStartDate) dates.push(new Date(d.plannedStartDate));
    if (d.plannedEndDate) dates.push(new Date(d.plannedEndDate));
    if (d.actualStartDate) dates.push(new Date(d.actualStartDate));
    if (d.actualEndDate) dates.push(new Date(d.actualEndDate));
  }

  const today = new Date();
  if (dates.length === 0) {
    return { start: addDays(today, -7), end: addDays(today, 21) };
  }

  const min = new Date(Math.min(...dates.map((d) => d.getTime())));
  const max = new Date(Math.max(...dates.map((d) => d.getTime()), today.getTime()));
  return { start: addDays(min, -3), end: addDays(max, 3) };
}
