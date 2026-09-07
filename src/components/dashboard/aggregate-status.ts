import type {
  CellAggregateStatus,
  Deliverable,
} from "@/components/dashboard/types";

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isDelayed(
  d: Pick<Deliverable, "status" | "plannedEndDate">,
  now: Date = new Date()
): boolean {
  if (d.status === "done") return false;
  if (!d.plannedEndDate) return false;
  return new Date(d.plannedEndDate).getTime() < startOfDay(now).getTime();
}

export function aggregateCellStatus(
  deliverables: Pick<Deliverable, "status" | "plannedEndDate">[],
  now: Date = new Date()
): CellAggregateStatus {
  if (deliverables.length === 0) return "not_applicable";
  if (deliverables.some((d) => isDelayed(d, now))) return "partially_delayed";
  if (deliverables.every((d) => d.status === "done")) return "done";
  if (deliverables.every((d) => d.status === "not_started")) return "not_started";
  return "in_progress";
}

export function countDelayed(
  deliverables: Pick<Deliverable, "status" | "plannedEndDate">[],
  now: Date = new Date()
): number {
  return deliverables.filter((d) => isDelayed(d, now)).length;
}

export function buildMatrix(
  features: { id: string; name: string; order: number }[],
  phases: { id: string; name: string; order: number }[],
  deliverables: Deliverable[],
  now: Date = new Date()
) {
  const sortedFeatures = [...features].sort((a, b) => a.order - b.order);
  const sortedPhases = [...phases].sort((a, b) => a.order - b.order);

  return sortedFeatures.map((feature) => ({
    feature,
    cells: sortedPhases.map((phase) => {
      const cellDeliverables = deliverables.filter(
        (d) => d.featureId === feature.id && d.phaseId === phase.id
      );
      return {
        phase,
        deliverables: cellDeliverables,
        status: aggregateCellStatus(cellDeliverables, now),
        doneCount: cellDeliverables.filter((d) => d.status === "done").length,
        totalCount: cellDeliverables.length,
      };
    }),
  }));
}

export function phaseCompletionSummary(
  phase: { id: string },
  deliverables: Deliverable[]
): { done: number; total: number } {
  const inPhase = deliverables.filter((d) => d.phaseId === phase.id);
  return {
    done: inPhase.filter((d) => d.status === "done").length,
    total: inPhase.length,
  };
}

export function projectCompletionSummary(
  deliverables: Deliverable[]
): { done: number; total: number } {
  return {
    done: deliverables.filter((d) => d.status === "done").length,
    total: deliverables.length,
  };
}
