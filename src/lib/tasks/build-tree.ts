import type { Task as TaskRow } from "@prisma/client";

import type { Priority, TaskStatus, TodoTask } from "@/components/todo/types";
import { parseTags } from "@/lib/tasks/tags";

function toDateString(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

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
      status: row.status as TaskStatus,
      priority: (row.priority as Priority | null) ?? null,
      memo: row.memo,
      startDate: toDateString(row.startDate),
      endDate: toDateString(row.endDate),
      progress: row.progress,
      tags: parseTags(row.tags),
      children: build(row.id),
    }));
  }

  return build(null);
}
