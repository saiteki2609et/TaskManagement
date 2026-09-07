"use client";

import * as React from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  buildMatrix,
  phaseCompletionSummary,
  projectCompletionSummary,
} from "@/components/dashboard/aggregate-status";
import { CellDetailPanel } from "@/components/dashboard/cell-detail-panel";
import { DeliverableTypeManager } from "@/components/dashboard/deliverable-type-manager";
import { DeliverableTypePalette } from "@/components/dashboard/deliverable-type-palette";
import { MatrixCell } from "@/components/dashboard/matrix-cell";
import { PhaseFeatureManager } from "@/components/dashboard/phase-feature-manager";
import type {
  Deliverable,
  DeliverableStatus,
  DeliverableType,
  Feature,
  Phase,
} from "@/components/dashboard/types";
import {
  createDeliverableFromDropAction,
  deleteDeliverableAction,
  updateDeliverableAction,
} from "@/lib/actions/deliverables";

type PendingDrop = {
  featureId: string;
  phaseId: string;
  typeId: string;
  step: "phase_mismatch" | "duplicate";
};

type ProgressMatrixViewProps = {
  projectId: string;
  initialFeatures: Feature[];
  initialPhases: Phase[];
  initialTypes: DeliverableType[];
  initialDeliverables: Deliverable[];
};

export function ProgressMatrixView({
  projectId,
  initialFeatures,
  initialPhases,
  initialTypes,
  initialDeliverables,
}: ProgressMatrixViewProps) {
  const [features, setFeatures] = React.useState(initialFeatures);
  const [phases, setPhases] = React.useState(initialPhases);
  const [types, setTypes] = React.useState(initialTypes);
  const [deliverables, setDeliverables] = React.useState(initialDeliverables);
  const [activeCell, setActiveCell] = React.useState<{
    featureId: string;
    phaseId: string;
  } | null>(null);
  const [pendingDrop, setPendingDrop] = React.useState<PendingDrop | null>(
    null
  );
  const [draggingTypeId, setDraggingTypeId] = React.useState<string | null>(
    null
  );
  const [phaseFeatureManagerOpen, setPhaseFeatureManagerOpen] =
    React.useState(false);
  const [typeManagerOpen, setTypeManagerOpen] = React.useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const matrix = React.useMemo(
    () => buildMatrix(features, phases, deliverables),
    [features, phases, deliverables]
  );
  const projectSummary = React.useMemo(
    () => projectCompletionSummary(deliverables),
    [deliverables]
  );

  async function executeAdd(featureId: string, phaseId: string, typeId: string) {
    const feature = features.find((f) => f.id === featureId);
    const type = types.find((t) => t.id === typeId);
    try {
      const fresh = await createDeliverableFromDropAction({
        projectId,
        featureId,
        phaseId,
        typeId,
      });
      setDeliverables(fresh);
      toast.success(`「${feature?.name ?? ""} ${type?.name ?? ""}」を追加しました`);
    } catch {
      toast.error("追加に失敗しました");
    }
  }

  function attemptAdd(featureId: string, phaseId: string, typeId: string) {
    const type = types.find((t) => t.id === typeId);
    if (!type) return;
    const hasDuplicate = deliverables.some(
      (d) => d.featureId === featureId && d.phaseId === phaseId && d.typeId === typeId
    );
    const needsPhaseConfirm =
      type.defaultPhaseId !== null && type.defaultPhaseId !== phaseId;

    if (needsPhaseConfirm) {
      setPendingDrop({ featureId, phaseId, typeId, step: "phase_mismatch" });
    } else if (hasDuplicate) {
      setPendingDrop({ featureId, phaseId, typeId, step: "duplicate" });
    } else {
      void executeAdd(featureId, phaseId, typeId);
    }
  }

  function handlePendingConfirm() {
    if (!pendingDrop) return;
    const { featureId, phaseId, typeId, step } = pendingDrop;
    if (step === "phase_mismatch") {
      const hasDuplicate = deliverables.some(
        (d) =>
          d.featureId === featureId && d.phaseId === phaseId && d.typeId === typeId
      );
      if (hasDuplicate) {
        setPendingDrop({ featureId, phaseId, typeId, step: "duplicate" });
        return;
      }
    }
    setPendingDrop(null);
    void executeAdd(featureId, phaseId, typeId);
  }

  function handleDragStart(event: DragStartEvent) {
    const typeId = event.active.data.current?.typeId as string | undefined;
    setDraggingTypeId(typeId ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setDraggingTypeId(null);
    const { active, over } = event;
    if (!over) return;
    const typeId = active.data.current?.typeId as string | undefined;
    const target = over.data.current as
      | { featureId: string; phaseId: string }
      | undefined;
    if (!typeId || !target) return;
    attemptAdd(target.featureId, target.phaseId, typeId);
  }

  async function handleUpdateDeliverable(
    id: string,
    data: Partial<{
      name: string;
      assignee: string;
      status: DeliverableStatus;
      plannedStartDate: string | null;
      plannedEndDate: string | null;
      actualStartDate: string | null;
      actualEndDate: string | null;
      progress: number;
      memo: string;
    }>
  ) {
    try {
      const fresh = await updateDeliverableAction(id, data);
      setDeliverables(fresh);
      toast.success("保存しました");
    } catch {
      toast.error("保存に失敗しました");
    }
  }

  async function handleDeleteDeliverable(id: string) {
    try {
      const fresh = await deleteDeliverableAction(id);
      setDeliverables(fresh);
      toast.success("成果物を削除しました");
    } catch {
      toast.error("削除に失敗しました");
    }
  }

  const activeCellData = activeCell
    ? {
        feature: features.find((f) => f.id === activeCell.featureId),
        phase: phases.find((p) => p.id === activeCell.phaseId),
        deliverables: deliverables.filter(
          (d) =>
            d.featureId === activeCell.featureId &&
            d.phaseId === activeCell.phaseId
        ),
      }
    : null;

  const draggingType = draggingTypeId
    ? types.find((t) => t.id === draggingTypeId)
    : null;

  const pendingType = pendingDrop
    ? types.find((t) => t.id === pendingDrop.typeId)
    : null;
  const pendingDefaultPhase = pendingType?.defaultPhaseId
    ? phases.find((p) => p.id === pendingType.defaultPhaseId)
    : null;
  const pendingTargetPhase = pendingDrop
    ? phases.find((p) => p.id === pendingDrop.phaseId)
    : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          全体完了率:{" "}
          {projectSummary.total > 0
            ? `${Math.round((projectSummary.done / projectSummary.total) * 100)}% (${projectSummary.done}/${projectSummary.total})`
            : "対象データがありません"}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPhaseFeatureManagerOpen(true)}
          >
            工程・機能を管理
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setTypeManagerOpen(true)}
          >
            成果物種類を管理
          </Button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <DeliverableTypePalette types={types} phases={phases} />

        {features.length === 0 || phases.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            工程・機能が未登録です。まず「工程・機能を管理」から登録してください
          </p>
        ) : (
          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background">
                    機能 ＼ 工程
                  </TableHead>
                  {phases.map((phase) => {
                    const summary = phaseCompletionSummary(phase, deliverables);
                    return (
                      <TableHead key={phase.id} className="text-center">
                        <div>{phase.name}</div>
                        <div className="text-xs font-normal text-muted-foreground">
                          {summary.done}/{summary.total} 完了
                        </div>
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {matrix.map((row) => (
                  <TableRow key={row.feature.id}>
                    <TableCell className="sticky left-0 bg-background font-medium">
                      {row.feature.name}
                    </TableCell>
                    {row.cells.map((cell) => (
                      <MatrixCell
                        key={cell.phase.id}
                        featureId={row.feature.id}
                        phaseId={cell.phase.id}
                        status={cell.status}
                        doneCount={cell.doneCount}
                        totalCount={cell.totalCount}
                        onClick={() =>
                          setActiveCell({
                            featureId: row.feature.id,
                            phaseId: cell.phase.id,
                          })
                        }
                      />
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <DragOverlay>
          {draggingType && (
            <span className="cursor-grabbing rounded-full border border-border bg-background px-3 py-1 text-xs font-medium shadow-md">
              {draggingType.name}
            </span>
          )}
        </DragOverlay>
      </DndContext>

      {activeCellData?.feature && activeCellData.phase && (
        <CellDetailPanel
          open
          onOpenChange={(open) => !open && setActiveCell(null)}
          featureName={activeCellData.feature.name}
          phaseName={activeCellData.phase.name}
          deliverables={activeCellData.deliverables}
          types={types}
          onAttemptAdd={(typeId) =>
            attemptAdd(activeCellData.feature!.id, activeCellData.phase!.id, typeId)
          }
          onUpdate={handleUpdateDeliverable}
          onDelete={handleDeleteDeliverable}
        />
      )}

      <PhaseFeatureManager
        open={phaseFeatureManagerOpen}
        onOpenChange={setPhaseFeatureManagerOpen}
        projectId={projectId}
        phases={phases}
        features={features}
        onPhasesChange={setPhases}
        onFeaturesChange={setFeatures}
      />

      <DeliverableTypeManager
        open={typeManagerOpen}
        onOpenChange={setTypeManagerOpen}
        projectId={projectId}
        types={types}
        phases={phases}
        onTypesChange={setTypes}
      />

      <AlertDialog
        open={pendingDrop !== null}
        onOpenChange={(open) => !open && setPendingDrop(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingDrop?.step === "phase_mismatch"
                ? "想定工程と異なります"
                : "既に同じ種類の成果物があります"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDrop?.step === "phase_mismatch"
                ? `「${pendingType?.name ?? ""}」の想定工程は「${pendingDefaultPhase?.name ?? ""}」ですが、「${pendingTargetPhase?.name ?? ""}」に追加しようとしています。追加しますか?`
                : "同じ種類の成果物が既に存在します。追加しますか?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handlePendingConfirm}>
              追加する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
