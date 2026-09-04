"use client";

import * as React from "react";
import {
  ArrowUpDown,
  CalendarClock,
  Flag,
  FoldVertical,
  ListChecks,
  ListPlus,
  Plus,
  Search,
  Trash2,
  UnfoldVertical,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BulkAddDialog } from "@/components/todo/bulk-add-dialog";
import { formatDateRangeLabel } from "@/components/todo/date-range-fields";
import { ExportImportMenu } from "@/components/todo/export-import-menu";
import {
  DEFAULT_FILTERS,
  filterTaskTree,
  isFiltersActive,
  type DueFilter,
  type PriorityFilter,
  type StatusFilter,
  type TaskFilters,
} from "@/components/todo/filters";
import { PRIORITY_META } from "@/components/todo/priority";
import { TaskDetailPanel } from "@/components/todo/task-detail-panel";
import { TaskFormDialog } from "@/components/todo/task-form-dialog";
import { TaskListItem } from "@/components/todo/task-list-item";
import { TrashDialog } from "@/components/todo/trash-dialog";
import {
  collectExpandableIds,
  countTasks,
  findPath,
  findTask,
  sortTasksForDisplay,
  type BulkTaskInput,
  type DeletedTaskSummary,
  type ImportTaskInput,
  type Priority,
  type SortMode,
  type TaskStatus,
  type TodoTask,
} from "@/components/todo/types";
import {
  createTaskAction,
  createTasksBulkAction,
  deleteTaskAction,
  duplicateTaskAction,
  getDeletedTasksAction,
  importTasksAction,
  permanentlyDeleteTaskAction,
  permanentlyDeleteTasksAction,
  restoreTaskAction,
  updateTaskAction,
} from "@/lib/actions/tasks";
import { cn } from "@/lib/utils";

const SORT_LABEL: Record<SortMode, string> = {
  created: "追加順",
  priority: "優先度順",
};

const STATUS_FILTER_LABEL: Record<StatusFilter, string> = {
  all: "すべて",
  not_started: "未着手",
  in_progress: "進行中",
  done: "完了",
};

const DUE_PRESET_LABEL: Record<Exclude<DueFilter, "range">, string> = {
  all: "すべて",
  overdue: "期限切れ",
  has: "期限あり",
  none: "期限なし",
};

function priorityFilterLabel(value: PriorityFilter): string {
  if (value === "all") return "すべて";
  if (value === "none") return "未設定";
  return PRIORITY_META[value].label;
}

function dueFilterButtonLabel(filters: TaskFilters): string {
  if (filters.due === "range") {
    const range = formatDateRangeLabel(filters.dueFrom, filters.dueTo);
    return range ?? "期間指定";
  }
  return DUE_PRESET_LABEL[filters.due];
}

function formatToday() {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date());
}

export function TodoView({ initialTasks }: { initialTasks: TodoTask[] }) {
  const [tasks, setTasks] = React.useState<TodoTask[]>(initialTasks);
  const [sortMode, setSortMode] = React.useState<SortMode>("created");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(
    () => new Set()
  );
  const [addDialog, setAddDialog] = React.useState<{
    open: boolean;
    parentId: string | null;
  }>({ open: false, parentId: null });
  const [bulkAddOpen, setBulkAddOpen] = React.useState(false);
  const [trashOpen, setTrashOpen] = React.useState(false);
  const [trashLoading, setTrashLoading] = React.useState(false);
  const [deletedTasks, setDeletedTasks] = React.useState<DeletedTaskSummary[]>(
    []
  );
  const [filters, setFilters] = React.useState<TaskFilters>(DEFAULT_FILTERS);
  const [dueFilterOpen, setDueFilterOpen] = React.useState(false);

  const { total, done } = countTasks(tasks);
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;
  const filtersActive = isFiltersActive(filters);
  const displayTasks = React.useMemo(() => {
    const sorted = sortTasksForDisplay(tasks, sortMode);
    return filterTaskTree(sorted, filters);
  }, [tasks, sortMode, filters]);
  const selectedPath = selectedId ? findPath(tasks, selectedId) : null;

  function handleSelectFromList(id: string) {
    setSelectedId((prev) => (prev === id ? null : id));
  }

  function handleToggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleExpandAll() {
    setExpandedIds(new Set(collectExpandableIds(tasks)));
  }

  function handleCollapseAll() {
    setExpandedIds(new Set());
  }

  function handleExpandSubtree(task: TodoTask) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      for (const id of collectExpandableIds([task])) next.add(id);
      return next;
    });
  }

  function handleCollapseSubtree(task: TodoTask) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      for (const id of collectExpandableIds([task])) next.delete(id);
      return next;
    });
  }

  async function handleRestore(id: string, options?: { silent?: boolean }) {
    try {
      const { tree, deletedTasks: fresh } = await restoreTaskAction(id);
      setTasks(tree);
      setDeletedTasks(fresh);
      if (!options?.silent) {
        toast.success("タスクをタスク一覧に戻しました");
      }
    } catch {
      toast.error("復元に失敗しました");
    }
  }

  async function handleDelete(id: string) {
    const path = findPath(tasks, id);
    const target = path ? path[path.length - 1] : null;
    if (!target) return;
    try {
      const fresh = await deleteTaskAction(id);
      setTasks(fresh);
      if (selectedId === id) {
        const parentId =
          path && path.length > 1 ? path[path.length - 2].id : null;
        setSelectedId(parentId);
      }
      toast.success(`「${target.title}」を削除しました`, {
        action: {
          label: "元に戻す",
          onClick: () => handleRestore(id, { silent: true }),
        },
      });
    } catch {
      toast.error("削除に失敗しました");
    }
  }

  async function handlePermanentDelete(id: string) {
    try {
      const { tree, deletedTasks: fresh } =
        await permanentlyDeleteTaskAction(id);
      setTasks(tree);
      setDeletedTasks(fresh);
      toast.success("タスクを完全に削除しました");
    } catch {
      toast.error("完全な削除に失敗しました");
    }
  }

  async function undoCreate(id: string) {
    try {
      const { tree } = await permanentlyDeleteTaskAction(id);
      setTasks(tree);
      if (selectedId === id) setSelectedId(null);
    } catch {
      toast.error("元に戻せませんでした");
    }
  }

  async function handleDuplicate(id: string) {
    const target = findTask(tasks, id);
    if (!target) return;
    try {
      const { id: newId, tree } = await duplicateTaskAction(id);
      setTasks(tree);
      toast.success(`「${target.title}」を複製しました`, {
        action: { label: "元に戻す", onClick: () => undoCreate(newId) },
      });
    } catch {
      toast.error("複製に失敗しました");
    }
  }

  async function handleChangePriority(id: string, priority: Priority | null) {
    const target = findTask(tasks, id);
    if (!target) return;
    try {
      const fresh = await updateTaskAction(id, { priority });
      setTasks(fresh);
      toast.success(
        `「${target.title}」の優先度を${
          priority ? PRIORITY_META[priority].label : "未設定"
        }にしました`
      );
    } catch {
      toast.error("更新に失敗しました");
    }
  }

  async function handleSaveTaskDetail(
    id: string,
    data: {
      title: string;
      priority: Priority | null;
      memo: string;
      startDate: string | null;
      endDate: string | null;
      status: TaskStatus;
      progress: number;
      tags: string[];
    }
  ) {
    try {
      const fresh = await updateTaskAction(id, data);
      setTasks(fresh);
      toast.success("タスクを保存しました");
    } catch {
      toast.error("保存に失敗しました");
    }
  }

  async function handleCreateTask({
    title,
    priority,
    startDate,
    endDate,
    tags,
  }: {
    title: string;
    priority: Priority | null;
    startDate: string | null;
    endDate: string | null;
    tags: string[];
  }) {
    const parentId = addDialog.parentId;
    try {
      const { id, tree } = await createTaskAction({
        title,
        priority,
        startDate,
        endDate,
        tags,
        parentId,
      });
      setTasks(tree);
      setSelectedId(id);
      if (parentId) {
        setExpandedIds((prev) => new Set(prev).add(parentId));
      }
      toast.success(`「${title}」を追加しました`, {
        action: { label: "元に戻す", onClick: () => undoCreate(id) },
      });
    } catch {
      toast.error("追加に失敗しました");
    }
  }

  async function handleBulkAdd(nodes: BulkTaskInput[]) {
    try {
      const { count, rootIds, tree } = await createTasksBulkAction(
        nodes,
        null
      );
      setTasks(tree);
      toast.success(`${count} 件のタスクを追加しました`, {
        action: {
          label: "元に戻す",
          onClick: async () => {
            try {
              const { tree: reverted } =
                await permanentlyDeleteTasksAction(rootIds);
              setTasks(reverted);
            } catch {
              toast.error("元に戻せませんでした");
            }
          },
        },
      });
    } catch {
      toast.error("一括追加に失敗しました");
    }
  }

  async function handleImport(nodes: ImportTaskInput[]) {
    try {
      const { count, tree } = await importTasksAction(nodes);
      setTasks(tree);
      toast.success(`${count} 件のタスクをインポートしました`);
    } catch {
      toast.error("インポートに失敗しました");
    }
  }

  async function handleOpenTrash() {
    setTrashOpen(true);
    setTrashLoading(true);
    try {
      const fresh = await getDeletedTasksAction();
      setDeletedTasks(fresh);
    } catch {
      toast.error("削除済みタスクの取得に失敗しました");
    } finally {
      setTrashLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">今日のTodo</h1>
          <p className="text-sm text-muted-foreground">{formatToday()}</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-1.5 w-28 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span>
            {done} / {total} 完了
          </span>
        </div>
      </div>

      <div className="flex items-center justify-end gap-1.5">
        <ExportImportMenu tasks={tasks} onImport={handleImport} />

        <Tooltip>
          <TooltipTrigger
            onClick={handleOpenTrash}
            aria-label="削除済みタスク"
            className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Trash2 className="h-3.5 w-3.5" />
            削除済みタスク
          </TooltipTrigger>
          <TooltipContent>削除したタスクの確認・復元</TooltipContent>
        </Tooltip>
      </div>

      <div
        className={cn(
          "overflow-hidden rounded-xl border border-border bg-card ring-1 ring-foreground/5",
          selectedPath && "grid grid-cols-1 lg:grid-cols-[22rem_1fr]"
        )}
      >
        {/* Left: task list */}
        <div
          className={cn(
            "flex flex-col bg-muted/20",
            selectedPath && "border-b border-border lg:border-r lg:border-b-0"
          )}
        >
          <div className="flex items-center justify-between gap-2 border-b border-border px-6 py-3">
            <Tooltip>
              <TooltipTrigger
                onClick={() => setAddDialog({ open: true, parentId: null })}
                aria-label="タスクを追加"
                className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
              </TooltipTrigger>
              <TooltipContent>タスクを追加</TooltipContent>
            </Tooltip>

            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger
                  onClick={() => setBulkAddOpen(true)}
                  aria-label="テキストで一括追加"
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <ListPlus className="h-3.5 w-3.5" />
                </TooltipTrigger>
                <TooltipContent>テキストで一括追加</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger
                  onClick={handleExpandAll}
                  aria-label="すべて展開"
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <UnfoldVertical className="h-3.5 w-3.5" />
                </TooltipTrigger>
                <TooltipContent>すべて展開</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger
                  onClick={handleCollapseAll}
                  aria-label="すべて折りたたむ"
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <FoldVertical className="h-3.5 w-3.5" />
                </TooltipTrigger>
                <TooltipContent>すべて折りたたむ</TooltipContent>
              </Tooltip>

              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <DropdownMenuTrigger
                        aria-label="並び替え"
                        className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-popup-open:bg-muted data-popup-open:text-foreground"
                      />
                    }
                  >
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </TooltipTrigger>
                  <TooltipContent>
                    並び替え: {SORT_LABEL[sortMode]}
                  </TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end">
                  <DropdownMenuRadioGroup
                    value={sortMode}
                    onValueChange={(value) => setSortMode(value as SortMode)}
                  >
                    <DropdownMenuRadioItem value="created">
                      追加順
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="priority">
                      優先度順
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="space-y-2 border-b border-border px-4 py-3">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
                placeholder="タスク名・メモ・タグで検索"
                className="h-8 pl-8 text-sm"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={cn(
                    "flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs transition-colors hover:bg-muted",
                    filters.status !== "all"
                      ? "border-primary/40 bg-primary/5 text-primary"
                      : "border-border text-muted-foreground"
                  )}
                >
                  <ListChecks className="h-3 w-3" />
                  {STATUS_FILTER_LABEL[filters.status]}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuRadioGroup
                    value={filters.status}
                    onValueChange={(value) =>
                      setFilters((prev) => ({
                        ...prev,
                        status: value as StatusFilter,
                      }))
                    }
                  >
                    <DropdownMenuRadioItem value="all">
                      すべて
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="not_started">
                      未着手
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="in_progress">
                      進行中
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="done">
                      完了
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger
                  className={cn(
                    "flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs transition-colors hover:bg-muted",
                    filters.priority !== "all"
                      ? "border-primary/40 bg-primary/5 text-primary"
                      : "border-border text-muted-foreground"
                  )}
                >
                  <Flag className="h-3 w-3" />
                  {priorityFilterLabel(filters.priority)}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuRadioGroup
                    value={String(filters.priority)}
                    onValueChange={(value) =>
                      setFilters((prev) => ({
                        ...prev,
                        priority:
                          value === "all" || value === "none"
                            ? (value as PriorityFilter)
                            : (Number(value) as Priority),
                      }))
                    }
                  >
                    <DropdownMenuRadioItem value="all">
                      すべて
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="none">
                      未設定
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="1">
                      {PRIORITY_META[1].label}
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="2">
                      {PRIORITY_META[2].label}
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="3">
                      {PRIORITY_META[3].label}
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              <button
                type="button"
                onClick={() => setDueFilterOpen((v) => !v)}
                className={cn(
                  "flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs transition-colors hover:bg-muted",
                  filters.due !== "all"
                    ? "border-primary/40 bg-primary/5 text-primary"
                    : "border-border text-muted-foreground"
                )}
              >
                <CalendarClock className="h-3 w-3" />
                {dueFilterButtonLabel(filters)}
              </button>

              {filtersActive && (
                <button
                  type="button"
                  onClick={() => {
                    setFilters(DEFAULT_FILTERS);
                    setDueFilterOpen(false);
                  }}
                  className="flex h-7 items-center gap-1 rounded-full px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                  クリア
                </button>
              )}
            </div>

            {dueFilterOpen && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 p-2">
                <div className="flex flex-wrap gap-1">
                  {(
                    Object.keys(DUE_PRESET_LABEL) as Exclude<
                      DueFilter,
                      "range"
                    >[]
                  ).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          due: option,
                          dueFrom: null,
                          dueTo: null,
                        }))
                      }
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[11px] transition-colors",
                        filters.due === option
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {DUE_PRESET_LABEL[option]}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="date"
                    value={filters.dueFrom ?? ""}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        due: "range",
                        dueFrom: e.target.value || null,
                      }))
                    }
                    className="h-7 w-[8.5rem] text-xs"
                    aria-label="期限の範囲開始日"
                  />
                  <span className="text-xs text-muted-foreground">〜</span>
                  <Input
                    type="date"
                    value={filters.dueTo ?? ""}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        due: "range",
                        dueTo: e.target.value || null,
                      }))
                    }
                    className="h-7 w-[8.5rem] text-xs"
                    aria-label="期限の範囲終了日"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="max-h-[36rem] flex-1 space-y-2 overflow-y-auto p-2 lg:max-h-none">
            {displayTasks.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
                タスクがありません
              </p>
            ) : (
              displayTasks.map((task) => (
                <TaskListItem
                  key={task.id}
                  task={task}
                  depth={0}
                  selectedId={selectedId}
                  expandedIds={expandedIds}
                  showActions={!selectedPath}
                  onSelect={handleSelectFromList}
                  onToggleExpand={handleToggleExpand}
                  onExpandSubtree={handleExpandSubtree}
                  onCollapseSubtree={handleCollapseSubtree}
                  onDelete={handleDelete}
                  onDuplicate={handleDuplicate}
                  onChangePriority={handleChangePriority}
                  onRequestAddChild={(parentId) =>
                    setAddDialog({ open: true, parentId })
                  }
                />
              ))
            )}
          </div>
        </div>

        {/* Right: task detail */}
        {selectedPath && (
          <div className="min-h-[28rem]">
            <TaskDetailPanel
              key={selectedId}
              path={selectedPath}
              onSelect={setSelectedId}
              onDelete={handleDelete}
              onSave={handleSaveTaskDetail}
            />
          </div>
        )}
      </div>

      <TaskFormDialog
        open={addDialog.open}
        onOpenChange={(open) => setAddDialog((prev) => ({ ...prev, open }))}
        heading={addDialog.parentId ? "サブタスクを追加" : "タスクを追加"}
        description="タスク名を入力してください。優先順位は設定しなくても追加できます。"
        onSubmit={handleCreateTask}
      />

      <BulkAddDialog
        open={bulkAddOpen}
        onOpenChange={setBulkAddOpen}
        onSubmit={handleBulkAdd}
      />

      <TrashDialog
        open={trashOpen}
        onOpenChange={setTrashOpen}
        items={deletedTasks}
        loading={trashLoading}
        onRestore={(id) => handleRestore(id)}
        onPermanentlyDelete={handlePermanentDelete}
      />
    </div>
  );
}
