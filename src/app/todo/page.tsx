import type { Metadata } from "next";

import { TodoView } from "@/components/todo/todo-view";
import { PAGE_CONTAINER } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { buildTaskTree } from "@/lib/tasks/build-tree";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Todo | TaskFlow",
  description: "今日のタスクを階層構造で管理します",
};

export default async function TodoPage() {
  const rows = await prisma.task.findMany({ where: { deletedAt: null } });
  const initialTasks = buildTaskTree(rows);

  return (
    <div className={cn(PAGE_CONTAINER, "py-10")}>
      <TodoView initialTasks={initialTasks} />
    </div>
  );
}
