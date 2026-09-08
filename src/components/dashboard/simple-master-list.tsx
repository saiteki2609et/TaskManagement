"use client";

import * as React from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";

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
import { Input } from "@/components/ui/input";

type MasterItem = { id: string; name: string };

type SimpleMasterListProps<T extends MasterItem> = {
  title: string;
  items: T[];
  onCreate: (name: string) => Promise<void>;
  onUpdate: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  deleteWarning: string;
  headerAction?: React.ReactNode;
};

export function SimpleMasterList<T extends MasterItem>({
  title,
  items,
  onCreate,
  onUpdate,
  onDelete,
  deleteWarning,
  headerAction,
}: SimpleMasterListProps<T>) {
  const [newName, setNewName] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed || creating) return;
    setCreating(true);
    try {
      await onCreate(trimmed);
      setNewName("");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">{title}</h4>
        {headerAction}
      </div>
      <form onSubmit={handleCreate} className="flex gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={`${title}名を入力`}
          className="h-8"
        />
        <Button type="submit" size="sm" disabled={!newName.trim() || creating}>
          追加
        </Button>
      </form>
      {items.length === 0 ? (
        <p className="rounded-md border border-dashed border-border py-4 text-center text-xs text-muted-foreground">
          {title}が未登録です
        </p>
      ) : (
        <ul className="space-y-1">
          {items.map((item) => (
            <MasterRow
              key={item.id}
              item={item}
              onUpdate={onUpdate}
              onDelete={onDelete}
              deleteWarning={deleteWarning}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function MasterRow({
  item,
  onUpdate,
  onDelete,
  deleteWarning,
}: {
  item: MasterItem;
  onUpdate: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  deleteWarning: string;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(item.name);
  const [prevEditing, setPrevEditing] = React.useState(editing);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  if (editing !== prevEditing) {
    setPrevEditing(editing);
    if (editing) setDraft(item.name);
  }

  async function handleSave() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    await onUpdate(item.id, trimmed);
    setEditing(false);
  }

  return (
    <li className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1.5">
      {editing ? (
        <>
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="h-7 flex-1"
            autoFocus
          />
          <button
            type="button"
            onClick={handleSave}
            aria-label="保存"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            aria-label="キャンセル"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </>
      ) : (
        <>
          <span className="flex-1 truncate text-sm">{item.name}</span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label="編集"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            aria-label="削除"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>削除しますか?</AlertDialogTitle>
            <AlertDialogDescription>
              「{item.name}」を削除します。{deleteWarning}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={() => onDelete(item.id)}
            >
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}
