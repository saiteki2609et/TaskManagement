export type GanttUnit = "week" | "month";

const PX_PER_DAY: Record<GanttUnit, number> = {
  week: 64,
  month: 28,
};

export type GanttColumn = { label: string; offsetPx: number };
export type GanttMonthLabel = { label: string; offsetPx: number };

export type GanttScale = {
  rangeStart: Date;
  rangeEnd: Date;
  pxPerDay: number;
  totalWidthPx: number;
  /** 2段目(日)の目盛り */
  columns: GanttColumn[];
  /** 1段目(月)の目盛り。月が変わる列にのみラベルを置く */
  monthLabels: GanttMonthLabel[];
  /** ページング操作の見出しに使う範囲ラベル(例: 「9/1 - 9/7」「2026年9月」) */
  rangeLabel: string;
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

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function dateToOffsetPx(
  date: Date,
  rangeStart: Date,
  pxPerDay: number
): number {
  return diffDays(date, rangeStart) * pxPerDay;
}

// ページング操作で表示中心をずらす。週表示は7日単位、月表示は暦月単位で移動する。
export function shiftGanttAnchor(
  anchor: Date,
  unit: GanttUnit,
  direction: 1 | -1
): Date {
  if (unit === "week") return addDays(anchor, direction * 7);
  return new Date(anchor.getFullYear(), anchor.getMonth() + direction, 1);
}

function formatRangeLabel(unit: GanttUnit, start: Date, end: Date): string {
  if (unit === "month") return `${start.getFullYear()}年${start.getMonth() + 1}月`;
  const sameMonth = start.getMonth() === end.getMonth();
  const startLabel = `${start.getMonth() + 1}/${start.getDate()}`;
  const endLabel = sameMonth
    ? `${end.getDate()}`
    : `${end.getMonth() + 1}/${end.getDate()}`;
  return `${startLabel} - ${endLabel}`;
}

// 週表示は指定日を含む直近1週間、月表示は指定日を含む暦月のみを表示する
// (どちらもページング操作で表示範囲を切り替える。日単位で目盛りを刻む)。
export function buildDateScale(unit: GanttUnit, anchor: Date): GanttScale {
  const pxPerDay = PX_PER_DAY[unit];
  const start = unit === "week" ? startOfWeek(anchor) : startOfMonth(anchor);
  const end = unit === "week" ? addDays(start, 6) : endOfMonth(anchor);
  const totalDays = diffDays(end, start) + 1;
  const totalWidthPx = totalDays * pxPerDay;

  const columns: GanttColumn[] = [];
  const monthLabels: GanttMonthLabel[] = [];
  let cursor = start;
  let lastMonth = -1;
  while (cursor.getTime() <= end.getTime()) {
    const offsetPx = dateToOffsetPx(cursor, start, pxPerDay);
    columns.push({ label: `${cursor.getDate()}`, offsetPx });
    if (cursor.getMonth() !== lastMonth) {
      monthLabels.push({
        label: `${cursor.getFullYear()}/${cursor.getMonth() + 1}`,
        offsetPx,
      });
      lastMonth = cursor.getMonth();
    }
    cursor = addDays(cursor, 1);
  }

  return {
    rangeStart: start,
    rangeEnd: end,
    pxPerDay,
    totalWidthPx,
    columns,
    monthLabels,
    rangeLabel: formatRangeLabel(unit, start, end),
  };
}
