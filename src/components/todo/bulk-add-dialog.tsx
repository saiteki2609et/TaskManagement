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
import { Textarea } from "@/components/ui/textarea";
import { parseBulkTaskText } from "@/components/todo/bulk-parse";
import { countBulkTasks, type BulkTaskInput } from "@/components/todo/types";

const EXAMPLE_TEXT = [
  "企画資料をまとめる",
  "\tアジェンダを作成する",
  "\tスライドを作成する",
  "\t\tデザインを確認してもらう",
  "買い出しに行く",
].join("\n");

type BulkAddDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (nodes: BulkTaskInput[]) => void;
};

export function BulkAddDialog({
  open,
  onOpenChange,
  onSubmit,
}: BulkAddDialogProps) {
  const [text, setText] = React.useState("");
  const [prevOpen, setPrevOpen] = React.useState(open);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setText("");
  }

  const nodes = React.useMemo(() => parseBulkTaskText(text), [text]);
  const count = countBulkTasks(nodes);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const target = e.currentTarget;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const next = text.slice(0, start) + "\t" + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      target.selectionStart = target.selectionEnd = start + 1;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (nodes.length === 0) return;
    onSubmit(nodes);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>タスクを一括追加</DialogTitle>
            <DialogDescription>
              テキストで複数のタスクをまとめて追加できます。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">使い方</p>
            <p>1行につき1つのタスクとして追加されます。</p>
            <p>
              行頭にTabキーを入力すると、その数だけ階層が1段階ずつ下がり、直前のタスクのサブタスクになります。
            </p>
            <p className="pt-1 font-medium text-foreground">入力例</p>
            <pre className="overflow-x-auto rounded-md border border-border bg-background px-3 py-2 font-mono text-[11px] leading-relaxed text-foreground">
              {EXAMPLE_TEXT}
            </pre>
          </div>

          <div className="space-y-1.5">
            <Textarea
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={EXAMPLE_TEXT}
              className="min-h-48 font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {count > 0
                ? `${count} 件のタスクが追加されます`
                : "タスク名を入力してください"}
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={count === 0}>
              完了
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
