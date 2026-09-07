"use client";

import { useDraggable } from "@dnd-kit/core";

import type { DeliverableType, Phase } from "@/components/dashboard/types";
import { cn } from "@/lib/utils";

type DeliverableTypePaletteProps = {
  types: DeliverableType[];
  phases: Phase[];
};

export function DeliverableTypePalette({
  types,
  phases,
}: DeliverableTypePaletteProps) {
  if (types.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
        成果物種類が未登録です。「成果物種類を管理」から追加してください
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-muted/30 p-3">
      {types.map((type) => (
        <PaletteBadge
          key={type.id}
          type={type}
          phaseName={phases.find((p) => p.id === type.defaultPhaseId)?.name}
        />
      ))}
    </div>
  );
}

function PaletteBadge({
  type,
  phaseName,
}: {
  type: DeliverableType;
  phaseName?: string;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette:${type.id}`,
    data: { typeId: type.id },
  });

  return (
    <button
      type="button"
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "cursor-grab touch-none rounded-full border border-border bg-background px-3 py-1 text-xs font-medium shadow-sm active:cursor-grabbing",
        isDragging && "opacity-40"
      )}
      title={phaseName ? `想定工程: ${phaseName}` : undefined}
    >
      {type.name}
    </button>
  );
}
