"use client";

import * as React from "react";
import { RotateCcw, Trash2 } from "lucide-react";

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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PRIORITY_META } from "@/components/todo/priority";
import type { DeletedTaskSummary } from "@/components/todo/types";
import { cn } from "@/lib/utils";

type TrashDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: DeletedTaskSummary[];
  loading: boolean;
  onRestore: (id: string) => void;
  onPermanentlyDelete: (id: string) => void;
};

export function TrashDialog({
  open,
  onOpenChange,
  items,
  loading,
  onRestore,
  onPermanentlyDelete,
}: TrashDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>削除済みタスク</DialogTitle>
          <DialogDescription>
            削除したタスクを一覧に戻したり、完全に削除したりできます。
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-96 space-y-1.5 overflow-y-auto py-1">
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              読み込み中...
            </p>
          ) : items.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
              削除済みのタスクはありません
            </p>
          ) : (
            items.map((item) => (
              <TrashItemRow
                key={item.id}
                item={item}
                onRestore={onRestore}
                onPermanentlyDelete={onPermanentlyDelete}
              />
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TrashItemRow({
  item,
  onRestore,
  onPermanentlyDelete,
}: {
  item: DeletedTaskSummary;
  onRestore: (id: string) => void;
  onPermanentlyDelete: (id: string) => void;
}) {
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const priorityMeta = item.priority ? PRIORITY_META[item.priority] : null;
  const deletedAtLabel = new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(item.deletedAt));

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {priorityMeta && (
            <span
              className={cn(
                "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                priorityMeta.badge
              )}
            >
              {priorityMeta.label}
            </span>
          )}
          <p className="truncate text-sm font-medium">{item.title}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          {deletedAtLabel} に削除
          {item.descendantCount > 0 &&
            ` ・ ${item.descendantCount} 件のサブタスクを含む`}
        </p>
      </div>

      <Tooltip>
        <TooltipTrigger
          onClick={() => onRestore(item.id)}
          aria-label="タスク一覧に戻す"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <RotateCcw className="h-4 w-4" />
        </TooltipTrigger>
        <TooltipContent>タスク一覧に戻す</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger
          onClick={() => setConfirmOpen(true)}
          aria-label="完全に削除"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </TooltipTrigger>
        <TooltipContent>完全に削除</TooltipContent>
      </Tooltip>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>完全に削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              「{item.title}」
              {item.descendantCount > 0 && "とそのサブタスクすべて"}
              を完全に削除します。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={() => onPermanentlyDelete(item.id)}
            >
              完全に削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
