"use server";

import { revalidatePath } from "next/cache";

import type { GlobalDeliverableType as GlobalDeliverableTypeRow } from "@prisma/client";

import type {
  DeliverableType,
  GlobalDeliverableType,
} from "@/components/dashboard/types";
import type { ActionResult } from "@/lib/actions/action-result";
import { prisma } from "@/lib/prisma";

function toGlobalDeliverableType(
  row: GlobalDeliverableTypeRow
): GlobalDeliverableType {
  return {
    id: row.id,
    name: row.name,
    defaultPhaseName: row.defaultPhaseName,
    order: row.order,
  };
}

async function nextGlobalOrder(): Promise<number> {
  return prisma.globalDeliverableType.count();
}

export async function listGlobalDeliverableTypesAction(): Promise<
  GlobalDeliverableType[]
> {
  const rows = await prisma.globalDeliverableType.findMany({
    orderBy: { order: "asc" },
  });
  return rows.map(toGlobalDeliverableType);
}

export async function createGlobalDeliverableTypeAction(input: {
  name: string;
  defaultPhaseName: string;
}): Promise<GlobalDeliverableType[]> {
  const name = input.name.trim();
  if (!name) {
    throw new Error("成果物種類名は必須です");
  }
  await prisma.globalDeliverableType.create({
    data: {
      name,
      defaultPhaseName: input.defaultPhaseName.trim(),
      order: await nextGlobalOrder(),
    },
  });
  revalidatePath("/projects");
  return listGlobalDeliverableTypesAction();
}

export async function updateGlobalDeliverableTypeAction(
  id: string,
  data: { name?: string; defaultPhaseName?: string }
): Promise<GlobalDeliverableType[]> {
  const name = data.name?.trim();
  if (data.name !== undefined && !name) {
    throw new Error("成果物種類名は必須です");
  }
  await prisma.globalDeliverableType.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(data.defaultPhaseName !== undefined && {
        defaultPhaseName: data.defaultPhaseName.trim(),
      }),
    },
  });
  revalidatePath("/projects");
  return listGlobalDeliverableTypesAction();
}

export async function deleteGlobalDeliverableTypeAction(
  id: string
): Promise<GlobalDeliverableType[]> {
  await prisma.globalDeliverableType.delete({ where: { id } });
  revalidatePath("/projects");
  return listGlobalDeliverableTypesAction();
}

// --- プロジェクト固有マスタ(DeliverableType) ---

async function nextDeliverableTypeOrder(projectId: string): Promise<number> {
  return prisma.deliverableType.count({ where: { projectId } });
}

export async function listDeliverableTypesAction(
  projectId: string
): Promise<DeliverableType[]> {
  const rows = await prisma.deliverableType.findMany({
    where: { projectId },
    orderBy: { order: "asc" },
    include: { _count: { select: { deliverables: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    defaultPhaseId: row.defaultPhaseId,
    order: row.order,
    deliverableCount: row._count.deliverables,
  }));
}

export async function createDeliverableTypeAction(
  projectId: string,
  input: { name: string; defaultPhaseId: string | null }
): Promise<DeliverableType[]> {
  const name = input.name.trim();
  if (!name) {
    throw new Error("成果物種類名は必須です");
  }
  await prisma.deliverableType.create({
    data: {
      projectId,
      name,
      defaultPhaseId: input.defaultPhaseId,
      order: await nextDeliverableTypeOrder(projectId),
    },
  });
  revalidatePath("/dashboard");
  return listDeliverableTypesAction(projectId);
}

export async function updateDeliverableTypeAction(
  id: string,
  data: { name?: string; defaultPhaseId?: string | null }
): Promise<DeliverableType[]> {
  const name = data.name?.trim();
  if (data.name !== undefined && !name) {
    throw new Error("成果物種類名は必須です");
  }
  const updated = await prisma.deliverableType.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(data.defaultPhaseId !== undefined && {
        defaultPhaseId: data.defaultPhaseId,
      }),
    },
  });
  revalidatePath("/dashboard");
  return listDeliverableTypesAction(updated.projectId);
}

// 共通成果物種類マスタから選択した種類をプロジェクトに追加する。
// 既に同名の種類がプロジェクトに存在するものはスキップする。
// 想定工程は名称が一致するプロジェクト内の工程があれば紐付け、なければ未設定とする。
export async function addGlobalDeliverableTypesToProjectAction(
  projectId: string,
  globalTypeIds: string[]
): Promise<DeliverableType[]> {
  const [globalTypes, existingTypes, projectPhases] = await Promise.all([
    prisma.globalDeliverableType.findMany({
      where: { id: { in: globalTypeIds } },
      orderBy: { order: "asc" },
    }),
    prisma.deliverableType.findMany({ where: { projectId } }),
    prisma.phase.findMany({ where: { projectId } }),
  ]);
  const existingNames = new Set(existingTypes.map((t) => t.name));
  const phaseIdByName = new Map(projectPhases.map((p) => [p.name, p.id]));
  const toCreate = globalTypes.filter((gt) => !existingNames.has(gt.name));

  if (toCreate.length > 0) {
    let order = existingTypes.length;
    await prisma.deliverableType.createMany({
      data: toCreate.map((gt) => ({
        projectId,
        name: gt.name,
        defaultPhaseId: phaseIdByName.get(gt.defaultPhaseName) ?? null,
        order: order++,
      })),
    });
  }

  revalidatePath("/dashboard");
  return listDeliverableTypesAction(projectId);
}

export async function deleteDeliverableTypeAction(
  id: string
): Promise<ActionResult<DeliverableType[]>> {
  const target = await prisma.deliverableType.findUniqueOrThrow({
    where: { id },
  });
  const count = await prisma.deliverable.count({ where: { typeId: id } });
  if (count > 0) {
    return {
      ok: false,
      error: {
        code: "DELIVERABLE_TYPE_IN_USE",
        count,
        message: `この種類を使用している成果物が${count}件あるため削除できません`,
      },
    };
  }
  await prisma.deliverableType.delete({ where: { id } });
  revalidatePath("/dashboard");
  return { ok: true, data: await listDeliverableTypesAction(target.projectId) };
}
