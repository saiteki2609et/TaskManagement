"use server";

import { revalidatePath } from "next/cache";

import type { Feature as FeatureRow } from "@prisma/client";

import type { Feature } from "@/components/dashboard/types";
import { prisma } from "@/lib/prisma";

function toFeature(row: FeatureRow): Feature {
  return {
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    order: row.order,
  };
}

export async function listFeaturesAction(projectId: string): Promise<Feature[]> {
  const rows = await prisma.feature.findMany({
    where: { projectId },
    orderBy: { order: "asc" },
  });
  return rows.map(toFeature);
}

export async function createFeatureAction(
  projectId: string,
  name: string
): Promise<Feature[]> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("機能名は必須です");
  }
  const order = await prisma.feature.count({ where: { projectId } });
  await prisma.feature.create({
    data: { projectId, name: trimmed, order },
  });
  revalidatePath("/dashboard");
  return listFeaturesAction(projectId);
}

export async function updateFeatureAction(
  id: string,
  data: { name?: string; order?: number }
): Promise<Feature[]> {
  const name = data.name?.trim();
  if (data.name !== undefined && !name) {
    throw new Error("機能名は必須です");
  }
  const updated = await prisma.feature.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(data.order !== undefined && { order: data.order }),
    },
  });
  revalidatePath("/dashboard");
  return listFeaturesAction(updated.projectId);
}

export async function deleteFeatureAction(id: string): Promise<Feature[]> {
  const target = await prisma.feature.findUniqueOrThrow({ where: { id } });
  await prisma.feature.delete({ where: { id } });
  revalidatePath("/dashboard");
  return listFeaturesAction(target.projectId);
}
