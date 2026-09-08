"use client";

import * as React from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

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
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { GlobalPhase } from "@/components/dashboard/types";
import {
  createGlobalPhaseAction,
  deleteGlobalPhaseAction,
  updateGlobalPhaseAction,
} from "@/lib/actions/phases";

type GlobalPhaseSectionProps = {
  initialPhases: GlobalPhase[];
};

export function GlobalPhaseSection({ initialPhases }: GlobalPhaseSectionProps) {
  const [phases, setPhases] = React.useState(initialPhases);
  const [dialogState, setDialogState] = React.useState<{
    open: boolean;
    target: GlobalPhase | null;
  }>({ open: false, target: null });

  async function handleSubmit(name: string) {
    const editing = dialogState.target;
    try {
      const fresh = editing
        ? await updateGlobalPhaseAction(editing.id, name)
        : await createGlobalPhaseAction(name);
      setPhases(fresh);
      toast.success(editing ? "更新しました" : "追加しました");
      setDialogState({ open: false, target: null });
    } catch {
      toast.error(editing ? "更新に失敗しました" : "追加に失敗しました");
    }
  }

  async function handleDelete(phase: GlobalPhase) {
    try {
      const fresh = await deleteGlobalPhaseAction(phase.id);
      setPhases(fresh);
      toast.success(`「${phase.name}」を削除しました`);
    } catch {
      toast.error("削除に失敗しました");
    }
  }

  return (
    <section className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold">共通工程マスタ</h3>
          <p className="text-xs text-muted-foreground">
            新規プロジェクト作成時のひな形です。変更は既存プロジェクトに遡って影響しません。
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => setDialogState({ open: true, target: null })}
        >
          追加
        </Button>
      </div>

      {phases.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
          工程が未登録です
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名称</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {phases.map((phase) => (
              <GlobalPhaseRow
                key={phase.id}
                phase={phase}
                onEdit={() => setDialogState({ open: true, target: phase })}
                onDelete={() => handleDelete(phase)}
              />
            ))}
          </TableBody>
        </Table>
      )}

      <GlobalPhaseDialog
        open={dialogState.open}
        onOpenChange={(open) => setDialogState((s) => ({ ...s, open }))}
        target={dialogState.target}
        onSubmit={handleSubmit}
      />
    </section>
  );
}

function GlobalPhaseRow({
  phase,
  onEdit,
  onDelete,
}: {
  phase: GlobalPhase;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  return (
    <TableRow>
      <TableCell className="font-medium">{phase.name}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          <Tooltip>
            <TooltipTrigger
              onClick={onEdit}
              aria-label="編集"
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Pencil className="h-4 w-4" />
            </TooltipTrigger>
            <TooltipContent>編集</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              onClick={() => setConfirmOpen(true)}
              aria-label="削除"
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </TooltipTrigger>
            <TooltipContent>削除</TooltipContent>
          </Tooltip>
        </div>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>削除しますか?</AlertDialogTitle>
              <AlertDialogDescription>
                「{phase.name}」を削除します。この操作は元に戻せません。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>キャンセル</AlertDialogCancel>
              <AlertDialogAction
                className={buttonVariants({ variant: "destructive" })}
                onClick={onDelete}
              >
                削除する
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  );
}

function GlobalPhaseDialog({
  open,
  onOpenChange,
  target,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: GlobalPhase | null;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = React.useState("");
  const [prevOpen, setPrevOpen] = React.useState(open);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setName(target?.name ?? "");
    }
  }

  const isValid = name.trim().length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    onSubmit(name.trim());
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{target ? "工程を編集" : "工程を追加"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="global-phase-name">名称</Label>
              <Input
                id="global-phase-name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="基本設計"
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
            <Button type="submit" disabled={!isValid}>
              {target ? "保存" : "追加"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
