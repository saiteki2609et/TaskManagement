"use server";

import { revalidatePath } from "next/cache";

import type { Task as TaskRow } from "@prisma/client";

import { buildTaskTree } from "@/lib/tasks/build-tree";
import { prisma } from "@/lib/prisma";
import type { Priority, TodoTask } from "@/components/todo/types";

async function getFreshTree(): Promise<TodoTask[]> {
  const rows = await prisma.task.findMany();
  return buildTaskTree(rows);
}

async function nextOrder(parentId: string | null): Promise<number> {
  return prisma.task.count({ where: { parentId } });
}

export async function createTaskAction(input: {
  title: string;
  priority: Priority | null;
  parentId: string | null;
}): Promise<{ id: string; tree: TodoTask[] }> {
  const order = await nextOrder(input.parentId);
  const created = await prisma.task.create({
    data: {
      title: input.title,
      priority: input.priority,
      parentId: input.parentId,
      order,
    },
  });
  revalidatePath("/todo");
  return { id: created.id, tree: await getFreshTree() };
}

export async function updateTaskAction(
  id: string,
  data: Partial<{
    title: string;
    priority: Priority | null;
    memo: string;
    done: boolean;
  }>
): Promise<TodoTask[]> {
  await prisma.task.update({ where: { id }, data });
  revalidatePath("/todo");
  return getFreshTree();
}

export async function deleteTaskAction(id: string): Promise<TodoTask[]> {
  await prisma.task.delete({ where: { id } });
  revalidatePath("/todo");
  return getFreshTree();
}

async function cloneSubtree(
  sourceId: string,
  newParentId: string | null,
  isRoot: boolean
): Promise<TaskRow> {
  const source = await prisma.task.findUniqueOrThrow({
    where: { id: sourceId },
    include: { children: { orderBy: { order: "asc" } } },
  });
  const order = await nextOrder(newParentId);
  const clone = await prisma.task.create({
    data: {
      title: isRoot ? `${source.title} のコピー` : source.title,
      done: source.done,
      priority: source.priority,
      memo: source.memo,
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
