"use client";

import { useDroppable } from "@dnd-kit/core";

import { CELL_AGGREGATE_STATUS_META } from "@/components/dashboard/status";
import type { CellAggregateStatus } from "@/components/dashboard/types";
import { cn } from "@/lib/utils";

type MatrixCellProps = {
  featureId: string;
  phaseId: string;
  status: CellAggregateStatus;
  doneCount: number;
  totalCount: number;
  onClick: () => void;
};

export function MatrixCell({
  featureId,
  phaseId,
  status,
  doneCount,
  totalCount,
  onClick,
}: MatrixCellProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `${featureId}:${phaseId}`,
    data: { featureId, phaseId },
  });
  const meta = CELL_AGGREGATE_STATUS_META[status];

  return (
    <td
      ref={setNodeRef}
      className={cn(
        "p-1.5 align-middle text-center transition-colors",
        isOver && "bg-primary/10 ring-2 ring-inset ring-primary/40"
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center justify-center rounded-md px-2 py-1.5 hover:bg-muted/60"
      >
        {status === "not_applicable" ? (
          <span className="text-xs text-muted-foreground">-</span>
        ) : (
          <span
            className={cn(
              "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs",
              meta.badge
            )}
          >
            {meta.label}
            {totalCount > 0 && ` (${doneCount}/${totalCount})`}
          </span>
        )}
      </button>
    </td>
  );
}
