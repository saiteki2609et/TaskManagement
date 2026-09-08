"use client";

import * as React from "react";
import { ChevronLeft, ExternalLink, LayoutGrid, List, Trash2 } from "lucide-react";

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
  DialogDescription,
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
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { isDelayed } from "@/components/dashboard/aggregate-status";
import { DeliverableStatusPicker } from "@/components/dashboard/deliverable-status-picker";
import { DELIVERABLE_STATUS_META } from "@/components/dashboard/status";
import type {
  Deliverable,
  DeliverableStatus,
  DeliverableType,
} from "@/components/dashboard/types";
import { cn } from "@/lib/utils";

export type DeliverableUpdate = Partial<{
  name: string;
  assignee: string;
  link: string;
  status: DeliverableStatus;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  progress: number;
  memo: string;
}>;

type CellDetailPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureName: string;
  phaseName: string;
  deliverables: Deliverable[];
  types: DeliverableType[];
  onAttemptAdd: (typeId: string) => void;
  onUpdate: (id: string, data: DeliverableUpdate) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export function CellDetailPanel({
  open,
  onOpenChange,
  featureName,
  phaseName,
  deliverables,
  types,
  onAttemptAdd,
  onUpdate,
  onDelete,
}: CellDetailPanelProps) {
  const [addTypeId, setAddTypeId] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [viewMode, setViewMode] = React.useState<"list" | "grid">("grid");

  const selectedDeliverable =
    deliverables.find((d) => d.id === selectedId) ?? null;

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) setSelectedId(null);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {selectedDeliverable && (
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                aria-label="一覧に戻る"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            {featureName} / {phaseName}
          </DialogTitle>
          <DialogDescription>
            {selectedDeliverable
              ? "成果物の詳細を編集します。"
              : "この機能・工程に紐づく成果物を管理します。"}
          </DialogDescription>
        </DialogHeader>

        {selectedDeliverable ? (
          <div className="max-h-[60vh] overflow-y-auto py-1">
            <DeliverableCard
              deliverable={selectedDeliverable}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          </div>
        ) : (
          <>
            {deliverables.length > 0 && (
              <div className="flex justify-end">
                <div className="flex gap-1 rounded-lg border border-border p-1">
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    aria-label="リスト形式"
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-md transition-colors",
                      viewMode === "list"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <List className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    aria-label="グリッド形式"
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-md transition-colors",
                      viewMode === "grid"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            <div className="max-h-[55vh] overflow-y-auto py-1">
              {deliverables.length === 0 ? (
                <p className="rounded-md border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                  成果物がまだありません
                </p>
              ) : viewMode === "list" ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>名称</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead>担当者</TableHead>
                      <TableHead>期限</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deliverables.map((deliverable) => (
                      <DeliverableListRow
                        key={deliverable.id}
                        deliverable={deliverable}
                        onClick={() => setSelectedId(deliverable.id)}
                      />
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {deliverables.map((deliverable) => (
                    <DeliverableGridCard
                      key={deliverable.id}
                      deliverable={deliverable}
                      onClick={() => setSelectedId(deliverable.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 border-t border-border pt-3">
              <Select
                items={types.map((type) => ({
                  label: type.name,
                  value: type.id,
                }))}
                value={addTypeId}
                onValueChange={(value) => setAddTypeId(String(value))}
              >
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="成果物種類を選択" />
                </SelectTrigger>
                <SelectContent>
                  {types.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                size="sm"
                disabled={!addTypeId}
                onClick={() => {
                  if (addTypeId) {
                    onAttemptAdd(addTypeId);
                    setAddTypeId("");
                  }
                }}
              >
                追加
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DeliverableListRow({
  deliverable,
  onClick,
}: {
  deliverable: Deliverable;
  onClick: () => void;
}) {
  const delayed = isDelayed(deliverable);
  const meta = DELIVERABLE_STATUS_META[deliverable.status];

  return (
    <TableRow
      onClick={onClick}
      className={cn("cursor-pointer", delayed && "bg-rose-500/5")}
    >
      <TableCell className="max-w-48 truncate font-medium">
        {deliverable.name}
      </TableCell>
      <TableCell>
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
            meta.badge
          )}
        >
          {meta.label}
        </span>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {deliverable.assignee || "-"}
      </TableCell>
      <TableCell
        className={cn(
          delayed
            ? "font-medium text-rose-600 dark:text-rose-400"
            : "text-muted-foreground"
        )}
      >
        {deliverable.plannedEndDate ?? "-"}
      </TableCell>
    </TableRow>
  );
}

function DeliverableGridCard({
  deliverable,
  onClick,
}: {
  deliverable: Deliverable;
  onClick: () => void;
}) {
  const delayed = isDelayed(deliverable);
  const meta = DELIVERABLE_STATUS_META[deliverable.status];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "space-y-2 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50",
        delayed ? "border-rose-400/60 bg-rose-500/5" : "border-border"
      )}
    >
      <p className="truncate text-sm font-medium">{deliverable.name}</p>
      <span
        className={cn(
          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
          meta.badge
        )}
      >
        {meta.label}
      </span>
      <p className="truncate text-xs text-muted-foreground">
        担当者: {deliverable.assignee || "-"}
      </p>
      <p
        className={cn(
          "text-xs",
          delayed ? "font-medium text-rose-600 dark:text-rose-400" : "text-muted-foreground"
        )}
      >
        期限: {deliverable.plannedEndDate ?? "-"}
      </p>
    </button>
  );
}

export function DeliverableCard({
  deliverable,
  onUpdate,
  onDelete,
}: {
  deliverable: Deliverable;
  onUpdate: (id: string, data: DeliverableUpdate) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [name, setName] = React.useState(deliverable.name);
  const [status, setStatus] = React.useState(deliverable.status);
  const [assignee, setAssignee] = React.useState(deliverable.assignee);
  const [link, setLink] = React.useState(deliverable.link);
  const [plannedStartDate, setPlannedStartDate] = React.useState(
    deliverable.plannedStartDate
  );
  const [plannedEndDate, setPlannedEndDate] = React.useState(
    deliverable.plannedEndDate
  );
  const [actualStartDate, setActualStartDate] = React.useState(
    deliverable.actualStartDate
  );
  const [actualEndDate, setActualEndDate] = React.useState(
    deliverable.actualEndDate
  );
  const [progress, setProgress] = React.useState(deliverable.progress);
  const [memo, setMemo] = React.useState(deliverable.memo);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const isValid = name.trim().length > 0;
  const isDirty =
    name !== deliverable.name ||
    status !== deliverable.status ||
    assignee !== deliverable.assignee ||
    link !== deliverable.link ||
    plannedStartDate !== deliverable.plannedStartDate ||
    plannedEndDate !== deliverable.plannedEndDate ||
    actualStartDate !== deliverable.actualStartDate ||
    actualEndDate !== deliverable.actualEndDate ||
    progress !== deliverable.progress ||
    memo !== deliverable.memo;

  const delayed = isDelayed(deliverable);
  const showProgress =
    status === "in_progress" || status === "on_hold" || status === "in_review";

  function handleStatusChange(next: DeliverableStatus) {
    setStatus(next);
    if (next === "done") setProgress(100);
    else if (next === "not_started") setProgress(0);
    else if (progress === 0 || progress === 100) setProgress(10);
  }

  async function handleSave() {
    if (!isValid || saving) return;
    setSaving(true);
    try {
      await onUpdate(deliverable.id, {
        name: name.trim(),
        status,
        assignee,
        link: link.trim(),
        plannedStartDate,
        plannedEndDate,
        actualStartDate,
        actualEndDate,
        progress,
        memo,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={cn(
        "space-y-3 rounded-lg border p-3",
        delayed ? "border-rose-400/60 bg-rose-500/5" : "border-border"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="成果物名"
          className="h-8 flex-1 font-medium"
        />
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          aria-label="削除"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <DeliverableStatusPicker value={status} onChange={handleStatusChange} />

      {showProgress && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>進捗</span>
            <span>{progress}%</span>
          </div>
          <Slider
            value={[progress]}
            onValueChange={(value) =>
              setProgress(Array.isArray(value) ? value[0] : value)
            }
            min={0}
            max={100}
            step={10}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">担当者</Label>
          <Input
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            className="h-8"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">リンク</Label>
          <div className="flex gap-1.5">
            <Input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://..."
              className="h-8 flex-1"
            />
            {link.trim() && (
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                nativeButton={false}
                render={
                  <a href={link.trim()} target="_blank" rel="noreferrer" />
                }
                aria-label="リンクを開く"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">予定開始日</Label>
          <Input
            type="date"
            value={plannedStartDate ?? ""}
            onChange={(e) => setPlannedStartDate(e.target.value || null)}
            className="h-8"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">予定完了日</Label>
          <Input
            type="date"
            value={plannedEndDate ?? ""}
            onChange={(e) => setPlannedEndDate(e.target.value || null)}
            className="h-8"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">実績開始日</Label>
          <Input
            type="date"
            value={actualStartDate ?? ""}
            onChange={(e) => setActualStartDate(e.target.value || null)}
            className="h-8"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">実績完了日</Label>
          <Input
            type="date"
            value={actualEndDate ?? ""}
            onChange={(e) => setActualEndDate(e.target.value || null)}
            className="h-8"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">メモ</Label>
        <Textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          className="min-h-16 text-sm"
        />
      </div>

      <div className="flex items-center justify-end gap-3">
        {isDirty && (
          <span className="mr-auto text-xs text-muted-foreground">
            保存されていない変更があります
          </span>
        )}
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={!isDirty || !isValid || saving}
        >
          保存
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>削除しますか?</AlertDialogTitle>
            <AlertDialogDescription>
              この成果物を削除しますか?この操作は元に戻せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={() => onDelete(deliverable.id)}
            >
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
