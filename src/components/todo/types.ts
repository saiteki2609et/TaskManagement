export type Priority = 1 | 2 | 3;

export type TaskStatus = "not_started" | "in_progress" | "done";

export const TASK_STATUSES: TaskStatus[] = [
  "not_started",
  "in_progress",
  "done",
];

export function nextTaskStatus(status: TaskStatus): TaskStatus {
  if (status === "not_started") return "in_progress";
  if (status === "in_progress") return "done";
  return "not_started";
}

export type TodoTask = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: Priority | null;
  memo: string;
  startDate: string | null;
  endDate: string | null;
  progress: number;
  tags: string[];
  children: TodoTask[];
};

export type SortMode = "created" | "priority";

export type DeletedTaskSummary = {
  id: string;
  title: string;
  priority: Priority | null;
  deletedAt: string;
  descendantCount: number;
};

export type BulkTaskInput = {
  title: string;
  children: BulkTaskInput[];
};

export function countBulkTasks(nodes: BulkTaskInput[]): number {
  return nodes.reduce((sum, node) => sum + 1 + countBulkTasks(node.children), 0);
}

export type ImportTaskInput = {
  title: string;
  status: TaskStatus;
  priority: Priority | null;
  memo: string;
  startDate: string | null;
  endDate: string | null;
  progress: number;
  tags: string[];
  children: ImportTaskInput[];
};

export function taskToImportInput(task: TodoTask): ImportTaskInput {
  return {
    title: task.title,
    status: task.status,
    priority: task.priority,
    memo: task.memo,
    startDate: task.startDate,
    endDate: task.endDate,
    progress: task.progress,
    tags: task.tags,
    children: task.children.map(taskToImportInput),
  };
}

export function countImportTasks(nodes: ImportTaskInput[]): number {
  return nodes.reduce(
    (sum, node) => sum + 1 + countImportTasks(node.children),
    0
  );
}

export function collectExpandableIds(tasks: TodoTask[]): string[] {
  const ids: string[] = [];
  for (const task of tasks) {
    if (task.children.length > 0) {
      ids.push(task.id, ...collectExpandableIds(task.children));
    }
  }
  return ids;
}

export function findTask(tasks: TodoTask[], id: string): TodoTask | null {
  for (const task of tasks) {
    if (task.id === id) return task;
    const found = findTask(task.children, id);
    if (found) return found;
  }
  return null;
}

export function findPath(tasks: TodoTask[], id: string): TodoTask[] | null {
  for (const task of tasks) {
    if (task.id === id) return [task];
    const childPath = findPath(task.children, id);
    if (childPath) return [task, ...childPath];
  }
  return null;
}

export function countTasks(tasks: TodoTask[]): { total: number; done: number } {
  return tasks.reduce(
    (acc, task) => {
      if (task.children.length === 0) {
        return {
          total: acc.total + 1,
          done: acc.done + (task.status === "done" ? 1 : 0),
        };
      }
      const child = countTasks(task.children);
      return {
        total: acc.total + child.total,
        done: acc.done + child.done,
      };
    },
    { total: 0, done: 0 }
  );
}

const PRIORITY_RANK: Record<Priority, number> = { 1: 0, 2: 1, 3: 2 };

export function sortTasksForDisplay(
  tasks: TodoTask[],
  mode: SortMode
): TodoTask[] {
  const ordered =
    mode === "priority"
      ? [...tasks].sort((a, b) => {
          const rankA = a.priority ? PRIORITY_RANK[a.priority] : 99;
          const rankB = b.priority ? PRIORITY_RANK[b.priority] : 99;
          return rankA - rankB;
        })
      : tasks;

  return ordered.map((task) => ({
    ...task,
    children: sortTasksForDisplay(task.children, mode),
  }));
}
