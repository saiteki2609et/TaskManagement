"use client";

import * as React from "react";
import { ArrowUpDown, FoldVertical, Plus, UnfoldVertical } from "lucide-react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PRIORITY_META } from "@/components/todo/priority";
import { TaskDetailPanel } from "@/components/todo/task-detail-panel";
import { TaskFormDialog } from "@/components/todo/task-form-dialog";
import { TaskListItem } from "@/components/todo/task-list-item";
import {
  collectExpandableIds,
  countTasks,
  findPath,
  findTask,
  sortTasksForDisplay,
  type Priority,
  type SortMode,
  type TodoTask,
} from "@/components/todo/types";
import {
  createTaskAction,
  deleteTaskAction,
  duplicateTaskAction,
  updateTaskAction,
} from "@/lib/actions/tasks";
import { cn } from "@/lib/utils";

const SORT_LABEL: Record<SortMode, string> = {
  created: "追加順",
  priority: "優先度順",
};

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

  const { total, done } = countTasks(tasks);
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;
  const displayTasks = React.useMemo(
    () => sortTasksForDisplay(tasks, sortMode),
    [tasks, sortMode]
  );
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

  async function handleToggle(id: string) {
    const target = findTask(tasks, id);
    if (!target) return;
    try {
      const fresh = await updateTaskAction(id, { done: !target.done });
      setTasks(fresh);
      toast.success(
        target.done
          ? `「${target.title}」を未完了に戻しました`
          : `「${target.title}」を完了にしました`
      );
    } catch {
      toast.error("更新に失敗しました");
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
      toast.success(`「${target.title}」を削除しました`);
    } catch {
      toast.error("削除に失敗しました");
    }
  }

  async function handleDuplicate(id: string) {
    const target = findTask(tasks, id);
    if (!target) return;
    try {
      const { tree } = await duplicateTaskAction(id);
      setTasks(tree);
      toast.success(`「${target.title}」を複製しました`);
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
    data: { title: string; priority: Priority | null; memo: string }
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
  }: {
    title: string;
    priority: Priority | null;
  }) {
    const parentId = addDialog.parentId;
    try {
      const { id, tree } = await createTaskAction({
        title,
        priority,
        parentId,
      });
      setTasks(tree);
      setSelectedId(id);
      if (parentId) {
        setExpandedIds((prev) => new Set(prev).add(parentId));
      }
      toast.success(`「${title}」を追加しました`);
    } catch {
      toast.error("追加に失敗しました");
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

      <div
        className={cn(
          "overflow-hidden rounded-xl border border-border bg-card ring-1 ring-foreground/5",
          selectedPath
            ? "grid grid-cols-1 lg:grid-cols-[22rem_1fr]"
            : "mx-auto max-w-2xl"
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
                  onSelect={handleSelectFromList}
                  onToggleExpand={handleToggleExpand}
                  onExpandSubtree={handleExpandSubtree}
                  onCollapseSubtree={handleCollapseSubtree}
                  onToggle={handleToggle}
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
              onToggle={handleToggle}
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
    </div>
  );
}
