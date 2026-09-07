"use server";

import { revalidatePath } from "next/cache";

import type { Deliverable as DeliverableRow } from "@prisma/client";

import type {
  Deliverable,
  DeliverableStatus,
} from "@/components/dashboard/types";
import { prisma } from "@/lib/prisma";

function toDateString(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

function toDeliverable(row: DeliverableRow): Deliverable {
  return {
    id: row.id,
    projectId: row.projectId,
    featureId: row.featureId,
    phaseId: row.phaseId,
    typeId: row.typeId,
    name: row.name,
    assignee: row.assignee,
    status: row.status as DeliverableStatus,
    plannedStartDate: toDateString(row.plannedStartDate),
    plannedEndDate: toDateString(row.plannedEndDate),
    actualStartDate: toDateString(row.actualStartDate),
    actualEndDate: toDateString(row.actualEndDate),
    progress: row.progress,
    memo: row.memo,
    order: row.order,
  };
}

export async function listDeliverablesAction(
  projectId: string
): Promise<Deliverable[]> {
  const rows = await prisma.deliverable.findMany({
    where: { projectId },
    orderBy: [{ featureId: "asc" }, { phaseId: "asc" }, { order: "asc" }],
  });
  return rows.map(toDeliverable);
}

export async function createDeliverableFromDropAction(input: {
  projectId: string;
  featureId: string;
  phaseId: string;
  typeId: string;
}): Promise<Deliverable[]> {
  const [feature, type] = await Promise.all([
    prisma.feature.findUniqueOrThrow({ where: { id: input.featureId } }),
    prisma.deliverableType.findUniqueOrThrow({ where: { id: input.typeId } }),
  ]);
  const order = await prisma.deliverable.count({
    where: { featureId: input.featureId, phaseId: input.phaseId },
  });
  await prisma.deliverable.create({
    data: {
      projectId: input.projectId,
      featureId: input.featureId,
      phaseId: input.phaseId,
      typeId: input.typeId,
      name: `${feature.name} ${type.name}`,
      status: "not_started",
      progress: 0,
      order,
    },
  });
  revalidatePath("/dashboard");
  return listDeliverablesAction(input.projectId);
}

export async function updateDeliverableAction(
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
): Promise<Deliverable[]> {
  const payload: Partial<{
    name: string;
    assignee: string;
    status: DeliverableStatus;
    memo: string;
    progress: number;
  }> = {
    name: data.name,
    assignee: data.assignee,
    status: data.status,
    memo: data.memo,
    progress: data.progress,
  };

  if (payload.status === "done") {
    payload.progress = 100;
  } else if (payload.status === "not_started") {
    payload.progress = 0;
  } else if (
    payload.status !== undefined &&
    payload.progress === undefined
  ) {
    const current = await prisma.deliverable.findUniqueOrThrow({
      where: { id },
      select: { progress: true },
    });
    payload.progress = current.progress > 0 ? current.progress : 10;
  }

  const target = await prisma.deliverable.update({
    where: { id },
    data: {
      ...(payload.name !== undefined && { name: payload.name }),
      ...(payload.assignee !== undefined && { assignee: payload.assignee }),
      ...(payload.status !== undefined && { status: payload.status }),
      ...(payload.memo !== undefined && { memo: payload.memo }),
      ...(payload.progress !== undefined && { progress: payload.progress }),
      ...(data.plannedStartDate !== undefined && {
        plannedStartDate: data.plannedStartDate
          ? new Date(data.plannedStartDate)
          : null,
      }),
      ...(data.plannedEndDate !== undefined && {
        plannedEndDate: data.plannedEndDate
          ? new Date(data.plannedEndDate)
          : null,
      }),
      ...(data.actualStartDate !== undefined && {
        actualStartDate: data.actualStartDate
          ? new Date(data.actualStartDate)
          : null,
      }),
      ...(data.actualEndDate !== undefined && {
        actualEndDate: data.actualEndDate ? new Date(data.actualEndDate) : null,
      }),
    },
  });
  revalidatePath("/dashboard");
  return listDeliverablesAction(target.projectId);
}

export async function deleteDeliverableAction(
  id: string
): Promise<Deliverable[]> {
  const target = await prisma.deliverable.delete({ where: { id } });
  revalidatePath("/dashboard");
  return listDeliverablesAction(target.projectId);
}
