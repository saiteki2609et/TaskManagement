"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DateRangeFields,
  isDateRangeInvalid,
} from "@/components/todo/date-range-fields";
import { PriorityPicker } from "@/components/todo/priority-picker";
import { TagsInput } from "@/components/todo/tags-input";
import type { Priority } from "@/components/todo/types";
import { TASK_TITLE_MAX_LENGTH } from "@/lib/constants";

type TaskFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  heading: string;
  description?: string;
  onSubmit: (data: {
    title: string;
    priority: Priority | null;
    startDate: string | null;
    endDate: string | null;
    tags: string[];
  }) => void;
};

export function TaskFormDialog({
  open,
  onOpenChange,
  heading,
  description,
  onSubmit,
}: TaskFormDialogProps) {
  const [title, setTitle] = React.useState("");
  const [priority, setPriority] = React.useState<Priority | null>(null);
  const [startDate, setStartDate] = React.useState<string | null>(null);
  const [endDate, setEndDate] = React.useState<string | null>(null);
  const [tags, setTags] = React.useState<string[]>([]);
  const [prevOpen, setPrevOpen] = React.useState(open);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setTitle("");
      setPriority(null);
      setStartDate(null);
      setEndDate(null);
      setTags([]);
    }
  }

  const invalidRange = isDateRangeInvalid(startDate, endDate);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = title.trim();
    if (!value || invalidRange) return;
    onSubmit({ title: value, priority, startDate, endDate, tags });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{heading}</DialogTitle>
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="task-title">タスク名</Label>
                <span className="text-xs text-muted-foreground">
                  {title.length} / {TASK_TITLE_MAX_LENGTH}
                </span>
              </div>
              <Input
                id="task-title"
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={TASK_TITLE_MAX_LENGTH}
                placeholder="タスク名を入力"
              />
            </div>

            <div className="space-y-1.5">
              <Label>優先順位（任意）</Label>
              <PriorityPicker value={priority} onChange={setPriority} />
            </div>

            <div className="space-y-1.5">
              <Label>期間（任意）</Label>
              <DateRangeFields
                startDate={startDate}
                endDate={endDate}
                onChangeStart={setStartDate}
                onChangeEnd={setEndDate}
              />
            </div>

            <div className="space-y-1.5">
              <Label>タグ（任意）</Label>
              <TagsInput
                tags={tags}
                onChange={setTags}
                placeholder="タグを入力してEnter"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={!title.trim() || invalidRange}>
              追加
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
