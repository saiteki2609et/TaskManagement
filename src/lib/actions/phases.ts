"use server";

import { revalidatePath } from "next/cache";

import type {
  GlobalPhase as GlobalPhaseRow,
  Phase as PhaseRow,
} from "@prisma/client";

import type { GlobalPhase, Phase } from "@/components/dashboard/types";
import { prisma } from "@/lib/prisma";

function toPhase(row: PhaseRow): Phase {
  return {
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    order: row.order,
  };
}

function toGlobalPhase(row: GlobalPhaseRow): GlobalPhase {
  return {
    id: row.id,
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

// --- 共通工程マスタ(GlobalPhase) ---

async function nextGlobalPhaseOrder(): Promise<number> {
  return prisma.globalPhase.count();
}

export async function listGlobalPhasesAction(): Promise<GlobalPhase[]> {
  const rows = await prisma.globalPhase.findMany({ orderBy: { order: "asc" } });
  return rows.map(toGlobalPhase);
}

export async function createGlobalPhaseAction(
  name: string
): Promise<GlobalPhase[]> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("工程名は必須です");
  }
  await prisma.globalPhase.create({
    data: { name: trimmed, order: await nextGlobalPhaseOrder() },
  });
  revalidatePath("/projects");
  return listGlobalPhasesAction();
}

export async function updateGlobalPhaseAction(
  id: string,
  name: string
): Promise<GlobalPhase[]> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("工程名は必須です");
  }
  await prisma.globalPhase.update({ where: { id }, data: { name: trimmed } });
  revalidatePath("/projects");
  return listGlobalPhasesAction();
}

export async function deleteGlobalPhaseAction(
  id: string
): Promise<GlobalPhase[]> {
  await prisma.globalPhase.delete({ where: { id } });
  revalidatePath("/projects");
  return listGlobalPhasesAction();
}

// 共通工程マスタから選択した工程をプロジェクトに追加する。
// 既に同名の工程がプロジェクトに存在するものはスキップする。
export async function addGlobalPhasesToProjectAction(
  projectId: string,
  globalPhaseIds: string[]
): Promise<Phase[]> {
  const [globalPhases, existingPhases] = await Promise.all([
    prisma.globalPhase.findMany({
      where: { id: { in: globalPhaseIds } },
      orderBy: { order: "asc" },
    }),
    prisma.phase.findMany({ where: { projectId } }),
  ]);
  const existingNames = new Set(existingPhases.map((p) => p.name));
  const toCreate = globalPhases.filter((gp) => !existingNames.has(gp.name));

  if (toCreate.length > 0) {
    let order = existingPhases.length;
    await prisma.phase.createMany({
      data: toCreate.map((gp) => ({
        projectId,
        name: gp.name,
        order: order++,
      })),
    });
  }

  revalidatePath("/dashboard");
  return listPhasesAction(projectId);
}
