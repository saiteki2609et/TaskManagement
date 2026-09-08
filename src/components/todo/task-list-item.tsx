"use client";

import * as React from "react";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  CircleDot,
  Copy,
  Flag,
  FoldVertical,
  GripVertical,
  Plus,
  Trash2,
  UnfoldVertical,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
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
import { formatDateRangeLabel } from "@/components/todo/date-range-fields";
import { PRIORITY_META } from "@/components/todo/priority";
import { STATUS_META } from "@/components/todo/status";
import {
  countTasks,
  type Priority,
  type TodoTask,
} from "@/components/todo/types";
import { cn } from "@/lib/utils";

type TaskListItemProps = {
  task: TodoTask;
  parentId: string | null;
  depth: number;
  selectedId: string | null;
  expandedIds: Set<string>;
  showActions: boolean;
  dragEnabled: boolean;
  onSelect: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onExpandSubtree: (task: TodoTask) => void;
  onCollapseSubtree: (task: TodoTask) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onChangePriority: (id: string, priority: Priority | null) => void;
  onRequestAddChild: (parentId: string) => void;
};

export function TaskListItem({
  task,
  parentId,
  depth,
  selectedId,
  expandedIds,
  showActions,
  dragEnabled,
  onSelect,
  onToggleExpand,
  onExpandSubtree,
  onCollapseSubtree,
  onDelete,
  onDuplicate,
  onChangePriority,
  onRequestAddChild,
}: TaskListItemProps) {
  const [confirmDeleteOpen, setConfirmDeleteOpen] = React.useState(false);
  const hasChildren = task.children.length > 0;
  const isExpanded = expandedIds.has(task.id);
  const isSelected = task.id === selectedId;
  const priorityMeta = task.priority ? PRIORITY_META[task.priority] : null;
  const dateRangeLabel = formatDateRangeLabel(task.startDate, task.endDate);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { parentId }, disabled: !dragEnabled });

  const subtitle = hasChildren
    ? (() => {
        const { total, done } = countTasks(task.children);
        return `${done} / ${total} 件のサブタスク完了`;
      })()
    : task.memo.trim()
      ? task.memo.trim()
      : priorityMeta
        ? `優先度: ${priorityMeta.label}`
        : "サブタスクなし";

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <div
        className={cn(
          "group flex items-center gap-2 rounded-xl border px-2 py-2 transition-colors",
          isSelected
            ? "border-primary/40 bg-primary/5 ring-1 ring-primary/30"
            : "border-transparent hover:bg-muted/60"
        )}
        style={{ marginLeft: depth * 18 }}
      >
        {dragEnabled && (
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label="ドラッグして並び替え"
            className="flex h-4 w-4 shrink-0 cursor-grab items-center justify-center text-muted-foreground/50 active:cursor-grabbing"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        )}

        <button
          type="button"
          onClick={(e) => {
            onToggleExpand(task.id);
            e.currentTarget.blur();
          }}
          className={cn(
            "flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground",
            !hasChildren && "invisible"
          )}
          aria-label={isExpanded ? "折りたたむ" : "展開する"}
        >
          {isExpanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </button>

        <div
          role="img"
          aria-label={`ステータス: ${STATUS_META[task.status].label}`}
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            task.status === "done"
              ? "bg-primary text-primary-foreground"
              : priorityMeta
                ? cn(priorityMeta.dot, "text-white")
                : "bg-muted text-muted-foreground"
          )}
        >
          {task.status === "done" ? (
            <Check className="h-4 w-4" />
          ) : task.status === "in_progress" ? (
            <CircleDot className="h-4 w-4" />
          ) : (
            <Circle className="h-4 w-4" />
          )}
        </div>

        <button
          type="button"
          onClick={(e) => {
            onSelect(task.id);
            e.currentTarget.blur();
          }}
          className="min-w-0 flex-1 text-left"
        >
          <p
            className={cn(
              "truncate text-sm font-semibold",
              task.status === "done" && "text-muted-foreground line-through"
            )}
          >
            {task.title}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {subtitle}
          </p>
          {dateRangeLabel && (
            <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
              <Calendar className="h-3 w-3 shrink-0" />
              {dateRangeLabel}
            </p>
          )}
          {task.tags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {task.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </button>

        <div
          className={cn(
            "flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity",
            showActions
              ? "group-hover:opacity-100 group-focus-within:opacity-100 has-[[data-popup-open]]:opacity-100"
              : "pointer-events-none"
          )}
        >
          {hasChildren && (
            <>
              <Tooltip>
                <TooltipTrigger
                  onClick={() => onExpandSubtree(task)}
                  aria-label="子タスクをすべて展開"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <UnfoldVertical className="h-3.5 w-3.5" />
                </TooltipTrigger>
                <TooltipContent>子タスクをすべて展開</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger
                  onClick={() => onCollapseSubtree(task)}
                  aria-label="子タスクをすべて折りたたむ"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <FoldVertical className="h-3.5 w-3.5" />
                </TooltipTrigger>
                <TooltipContent>子タスクをすべて折りたたむ</TooltipContent>
              </Tooltip>
            </>
          )}

          <Tooltip>
            <TooltipTrigger
              onClick={() => onRequestAddChild(task.id)}
              aria-label="サブタスクを追加"
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
            </TooltipTrigger>
            <TooltipContent>サブタスクを追加</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              onClick={() => onDuplicate(task.id)}
              aria-label="複製"
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Copy className="h-3.5 w-3.5" />
            </TooltipTrigger>
            <TooltipContent>複製</TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger
                render={
                  <DropdownMenuTrigger
                    aria-label="優先度を変更"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-popup-open:bg-muted data-popup-open:text-foreground"
                  />
                }
              >
                <Flag className="h-3.5 w-3.5" />
              </TooltipTrigger>
              <TooltipContent>優先度を変更</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup
                value={task.priority ? String(task.priority) : "none"}
                onValueChange={(value) =>
                  onChangePriority(
                    task.id,
                    value === "none" ? null : (Number(value) as Priority)
                  )
                }
              >
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

          <Tooltip>
            <TooltipTrigger
              onClick={() => setConfirmDeleteOpen(true)}
              aria-label="削除"
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </TooltipTrigger>
            <TooltipContent>削除</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <AlertDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>タスクを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              「{task.title}」
              {hasChildren && "とすべてのサブタスク"}
              を削除します。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={() => onDelete(task.id)}
            >
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {hasChildren && isExpanded && (
        <div className="mt-2 space-y-2">
          <SortableContext
            items={task.children.map((child) => child.id)}
            strategy={verticalListSortingStrategy}
          >
            {task.children.map((child) => (
              <TaskListItem
                key={child.id}
                task={child}
                parentId={task.id}
                depth={depth + 1}
                selectedId={selectedId}
                expandedIds={expandedIds}
                showActions={showActions}
                dragEnabled={dragEnabled}
                onSelect={onSelect}
                onToggleExpand={onToggleExpand}
                onExpandSubtree={onExpandSubtree}
                onCollapseSubtree={onCollapseSubtree}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
                onChangePriority={onChangePriority}
                onRequestAddChild={onRequestAddChild}
              />
            ))}
          </SortableContext>
        </div>
      )}
    </div>
  );
}
