"use client";

import * as React from "react";
import { FolderOpen, Loader2 } from "lucide-react";
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
import type { ActionResult } from "@/lib/actions/action-result";
import type { Project } from "@/components/dashboard/types";
import { pickFolderAction } from "@/lib/actions/pick-folder";

type ProjectFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: Project | null;
  onSubmit: (data: {
    name: string;
    designDocFolderPath: string;
  }) => Promise<ActionResult<Project>>;
};

export function ProjectFormDialog({
  open,
  onOpenChange,
  target,
  onSubmit,
}: ProjectFormDialogProps) {
  const [name, setName] = React.useState("");
  const [folderPath, setFolderPath] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [picking, setPicking] = React.useState(false);
  const [prevOpen, setPrevOpen] = React.useState(open);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setName(target?.name ?? "");
      setFolderPath(target?.designDocFolderPath ?? "");
      setError(null);
    }
  }

  const isValid = name.trim().length > 0 && folderPath.trim().length > 0;

  async function handlePickFolder() {
    setPicking(true);
    try {
      const selected = await pickFolderAction(folderPath);
      if (selected) setFolderPath(selected);
    } catch {
      toast.error("フォルダ選択ダイアログの起動に失敗しました");
    } finally {
      setPicking(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || submitting) return;
    setSubmitting(true);
    setError(null);
    const result = await onSubmit({
      name: name.trim(),
      designDocFolderPath: folderPath.trim(),
    });
    setSubmitting(false);
    if (result.ok) {
      onOpenChange(false);
    } else {
      setError(result.error.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {target ? "プロジェクトを編集" : "新規プロジェクト"}
            </DialogTitle>
            <DialogDescription>
              プロジェクト名と設計書の取り込み元フォルダパスを入力してください。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="project-name">プロジェクト名</Label>
              <Input
                id="project-name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="発注管理システム"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="project-folder-path">設計書フォルダパス</Label>
              <div className="flex gap-2">
                <Input
                  id="project-folder-path"
                  value={folderPath}
                  onChange={(e) => setFolderPath(e.target.value)}
                  placeholder="C:\docs\project-a"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePickFolder}
                  disabled={picking}
                >
                  {picking ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FolderOpen className="h-4 w-4" />
                  )}
                  参照...
                </Button>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={!isValid || submitting}>
              {target ? "保存" : "作成"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
