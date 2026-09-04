import type { Priority, TaskStatus, TodoTask } from "@/components/todo/types";

export type StatusFilter = "all" | TaskStatus;
export type PriorityFilter = "all" | "none" | Priority;
export type DueFilter = "all" | "overdue" | "has" | "none" | "range";

export type TaskFilters = {
  search: string;
  status: StatusFilter;
  priority: PriorityFilter;
  due: DueFilter;
  dueFrom: string | null;
  dueTo: string | null;
};

export const DEFAULT_FILTERS: TaskFilters = {
  search: "",
  status: "all",
  priority: "all",
  due: "all",
  dueFrom: null,
  dueTo: null,
};

export function isFiltersActive(filters: TaskFilters): boolean {
  return (
    filters.search.trim().length > 0 ||
    filters.status !== "all" ||
    filters.priority !== "all" ||
    filters.due !== "all"
  );
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function matchesSearch(task: TodoTask, query: string): boolean {
  if (!query) return true;
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return (
    task.title.toLowerCase().includes(needle) ||
    task.memo.toLowerCase().includes(needle) ||
    task.tags.some((tag) => tag.toLowerCase().includes(needle))
  );
}

function matchesStatus(task: TodoTask, status: StatusFilter): boolean {
  if (status === "all") return true;
  return task.status === status;
}

function matchesPriority(task: TodoTask, priority: PriorityFilter): boolean {
  if (priority === "all") return true;
  if (priority === "none") return task.priority === null;
  return task.priority === priority;
}

function matchesDue(task: TodoTask, filters: TaskFilters): boolean {
  const { due, dueFrom, dueTo } = filters;
  if (due === "all") return true;
  if (due === "none") return !task.endDate;
  if (due === "has") return !!task.endDate;
  if (due === "overdue") {
    return (
      !!task.endDate &&
      task.endDate < todayDateString() &&
      task.status !== "done"
    );
  }
  if (due === "range") {
    if (!task.endDate) return false;
    if (dueFrom && task.endDate < dueFrom) return false;
    if (dueTo && task.endDate > dueTo) return false;
    return true;
  }
  return true;
}

export function taskMatchesFilters(
  task: TodoTask,
  filters: TaskFilters
): boolean {
  return (
    matchesSearch(task, filters.search) &&
    matchesStatus(task, filters.status) &&
    matchesPriority(task, filters.priority) &&
    matchesDue(task, filters)
  );
}

export function filterTaskTree(
  tasks: TodoTask[],
  filters: TaskFilters
): TodoTask[] {
  if (!isFiltersActive(filters)) return tasks;

  const result: TodoTask[] = [];
  for (const task of tasks) {
    if (taskMatchesFilters(task, filters)) {
      result.push(task);
      continue;
    }
    const filteredChildren = filterTaskTree(task.children, filters);
    if (filteredChildren.length > 0) {
      result.push({ ...task, children: filteredChildren });
    }
  }
  return result;
}
