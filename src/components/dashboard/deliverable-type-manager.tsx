"use client";

import * as React from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import type { DeliverableType, Phase } from "@/components/dashboard/types";
import {
  createDeliverableTypeAction,
  deleteDeliverableTypeAction,
  updateDeliverableTypeAction,
} from "@/lib/actions/deliverable-types";

const NO_PHASE_VALUE = "__none__";

type DeliverableTypeManagerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  types: DeliverableType[];
  phases: Phase[];
  onTypesChange: (types: DeliverableType[]) => void;
};

export function DeliverableTypeManager({
  open,
  onOpenChange,
  projectId,
  types,
  phases,
  onTypesChange,
}: DeliverableTypeManagerProps) {
  const [formState, setFormState] = React.useState<{
    open: boolean;
    target: DeliverableType | null;
  }>({ open: false, target: null });

  async function handleSubmit(data: {
    name: string;
    defaultPhaseId: string | null;
  }) {
    const editing = formState.target;
    try {
      const fresh = editing
        ? await updateDeliverableTypeAction(editing.id, data)
        : await createDeliverableTypeAction(projectId, data);
      onTypesChange(fresh);
      toast.success(editing ? "更新しました" : "追加しました");
      setFormState({ open: false, target: null });
    } catch {
      toast.error(editing ? "更新に失敗しました" : "追加に失敗しました");
    }
  }

  async function handleDelete(type: DeliverableType) {
    const result = await deleteDeliverableTypeAction(type.id);
    if (result.ok) {
      onTypesChange(result.data);
      toast.success(`「${type.name}」を削除しました`);
    } else {
      toast.error(result.error.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>成果物種類マスタ</DialogTitle>
          <DialogDescription>
            このプロジェクトで使う成果物種類を管理します。共通マスタとは独立して編集できます。
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            onClick={() => setFormState({ open: true, target: null })}
          >
            追加
          </Button>
        </div>

        {types.length === 0 ? (
          <p className="rounded-md border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
            成果物種類が未登録です
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>想定工程</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {types.map((type) => (
                <TableRow key={type.id}>
                  <TableCell className="font-medium">{type.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {phases.find((p) => p.id === type.defaultPhaseId)?.name ??
                      "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger
                          onClick={() =>
                            setFormState({ open: true, target: type })
                          }
                          aria-label="編集"
                          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <Pencil className="h-4 w-4" />
                        </TooltipTrigger>
                        <TooltipContent>編集</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger
                          onClick={() => handleDelete(type)}
                          aria-label="削除"
                          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </TooltipTrigger>
                        <TooltipContent>削除</TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <DeliverableTypeFormDialog
          open={formState.open}
          onOpenChange={(o) => setFormState((s) => ({ ...s, open: o }))}
          target={formState.target}
          phases={phases}
          onSubmit={handleSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}

function DeliverableTypeFormDialog({
  open,
  onOpenChange,
  target,
  phases,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: DeliverableType | null;
  phases: Phase[];
  onSubmit: (data: { name: string; defaultPhaseId: string | null }) => void;
}) {
  const [name, setName] = React.useState("");
  const [defaultPhaseId, setDefaultPhaseId] = React.useState<string | null>(
    null
  );
  const [prevOpen, setPrevOpen] = React.useState(open);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setName(target?.name ?? "");
      setDefaultPhaseId(target?.defaultPhaseId ?? null);
    }
  }

  const isValid = name.trim().length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    onSubmit({ name: name.trim(), defaultPhaseId });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {target ? "成果物種類を編集" : "成果物種類を追加"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="deliverable-type-name">名称</Label>
              <Input
                id="deliverable-type-name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="基本設計書"
              />
            </div>
            <div className="space-y-1.5">
              <Label>想定工程(任意)</Label>
              <Select
                items={[
                  { label: "未設定", value: NO_PHASE_VALUE },
                  ...phases.map((phase) => ({
                    label: phase.name,
                    value: phase.id,
                  })),
                ]}
                value={defaultPhaseId ?? NO_PHASE_VALUE}
                onValueChange={(value) =>
                  setDefaultPhaseId(
                    value === NO_PHASE_VALUE ? null : String(value)
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="未設定" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PHASE_VALUE}>未設定</SelectItem>
                  {phases.map((phase) => (
                    <SelectItem key={phase.id} value={phase.id}>
                      {phase.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
