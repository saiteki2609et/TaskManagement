"use client";

import * as React from "react";
import { Check, ChevronRight, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PRIORITY_META } from "@/components/todo/priority";
import { PriorityPicker } from "@/components/todo/priority-picker";
import type { Priority, TodoTask } from "@/components/todo/types";
import { TASK_MEMO_MAX_LENGTH, TASK_TITLE_MAX_LENGTH } from "@/lib/constants";
import { cn } from "@/lib/utils";

type TaskDetailPanelProps = {
  path: TodoTask[];
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onSave: (
    id: string,
    data: { title: string; priority: Priority | null; memo: string }
  ) => void;
};

export function TaskDetailPanel({
  path,
  onSelect,
  onToggle,
  onDelete,
  onSave,
}: TaskDetailPanelProps) {
  const task = path[path.length - 1];
  const [titleDraft, setTitleDraft] = React.useState(task.title);
  const [priorityDraft, setPriorityDraft] = React.useState(task.priority);
  const [memoDraft, setMemoDraft] = React.useState(task.memo);

  const priorityMeta = task.priority ? PRIORITY_META[task.priority] : null;
  const isTitleValid = titleDraft.trim().length > 0;
  const isDirty =
    titleDraft !== task.title ||
    priorityDraft !== task.priority ||
    memoDraft !== task.memo;

  function handleSave() {
    if (!isTitleValid) return;
    onSave(task.id, {
      title: titleDraft.trim(),
      priority: priorityDraft,
      memo: memoDraft,
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-1 border-b border-border px-6 py-3 text-xs text-muted-foreground">
        {path.map((ancestor, index) => (
          <React.Fragment key={ancestor.id}>
            {index > 0 && <ChevronRight className="h-3 w-3 shrink-0" />}
            {index === path.length - 1 ? (
              <span className="truncate font-medium text-foreground">
                {ancestor.title}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onSelect(ancestor.id)}
                className="truncate hover:text-foreground hover:underline"
              >
                {ancestor.title}
              </button>
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="flex-1 space-y-7 overflow-y-auto px-6 py-6">
        <div className="flex items-start gap-4">
          <button
            type="button"
            onClick={() => onToggle(task.id)}
            aria-label={`${task.title} を完了にする`}
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-semibold transition-colors",
              task.done
                ? "bg-primary text-primary-foreground"
                : priorityMeta
                  ? cn(priorityMeta.dot, "text-white")
                  : "bg-muted text-muted-foreground"
            )}
          >
            {task.done ? (
              <Check className="h-5 w-5" />
            ) : (
              task.title.trim().slice(0, 1).toUpperCase() || "T"
            )}
          </button>

          <div className="min-w-0 flex-1 space-y-1">
            <Input
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              maxLength={TASK_TITLE_MAX_LENGTH}
              aria-invalid={!isTitleValid}
              className={cn(
                "h-auto rounded-md border-none px-0 text-xl font-semibold shadow-none focus-visible:bg-muted/50 focus-visible:px-2 focus-visible:ring-0",
                task.done && "text-muted-foreground line-through"
              )}
            />
            <p className="text-right text-xs text-muted-foreground">
              {titleDraft.length} / {TASK_TITLE_MAX_LENGTH}
            </p>
            <button
              type="button"
              onClick={() => onToggle(task.id)}
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              {task.done
                ? "完了済み ・ クリックで未完了に戻す"
                : "未完了 ・ クリックで完了にする"}
            </button>
          </div>

          <button
            type="button"
            onClick={() => onDelete(task.id)}
            aria-label="タスクを削除"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">優先順位</h3>
          <PriorityPicker value={priorityDraft} onChange={setPriorityDraft} />
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">メモ</h3>
            <span className="text-xs text-muted-foreground">
              {memoDraft.length} / {TASK_MEMO_MAX_LENGTH}
            </span>
          </div>
          <Textarea
            value={memoDraft}
            onChange={(e) => setMemoDraft(e.target.value)}
            maxLength={TASK_MEMO_MAX_LENGTH}
            placeholder="メモを入力"
            className="min-h-32"
          />
        </section>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-border bg-muted/30 px-6 py-3">
        {isDirty && (
          <span className="mr-auto text-xs text-muted-foreground">
            保存されていない変更があります
          </span>
        )}
        <Button
          type="button"
          onClick={handleSave}
          disabled={!isDirty || !isTitleValid}
        >
          保存
        </Button>
      </div>
    </div>
  );
}
