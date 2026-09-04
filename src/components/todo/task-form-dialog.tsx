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
import { PriorityPicker } from "@/components/todo/priority-picker";
import type { Priority } from "@/components/todo/types";
import { TASK_TITLE_MAX_LENGTH } from "@/lib/constants";

type TaskFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  heading: string;
  description?: string;
  onSubmit: (data: { title: string; priority: Priority | null }) => void;
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
  const [prevOpen, setPrevOpen] = React.useState(open);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setTitle("");
      setPriority(null);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = title.trim();
    if (!value) return;
    onSubmit({ title: value, priority });
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
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={!title.trim()}>
              追加
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
