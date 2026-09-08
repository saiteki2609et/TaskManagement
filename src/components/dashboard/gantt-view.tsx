"use client";

import * as React from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronLeft, ChevronRight, GripVertical } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { countDelayed } from "@/components/dashboard/aggregate-status";
import { DeliverableDetailDialog } from "@/components/dashboard/deliverable-detail-dialog";
import type { DeliverableUpdate } from "@/components/dashboard/cell-detail-panel";
import { GanttBar, GanttRollupBar } from "@/components/dashboard/gantt-bar";
import {
  buildDateScale,
  shiftGanttAnchor,
  type GanttScale,
  type GanttUnit,
} from "@/components/dashboard/gantt-date-scale";
import type { Deliverable, Feature, Phase } from "@/components/dashboard/types";
import {
  deleteDeliverableAction,
  updateDeliverableAction,
} from "@/lib/actions/deliverables";
import { reorderFeaturesAction } from "@/lib/actions/features";
import { cn } from "@/lib/utils";

const ALL_VALUE = "__all__";

const UNIT_LABEL: Record<GanttUnit, string> = {
  week: "週",
  month: "月",
};

type GanttViewProps = {
  projectId: string;
  initialFeatures: Feature[];
  phases: Phase[];
  initialDeliverables: Deliverable[];
};

export function GanttView({
  projectId,
  initialFeatures,
  phases,
  initialDeliverables,
}: GanttViewProps) {
  const [features, setFeatures] = React.useState(initialFeatures);
  const [deliverables, setDeliverables] = React.useState(initialDeliverables);
  const [unit, setUnit] = React.useState<GanttUnit>("month");
  const [anchor, setAnchor] = React.useState(() => new Date());
  const [expandedFeatureIds, setExpandedFeatureIds] = React.useState<
    Set<string>
  >(new Set());
  const [filterFeatureId, setFilterFeatureId] = React.useState(ALL_VALUE);
  const [filterPhaseId, setFilterPhaseId] = React.useState(ALL_VALUE);
  const [selectedDeliverable, setSelectedDeliverable] =
    React.useState<Deliverable | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  async function handleUpdateDeliverable(id: string, data: DeliverableUpdate) {
    try {
      const fresh = await updateDeliverableAction(id, data);
      setDeliverables(fresh);
      setSelectedDeliverable(fresh.find((d) => d.id === id) ?? null);
      toast.success("保存しました");
    } catch {
      toast.error("保存に失敗しました");
    }
  }

  async function handleDeleteDeliverable(id: string) {
    try {
      const fresh = await deleteDeliverableAction(id);
      setDeliverables(fresh);
      setSelectedDeliverable(null);
      toast.success("成果物を削除しました");
    } catch {
      toast.error("削除に失敗しました");
    }
  }

  function toggleExpand(featureId: string) {
    setExpandedFeatureIds((prev) => {
      const next = new Set(prev);
      if (next.has(featureId)) next.delete(featureId);
      else next.add(featureId);
      return next;
    });
  }

  const filteredDeliverables = React.useMemo(
    () =>
      deliverables.filter(
        (d) =>
          (filterFeatureId === ALL_VALUE || d.featureId === filterFeatureId) &&
          (filterPhaseId === ALL_VALUE || d.phaseId === filterPhaseId)
      ),
    [deliverables, filterFeatureId, filterPhaseId]
  );

  const groups = React.useMemo(
    () =>
      features
        .filter((f) => filterFeatureId === ALL_VALUE || f.id === filterFeatureId)
        .map((feature) => ({
          feature,
          deliverables: filteredDeliverables.filter(
            (d) => d.featureId === feature.id
          ),
        }))
        .filter((group) => group.deliverables.length > 0),
    [features, filteredDeliverables, filterFeatureId]
  );

  const scale = React.useMemo(
    () => buildDateScale(unit, anchor),
    [unit, anchor]
  );

  function handlePage(direction: 1 | -1) {
    setAnchor((prev) => shiftGanttAnchor(prev, unit, direction));
  }

  async function handleFeatureDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // フィルタ等で一部の機能行が非表示の場合でも、表示中の行同士の並び替えとして
    // 解釈し、非表示の機能は元の相対位置を保ったまま全体の並び順にマージする。
    const visibleIds = groups.map((g) => g.feature.id);
    const oldIndex = visibleIds.indexOf(String(active.id));
    const newIndex = visibleIds.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    const reorderedVisible = arrayMove(visibleIds, oldIndex, newIndex);

    const previous = features;
    let cursor = 0;
    const merged = features.map((f) =>
      visibleIds.includes(f.id) ? reorderedVisible[cursor++] : f.id
    );
    const reordered = merged.map((id) => features.find((f) => f.id === id)!);
    setFeatures(reordered);

    try {
      const fresh = await reorderFeaturesAction(
        projectId,
        reordered.map((f) => f.id)
      );
      setFeatures(fresh);
    } catch {
      setFeatures(previous);
      toast.error("並び替えに失敗しました");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-lg border border-border p-1">
            {(Object.keys(UNIT_LABEL) as GanttUnit[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setUnit(value)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  unit === value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                {UNIT_LABEL[value]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => handlePage(-1)}
              aria-label="前へ"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-28 text-center text-xs font-medium">
              {scale.rangeLabel}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => handlePage(1)}
              aria-label="次へ"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setAnchor(new Date())}
            >
              今日
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Select
            items={[
              { label: "機能: 全て", value: ALL_VALUE },
              ...features.map((f) => ({ label: f.name, value: f.id })),
            ]}
            value={filterFeatureId}
            onValueChange={(value) => setFilterFeatureId(String(value))}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>機能: 全て</SelectItem>
              {features.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            items={[
              { label: "工程: 全て", value: ALL_VALUE },
              ...phases.map((p) => ({ label: p.name, value: p.id })),
            ]}
            value={filterPhaseId}
            onValueChange={(value) => setFilterPhaseId(String(value))}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>工程: 全て</SelectItem>
              {phases.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          表示できる成果物がありません
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          {/* DndContextはtable内に直接置くと内部のアクセシビリティ用divが
              <table>の不正な子要素になりハイドレーションエラーになるため、
              tableの外側で囲む(SortableContextはDOMを生成しないため内側でよい)。 */}
          <DndContext sensors={sensors} onDragEnd={handleFeatureDragEnd}>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th
                    rowSpan={2}
                    className="sticky left-0 z-10 w-56 min-w-56 border-b border-border bg-background p-2 text-left align-bottom text-xs font-medium text-muted-foreground"
                  >
                    機能 / 成果物
                  </th>
                  <th className="border-b border-border p-0 align-bottom">
                    <div
                      className="relative h-6"
                      style={{ width: scale.totalWidthPx }}
                    >
                      {scale.monthLabels.map((label) => (
                        <div
                          key={label.offsetPx}
                          className="absolute top-0 bottom-0 border-l border-border/60 pl-1 text-left text-xs font-medium whitespace-nowrap text-foreground"
                          style={{ left: label.offsetPx }}
                        >
                          {label.label}
                        </div>
                      ))}
                    </div>
                  </th>
                </tr>
                <tr>
                  <th className="border-b border-border p-0 align-bottom">
                    <div
                      className="relative h-6"
                      style={{ width: scale.totalWidthPx }}
                    >
                      {scale.columns.map((col) => (
                        <div
                          key={col.offsetPx}
                          className="absolute top-0 bottom-0 border-l border-border/60 pl-1 text-left text-xs whitespace-nowrap text-muted-foreground"
                          style={{ left: col.offsetPx, width: scale.pxPerDay }}
                        >
                          {col.label}
                        </div>
                      ))}
                    </div>
                  </th>
                </tr>
              </thead>
              <SortableContext
                items={groups.map((g) => g.feature.id)}
                strategy={verticalListSortingStrategy}
              >
                <tbody>
                  {groups.map((group) => (
                    <GanttFeatureRow
                      key={group.feature.id}
                      feature={group.feature}
                      deliverables={group.deliverables}
                      expanded={expandedFeatureIds.has(group.feature.id)}
                      delayedCount={countDelayed(group.deliverables)}
                      scale={scale}
                      onToggleExpand={() => toggleExpand(group.feature.id)}
                      onSelectDeliverable={setSelectedDeliverable}
                    />
                  ))}
                </tbody>
              </SortableContext>
            </table>
          </DndContext>
        </div>
      )}

      <DeliverableDetailDialog
        deliverable={selectedDeliverable}
        onOpenChange={(open) => !open && setSelectedDeliverable(null)}
        onUpdate={handleUpdateDeliverable}
        onDelete={handleDeleteDeliverable}
      />
    </div>
  );
}

function GanttFeatureRow({
  feature,
  deliverables,
  expanded,
  delayedCount,
  scale,
  onToggleExpand,
  onSelectDeliverable,
}: {
  feature: Feature;
  deliverables: Deliverable[];
  expanded: boolean;
  delayedCount: number;
  scale: GanttScale;
  onToggleExpand: () => void;
  onSelectDeliverable: (deliverable: Deliverable) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: feature.id });

  return (
    <>
      <tr
        ref={setNodeRef}
        style={{
          transform: CSS.Transform.toString(transform),
          transition,
          opacity: isDragging ? 0.5 : 1,
        }}
        className="cursor-pointer hover:bg-muted/40"
        onClick={onToggleExpand}
      >
        <td className="sticky left-0 z-10 border-b border-border bg-background p-2 font-medium">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              {...attributes}
              {...listeners}
              onClick={(e) => e.stopPropagation()}
              aria-label="ドラッグして並び替え"
              className="flex h-4 w-4 shrink-0 cursor-grab items-center justify-center text-muted-foreground/50 active:cursor-grabbing"
            >
              <GripVertical className="h-3.5 w-3.5" />
            </button>
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
                expanded && "rotate-90"
              )}
            />
            <span className="truncate">{feature.name}</span>
            {delayedCount > 0 && (
              <span className="shrink-0 text-xs font-medium text-rose-600">
                (遅延{delayedCount}件)
              </span>
            )}
          </div>
        </td>
        <td className="border-b border-border p-0">
          <div
            className="relative h-10 overflow-hidden"
            style={{ width: scale.totalWidthPx }}
          >
            <GanttRollupBar deliverables={deliverables} scale={scale} />
          </div>
        </td>
      </tr>
      {expanded &&
        deliverables.map((deliverable) => (
          <tr
            key={deliverable.id}
            className="cursor-pointer hover:bg-muted/40"
            onClick={() => onSelectDeliverable(deliverable)}
          >
            <td className="sticky left-0 z-10 border-b border-border bg-background p-2 pl-8 text-muted-foreground">
              <span className="truncate">{deliverable.name}</span>
            </td>
            <td className="border-b border-border p-0">
              <div
                className="relative h-10 overflow-hidden"
                style={{ width: scale.totalWidthPx }}
              >
                <GanttBar
                  deliverable={deliverable}
                  scale={scale}
                  onClick={() => onSelectDeliverable(deliverable)}
                />
              </div>
            </td>
          </tr>
        ))}
    </>
  );
}
