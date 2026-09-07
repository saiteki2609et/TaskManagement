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
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { TrashedProject } from "@/components/dashboard/types";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).format(new Date(value));
}

type ProjectTrashTabProps = {
  items: TrashedProject[];
  onRestore: (id: string) => void;
  onPermanentlyDelete: (id: string) => void;
};

export function ProjectTrashTab({
  items,
  onRestore,
  onPermanentlyDelete,
}: ProjectTrashTabProps) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
        削除済みのプロジェクトはありません
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>プロジェクト名</TableHead>
          <TableHead>削除日</TableHead>
          <TableHead>保持期限</TableHead>
          <TableHead className="text-right">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TrashRow
            key={item.id}
            item={item}
            onRestore={onRestore}
            onPermanentlyDelete={onPermanentlyDelete}
          />
        ))}
      </TableBody>
    </Table>
  );
}

function TrashRow({
  item,
  onRestore,
  onPermanentlyDelete,
}: {
  item: TrashedProject;
  onRestore: (id: string) => void;
  onPermanentlyDelete: (id: string) => void;
}) {
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  return (
    <TableRow>
      <TableCell className="font-medium">{item.name}</TableCell>
      <TableCell>{formatDate(item.deletedAt)}</TableCell>
      <TableCell>
        {item.remainingDays > 0 ? (
          <span className="text-muted-foreground">
            残り{item.remainingDays}日
          </span>
        ) : (
          <Badge variant="destructive">
            保持期限切れ(手動削除が必要です)
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          <Tooltip>
            <TooltipTrigger
              onClick={() => onRestore(item.id)}
              aria-label="復元"
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <RotateCcw className="h-4 w-4" />
            </TooltipTrigger>
            <TooltipContent>復元</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              onClick={() => setConfirmOpen(true)}
              aria-label="完全に削除"
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </TooltipTrigger>
            <TooltipContent>完全に削除</TooltipContent>
          </Tooltip>
        </div>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>完全に削除しますか?</AlertDialogTitle>
              <AlertDialogDescription>
                「{item.name}」を完全に削除します。この操作は元に戻せません。
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
      </TableCell>
    </TableRow>
  );
}
