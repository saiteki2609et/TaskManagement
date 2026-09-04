"use client";

import { Input } from "@/components/ui/input";

export function isDateRangeInvalid(
  startDate: string | null,
  endDate: string | null
): boolean {
  return !!startDate && !!endDate && endDate < startDate;
}

function formatShortDate(value: string): string {
  const [, month, day] = value.split("-");
  return `${Number(month)}/${Number(day)}`;
}

export function formatDateRangeLabel(
  startDate: string | null,
  endDate: string | null
): string | null {
  if (startDate && endDate) {
    return `${formatShortDate(startDate)} 〜 ${formatShortDate(endDate)}`;
  }
  if (startDate) return `${formatShortDate(startDate)} 〜`;
  if (endDate) return `〜 ${formatShortDate(endDate)}`;
  return null;
}

type DateRangeFieldsProps = {
  startDate: string | null;
  endDate: string | null;
  onChangeStart: (value: string | null) => void;
  onChangeEnd: (value: string | null) => void;
};

export function DateRangeFields({
  startDate,
  endDate,
  onChangeStart,
  onChangeEnd,
}: DateRangeFieldsProps) {
  const invalid = isDateRangeInvalid(startDate, endDate);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Input
          type="date"
          value={startDate ?? ""}
          onChange={(e) => onChangeStart(e.target.value || null)}
          aria-label="開始日"
          className="flex-1"
        />
        <span className="shrink-0 text-sm text-muted-foreground">〜</span>
        <Input
          type="date"
          value={endDate ?? ""}
          onChange={(e) => onChangeEnd(e.target.value || null)}
          aria-label="終了日"
          className="flex-1"
        />
      </div>
      {invalid && (
        <p className="text-xs text-destructive">
          終了日は開始日以降の日付にしてください
        </p>
      )}
    </div>
  );
}
