import {
  taskToImportInput,
  type ImportTaskInput,
  type Priority,
  type TaskStatus,
  type TodoTask,
} from "@/components/todo/types";
import { TASK_MEMO_MAX_LENGTH, TASK_TITLE_MAX_LENGTH } from "@/lib/constants";

function sanitizeStatus(value: unknown): TaskStatus {
  return value === "in_progress" || value === "done"
    ? value
    : "not_started";
}

function sanitizePriority(value: unknown): Priority | null {
  const n = Number(value);
  return n === 1 || n === 2 || n === 3 ? (n as Priority) : null;
}

function sanitizeProgress(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n / 10) * 10));
}

function sanitizeDate(value: unknown): string | null {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : null;
}

// ---------- JSON ----------

export function tasksToJson(tasks: TodoTask[]): string {
  return JSON.stringify(tasks.map(taskToImportInput), null, 2);
}

function sanitizeImportNode(raw: unknown): ImportTaskInput | null {
  if (typeof raw !== "object" || raw === null) return null;
  const node = raw as Record<string, unknown>;
  const title = String(node.title ?? "").trim().slice(0, TASK_TITLE_MAX_LENGTH);
  if (!title) return null;
  return {
    title,
    status: sanitizeStatus(node.status),
    priority: sanitizePriority(node.priority),
    progress: sanitizeProgress(node.progress),
    tags: Array.isArray(node.tags)
      ? node.tags.filter((t): t is string => typeof t === "string")
      : [],
    startDate: sanitizeDate(node.startDate),
    endDate: sanitizeDate(node.endDate),
    memo:
      typeof node.memo === "string"
        ? node.memo.slice(0, TASK_MEMO_MAX_LENGTH)
        : "",
    children: Array.isArray(node.children)
      ? node.children
          .map(sanitizeImportNode)
          .filter((n): n is ImportTaskInput => n !== null)
      : [],
  };
}

export function jsonToTasks(text: string): ImportTaskInput[] {
  const parsed: unknown = JSON.parse(text);
  const list = Array.isArray(parsed) ? parsed : [parsed];
  return list
    .map(sanitizeImportNode)
    .filter((n): n is ImportTaskInput => n !== null);
}

// ---------- CSV ----------

const CSV_COLUMNS = [
  "level",
  "title",
  "status",
  "priority",
  "progress",
  "tags",
  "startDate",
  "endDate",
  "memo",
] as const;

function csvEscape(value: string): string {
  return /[",\r\n]/.test(value)
    ? `"${value.replace(/"/g, '""')}"`
    : value;
}

function flattenForCsv(
  tasks: TodoTask[],
  level: number,
  rows: string[][]
): void {
  for (const task of tasks) {
    rows.push([
      String(level),
      task.title,
      task.status,
      task.priority ? String(task.priority) : "",
      String(task.progress),
      task.tags.join("|"),
      task.startDate ?? "",
      task.endDate ?? "",
      task.memo,
    ]);
    flattenForCsv(task.children, level + 1, rows);
  }
}

export function tasksToCsv(tasks: TodoTask[]): string {
  const rows: string[][] = [[...CSV_COLUMNS]];
  flattenForCsv(tasks, 0, rows);
  return rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function csvToTasks(text: string): ImportTaskInput[] {
  const rows = parseCsvRows(text.trim());
  if (rows.length === 0) return [];

  const [header, ...dataRows] = rows;
  const columnIndex = (name: string) => header.indexOf(name);
  const at = (cols: string[], name: string) => cols[columnIndex(name)] ?? "";

  const roots: ImportTaskInput[] = [];
  const stack: { level: number; node: ImportTaskInput }[] = [];

  for (const cols of dataRows) {
    if (cols.every((c) => c.trim() === "")) continue;

    const title = at(cols, "title").trim().slice(0, TASK_TITLE_MAX_LENGTH);
    if (!title) continue;

    const level = Math.max(0, Math.round(Number(at(cols, "level"))) || 0);
    const tagsRaw = at(cols, "tags");

    const node: ImportTaskInput = {
      title,
      status: sanitizeStatus(at(cols, "status")),
      priority: sanitizePriority(at(cols, "priority")),
      progress: sanitizeProgress(at(cols, "progress")),
      tags: tagsRaw
        ? tagsRaw
            .split("|")
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
      startDate: sanitizeDate(at(cols, "startDate")) || null,
      endDate: sanitizeDate(at(cols, "endDate")) || null,
      memo: at(cols, "memo").slice(0, TASK_MEMO_MAX_LENGTH),
      children: [],
    };

    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }

    if (stack.length === 0) {
      roots.push(node);
    } else {
      stack[stack.length - 1].node.children.push(node);
    }
    stack.push({ level, node });
  }

  return roots;
}
