"use server";

import { revalidatePath } from "next/cache";

import type { Phase as PhaseRow } from "@prisma/client";

import type { Phase } from "@/components/dashboard/types";
import { prisma } from "@/lib/prisma";

function toPhase(row: PhaseRow): Phase {
  return {
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    order: row.order,
  };
}

export async function listPhasesAction(projectId: string): Promise<Phase[]> {
  const rows = await prisma.phase.findMany({
    where: { projectId },
    orderBy: { order: "asc" },
  });
  return rows.map(toPhase);
}

export async function createPhaseAction(
  projectId: string,
  name: string
): Promise<Phase[]> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("工程名は必須です");
  }
  const order = await prisma.phase.count({ where: { projectId } });
  await prisma.phase.create({
    data: { projectId, name: trimmed, order },
  });
  revalidatePath("/dashboard");
  return listPhasesAction(projectId);
}

export async function updatePhaseAction(
  id: string,
  data: { name?: string; order?: number }
): Promise<Phase[]> {
  const name = data.name?.trim();
  if (data.name !== undefined && !name) {
    throw new Error("工程名は必須です");
  }
  const updated = await prisma.phase.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(data.order !== undefined && { order: data.order }),
    },
  });
  revalidatePath("/dashboard");
  return listPhasesAction(updated.projectId);
}

export async function deletePhaseAction(id: string): Promise<Phase[]> {
  const target = await prisma.phase.findUniqueOrThrow({ where: { id } });
  await prisma.phase.delete({ where: { id } });
  revalidatePath("/dashboard");
  return listPhasesAction(target.projectId);
}
