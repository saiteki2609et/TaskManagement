"use server";

import { revalidatePath } from "next/cache";

import type { Task as TaskRow } from "@prisma/client";

import { buildTaskTree } from "@/lib/tasks/build-tree";
import { prisma } from "@/lib/prisma";
import { serializeTags } from "@/lib/tasks/tags";
import {
  countBulkTasks,
  countImportTasks,
  type BulkTaskInput,
  type DeletedTaskSummary,
  type ImportTaskInput,
  type Priority,
  type TaskStatus,
  type TodoTask,
} from "@/components/todo/types";

type TaskWritableFields = {
  title: string;
  priority: Priority | null;
  memo: string;
  status: TaskStatus;
  startDate: string | null;
  endDate: string | null;
  progress: number;
  tags: string[];
};

async function getFreshTree(): Promise<TodoTask[]> {
  const rows = await prisma.task.findMany({ where: { deletedAt: null } });
  return buildTaskTree(rows);
}

async function nextOrder(parentId: string | null): Promise<number> {
  return prisma.task.count({ where: { parentId, deletedAt: null } });
}

function toPrismaData<T extends Partial<TaskWritableFields>>(data: T) {
  const { startDate, endDate, tags, progress, ...rest } = data;
  return {
    ...rest,
    ...(startDate !== undefined && {
      startDate: startDate ? new Date(startDate) : null,
    }),
    ...(endDate !== undefined && {
      endDate: endDate ? new Date(endDate) : null,
    }),
    ...(tags !== undefined && { tags: serializeTags(tags) }),
    ...(progress !== undefined && {
      progress: Math.min(100, Math.max(0, Math.round(progress / 10) * 10)),
    }),
  };
}

export async function createTaskAction(
  input: Pick<TaskWritableFields, "title" | "priority"> &
    Partial<Pick<TaskWritableFields, "startDate" | "endDate" | "tags" | "memo">> & {
      parentId: string | null;
    }
): Promise<{ id: string; tree: TodoTask[] }> {
  const order = await nextOrder(input.parentId);
  const created = await prisma.task.create({
    data: {
      ...toPrismaData({
        title: input.title,
        priority: input.priority,
        memo: input.memo ?? "",
        startDate: input.startDate ?? null,
        endDate: input.endDate ?? null,
        tags: input.tags ?? [],
      }),
      parentId: input.parentId,
      order,
    },
  });
  revalidatePath("/todo");
  return { id: created.id, tree: await getFreshTree() };
}

async function createBulkNode(
  node: BulkTaskInput,
  parentId: string | null,
  order: number
): Promise<string> {
  const created = await prisma.task.create({
    data: { title: node.title, parentId, order },
  });
  for (let i = 0; i < node.children.length; i++) {
    await createBulkNode(node.children[i], created.id, i);
  }
  return created.id;
}

export async function createTasksBulkAction(
  nodes: BulkTaskInput[],
  parentId: string | null
): Promise<{ count: number; rootIds: string[]; tree: TodoTask[] }> {
  const baseOrder = await nextOrder(parentId);
  const rootIds: string[] = [];
  for (let i = 0; i < nodes.length; i++) {
    rootIds.push(await createBulkNode(nodes[i], parentId, baseOrder + i));
  }
  revalidatePath("/todo");
  return {
    count: countBulkTasks(nodes),
    rootIds,
    tree: await getFreshTree(),
  };
}

async function createImportNode(
  node: ImportTaskInput,
  parentId: string | null,
  order: number
): Promise<void> {
  const created = await prisma.task.create({
    data: {
      ...toPrismaData({
        title: node.title,
        status: node.status,
        priority: node.priority,
        memo: node.memo,
        startDate: node.startDate,
        endDate: node.endDate,
        progress: node.progress,
        tags: node.tags,
      }),
      parentId,
      order,
    },
  });
  for (let i = 0; i < node.children.length; i++) {
    await createImportNode(node.children[i], created.id, i);
  }
}

export async function importTasksAction(
  nodes: ImportTaskInput[]
): Promise<{ count: number; tree: TodoTask[] }> {
  const baseOrder = await nextOrder(null);
  for (let i = 0; i < nodes.length; i++) {
    await createImportNode(nodes[i], null, baseOrder + i);
  }
  revalidatePath("/todo");
  return { count: countImportTasks(nodes), tree: await getFreshTree() };
}

export async function updateTaskAction(
  id: string,
  data: Partial<TaskWritableFields>
): Promise<TodoTask[]> {
  const payload: Partial<TaskWritableFields> = { ...data };

  if (payload.status === "done") {
    payload.progress = 100;
  } else if (payload.status === "not_started") {
    payload.progress = 0;
  } else if (payload.status === "in_progress" && payload.progress === undefined) {
    const current = await prisma.task.findUnique({
      where: { id },
      select: { progress: true },
    });
    payload.progress = current && current.progress > 0 ? current.progress : 10;
  }

  await prisma.task.update({ where: { id }, data: toPrismaData(payload) });
  revalidatePath("/todo");
  return getFreshTree();
}

export async function reorderTasksAction(
  parentId: string | null,
  orderedIds: string[]
): Promise<TodoTask[]> {
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.task.update({ where: { id, parentId }, data: { order: index } })
    )
  );
  revalidatePath("/todo");
  return getFreshTree();
}

async function softDeleteSubtree(id: string, deletedAt: Date): Promise<void> {
  const children = await prisma.task.findMany({
    where: { parentId: id, deletedAt: null },
    select: { id: true },
  });
  await prisma.task.update({ where: { id }, data: { deletedAt } });
  for (const child of children) {
    await softDeleteSubtree(child.id, deletedAt);
  }
}

export async function deleteTaskAction(id: string): Promise<TodoTask[]> {
  await softDeleteSubtree(id, new Date());
  revalidatePath("/todo");
  return getFreshTree();
}

async function restoreSubtree(id: string): Promise<void> {
  const children = await prisma.task.findMany({
    where: { parentId: id, deletedAt: { not: null } },
    select: { id: true },
  });
  await prisma.task.update({ where: { id }, data: { deletedAt: null } });
  for (const child of children) {
    await restoreSubtree(child.id);
  }
}

export async function restoreTaskAction(
  id: string
): Promise<{ tree: TodoTask[]; deletedTasks: DeletedTaskSummary[] }> {
  await restoreSubtree(id);
  revalidatePath("/todo");
  return { tree: await getFreshTree(), deletedTasks: await getDeletedTasksAction() };
}

async function countDeletedDescendants(id: string): Promise<number> {
  const children = await prisma.task.findMany({
    where: { parentId: id, deletedAt: { not: null } },
    select: { id: true },
  });
  let count = children.length;
  for (const child of children) {
    count += await countDeletedDescendants(child.id);
  }
  return count;
}

export async function getDeletedTasksAction(): Promise<DeletedTaskSummary[]> {
  const roots = await prisma.task.findMany({
    where: {
      deletedAt: { not: null },
      OR: [{ parentId: null }, { parent: { deletedAt: null } }],
    },
    orderBy: { deletedAt: "desc" },
  });

  const result: DeletedTaskSummary[] = [];
  for (const root of roots) {
    result.push({
      id: root.id,
      title: root.title,
      priority: root.priority as Priority | null,
      deletedAt: root.deletedAt!.toISOString(),
      descendantCount: await countDeletedDescendants(root.id),
    });
  }
  return result;
}

export async function permanentlyDeleteTaskAction(
  id: string
): Promise<{ tree: TodoTask[]; deletedTasks: DeletedTaskSummary[] }> {
  await prisma.task.delete({ where: { id } });
  revalidatePath("/todo");
  return { tree: await getFreshTree(), deletedTasks: await getDeletedTasksAction() };
}

export async function permanentlyDeleteTasksAction(
  ids: string[]
): Promise<{ tree: TodoTask[]; deletedTasks: DeletedTaskSummary[] }> {
  await prisma.task.deleteMany({ where: { id: { in: ids } } });
  revalidatePath("/todo");
  return { tree: await getFreshTree(), deletedTasks: await getDeletedTasksAction() };
}

async function cloneSubtree(
  sourceId: string,
  newParentId: string | null,
  isRoot: boolean
): Promise<TaskRow> {
  const source = await prisma.task.findUniqueOrThrow({
    where: { id: sourceId },
    include: {
      children: { where: { deletedAt: null }, orderBy: { order: "asc" } },
    },
  });
  const order = await nextOrder(newParentId);
  const clone = await prisma.task.create({
    data: {
      title: isRoot ? `${source.title} のコピー` : source.title,
      status: source.status,
      priority: source.priority,
      memo: source.memo,
      startDate: source.startDate,
      endDate: source.endDate,
      progress: source.progress,
      tags: source.tags,
      parentId: newParentId,
      order,
    },
  });
  for (const child of source.children) {
    await cloneSubtree(child.id, clone.id, false);
  }
  return clone;
}

export async function duplicateTaskAction(
  id: string
): Promise<{ id: string; tree: TodoTask[] }> {
  const original = await prisma.task.findUniqueOrThrow({ where: { id } });
  const clone = await cloneSubtree(id, original.parentId, true);
  revalidatePath("/todo");
  return { id: clone.id, tree: await getFreshTree() };
}
