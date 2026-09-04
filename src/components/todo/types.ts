export type Priority = 1 | 2 | 3;

export type TodoTask = {
  id: string;
  title: string;
  done: boolean;
  priority: Priority | null;
  memo: string;
  children: TodoTask[];
};

export type SortMode = "created" | "priority";

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
          done: acc.done + (task.done ? 1 : 0),
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
