import type { Task as TaskRow } from "@prisma/client";

import type { Priority, TodoTask } from "@/components/todo/types";

export function buildTaskTree(rows: TaskRow[]): TodoTask[] {
  const byParent = new Map<string | null, TaskRow[]>();
  for (const row of rows) {
    const siblings = byParent.get(row.parentId) ?? [];
    siblings.push(row);
    byParent.set(row.parentId, siblings);
  }

  function build(parentId: string | null): TodoTask[] {
    const siblings = [...(byParent.get(parentId) ?? [])].sort(
      (a, b) => a.order - b.order
    );
    return siblings.map((row) => ({
      id: row.id,
      title: row.title,
      done: row.done,
      priority: (row.priority as Priority | null) ?? null,
      memo: row.memo,
      children: build(row.id),
    }));
  }

  return build(null);
}
