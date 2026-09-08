"use server";

import { revalidatePath } from "next/cache";

import { Prisma } from "@prisma/client";
import type { Project as ProjectRow } from "@prisma/client";

import type { ActionResult } from "@/lib/actions/action-result";
import type { Project, TrashedProject } from "@/components/dashboard/types";
import { prisma } from "@/lib/prisma";

const TRASH_RETENTION_DAYS = 30;

function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    designDocFolderPath: row.designDocFolderPath,
    isArchived: row.isArchived,
    createdAt: row.createdAt.toISOString(),
  };
}

function toTrashedProject(row: ProjectRow, now: Date): TrashedProject {
  const deletedAt = row.deletedAt!;
  const elapsedDays = Math.floor(
    (now.getTime() - deletedAt.getTime()) / (1000 * 60 * 60 * 24)
  );
  return {
    ...toProject(row),
    deletedAt: deletedAt.toISOString(),
    remainingDays: Math.max(0, TRASH_RETENTION_DAYS - elapsedDays),
  };
}

function isDuplicateNameError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export async function listProjectsAction(): Promise<Project[]> {
  const rows = await prisma.project.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toProject);
}

export async function getProjectAction(id: string): Promise<Project | null> {
  const row = await prisma.project.findFirst({ where: { id, deletedAt: null } });
  return row ? toProject(row) : null;
}

export async function listSwitchableProjectsAction(): Promise<
  Pick<Project, "id" | "name">[]
> {
  const rows = await prisma.project.findMany({
    where: { deletedAt: null, isArchived: false },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return rows;
}

export async function createProjectAction(input: {
  name: string;
  designDocFolderPath: string;
}): Promise<ActionResult<Project>> {
  const name = input.name.trim();
  const designDocFolderPath = input.designDocFolderPath.trim();
  if (!name || !designDocFolderPath) {
    throw new Error("プロジェクト名と設計書フォルダパスは必須です");
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: { name, designDocFolderPath },
      });

      const globalPhases = await tx.globalPhase.findMany({
        orderBy: { order: "asc" },
      });
      if (globalPhases.length > 0) {
        await tx.phase.createMany({
          data: globalPhases.map((phase) => ({
            projectId: project.id,
            name: phase.name,
            order: phase.order,
          })),
        });
      }
      const createdPhases = await tx.phase.findMany({
        where: { projectId: project.id },
      });
      const phaseIdByName = new Map(
        createdPhases.map((phase) => [phase.name, phase.id])
      );

      const globalTypes = await tx.globalDeliverableType.findMany({
        orderBy: { order: "asc" },
      });
      if (globalTypes.length > 0) {
        await tx.deliverableType.createMany({
          data: globalTypes.map((type) => ({
            projectId: project.id,
            name: type.name,
            defaultPhaseId: phaseIdByName.get(type.defaultPhaseName) ?? null,
            order: type.order,
          })),
        });
      }
      return project;
    });

    revalidatePath("/projects");
    return { ok: true, data: toProject(created) };
  } catch (error) {
    if (isDuplicateNameError(error)) {
      return {
        ok: false,
        error: {
          code: "DUPLICATE_PROJECT_NAME",
          message: `プロジェクト名「${name}」は既に使用されています(削除済みのプロジェクトを含む)`,
        },
      };
    }
    throw error;
  }
}

export async function updateProjectAction(
  id: string,
  input: { name?: string; designDocFolderPath?: string }
): Promise<ActionResult<Project>> {
  const name = input.name?.trim();
  const designDocFolderPath = input.designDocFolderPath?.trim();
  if (input.name !== undefined && !name) {
    throw new Error("プロジェクト名は必須です");
  }
  if (input.designDocFolderPath !== undefined && !designDocFolderPath) {
    throw new Error("設計書フォルダパスは必須です");
  }

  try {
    const updated = await prisma.project.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(designDocFolderPath !== undefined && { designDocFolderPath }),
      },
    });
    revalidatePath("/projects");
    return { ok: true, data: toProject(updated) };
  } catch (error) {
    if (isDuplicateNameError(error)) {
      return {
        ok: false,
        error: {
          code: "DUPLICATE_PROJECT_NAME",
          message: `プロジェクト名「${name}」は既に使用されています(削除済みのプロジェクトを含む)`,
        },
      };
    }
    throw error;
  }
}

export async function archiveProjectAction(id: string): Promise<Project> {
  const updated = await prisma.project.update({
    where: { id },
    data: { isArchived: true },
  });
  revalidatePath("/projects");
  return toProject(updated);
}

export async function unarchiveProjectAction(id: string): Promise<Project> {
  const updated = await prisma.project.update({
    where: { id },
    data: { isArchived: false },
  });
  revalidatePath("/projects");
  return toProject(updated);
}

export async function softDeleteProjectAction(id: string): Promise<Project[]> {
  await prisma.project.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  revalidatePath("/projects");
  return listProjectsAction();
}

export async function listTrashedProjectsAction(): Promise<TrashedProject[]> {
  const now = new Date();
  const rows = await prisma.project.findMany({
    where: { deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
  });
  return rows.map((row) => toTrashedProject(row, now));
}

export async function restoreProjectAction(
  id: string
): Promise<ActionResult<{ projects: Project[]; trashed: TrashedProject[] }>> {
  try {
    await prisma.project.update({
      where: { id },
      data: { deletedAt: null },
    });
    revalidatePath("/projects");
    return {
      ok: true,
      data: {
        projects: await listProjectsAction(),
        trashed: await listTrashedProjectsAction(),
      },
    };
  } catch (error) {
    if (isDuplicateNameError(error)) {
      return {
        ok: false,
        error: {
          code: "DUPLICATE_PROJECT_NAME",
          message: "同名の稼働中プロジェクトが存在するため復元できません",
        },
      };
    }
    throw error;
  }
}

export async function permanentlyDeleteProjectAction(
  id: string
): Promise<{ trashed: TrashedProject[] }> {
  await prisma.project.delete({ where: { id } });
  revalidatePath("/projects");
  return { trashed: await listTrashedProjectsAction() };
}
