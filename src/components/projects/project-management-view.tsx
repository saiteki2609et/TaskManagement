"use client";

import * as React from "react";
import { Archive, ArchiveRestore, Pencil, Trash2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GlobalDeliverableTypeSection } from "@/components/projects/global-deliverable-type-section";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { ProjectTrashTab } from "@/components/projects/project-trash-tab";
import type {
  GlobalDeliverableType,
  Project,
  TrashedProject,
} from "@/components/dashboard/types";
import type { ActionResult } from "@/lib/actions/action-result";
import {
  archiveProjectAction,
  createProjectAction,
  listTrashedProjectsAction,
  permanentlyDeleteProjectAction,
  restoreProjectAction,
  softDeleteProjectAction,
  unarchiveProjectAction,
  updateProjectAction,
} from "@/lib/actions/projects";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).format(new Date(value));
}

type ProjectManagementViewProps = {
  initialProjects: Project[];
  initialTrashed: TrashedProject[];
  initialGlobalTypes: GlobalDeliverableType[];
};

export function ProjectManagementView({
  initialProjects,
  initialTrashed,
  initialGlobalTypes,
}: ProjectManagementViewProps) {
  const [tab, setTab] = React.useState<"list" | "trash">("list");
  const [projects, setProjects] = React.useState(initialProjects);
  const [trashed, setTrashed] = React.useState(initialTrashed);
  const [formDialog, setFormDialog] = React.useState<{
    open: boolean;
    target: Project | null;
  }>({ open: false, target: null });

  async function refreshTrashed() {
    setTrashed(await listTrashedProjectsAction());
  }

  async function handleFormSubmit(data: {
    name: string;
    designDocFolderPath: string;
  }): Promise<ActionResult<Project>> {
    const editing = formDialog.target;
    try {
      const result = editing
        ? await updateProjectAction(editing.id, data)
        : await createProjectAction(data);
      if (result.ok) {
        setProjects((prev) => {
          if (editing) {
            return prev.map((p) => (p.id === result.data.id ? result.data : p));
          }
          return [result.data, ...prev];
        });
        toast.success(
          editing
            ? `「${result.data.name}」を更新しました`
            : `「${result.data.name}」を作成しました`
        );
      }
      return result;
    } catch {
      return {
        ok: false,
        error: {
          code: "UNKNOWN",
          message: editing ? "更新に失敗しました" : "作成に失敗しました",
        },
      };
    }
  }

  async function handleArchiveToggle(project: Project) {
    try {
      const updated = project.isArchived
        ? await unarchiveProjectAction(project.id)
        : await archiveProjectAction(project.id);
      setProjects((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p))
      );
      toast.success(
        updated.isArchived
          ? `「${updated.name}」をアーカイブしました`
          : `「${updated.name}」のアーカイブを解除しました`
      );
    } catch {
      toast.error("更新に失敗しました");
    }
  }

  async function handleDelete(project: Project) {
    try {
      const fresh = await softDeleteProjectAction(project.id);
      setProjects(fresh);
      await refreshTrashed();
      toast.success(`「${project.name}」を削除しました`);
    } catch {
      toast.error("削除に失敗しました");
    }
  }

  async function handleRestore(id: string) {
    const result = await restoreProjectAction(id);
    if (result.ok) {
      setProjects(result.data.projects);
      setTrashed(result.data.trashed);
      toast.success("プロジェクトを復元しました");
    } else {
      toast.error(result.error.message);
    }
  }

  async function handlePermanentlyDelete(id: string) {
    try {
      const { trashed: fresh } = await permanentlyDeleteProjectAction(id);
      setTrashed(fresh);
      toast.success("プロジェクトを完全に削除しました");
    } catch {
      toast.error("完全な削除に失敗しました");
    }
  }

  return (
    <div className="space-y-6">
      <Tabs value={tab} onValueChange={(value) => setTab(value as "list" | "trash")}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="list">プロジェクト一覧</TabsTrigger>
            <TabsTrigger value="trash">ゴミ箱</TabsTrigger>
          </TabsList>
          {tab === "list" && (
            <Button
              type="button"
              onClick={() => setFormDialog({ open: true, target: null })}
            >
              新規プロジェクト
            </Button>
          )}
        </div>

        <TabsContent value="list" className="space-y-6 pt-4">
          {projects.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
              プロジェクトがまだありません。「新規プロジェクト」から作成してください
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>プロジェクト名</TableHead>
                  <TableHead>作成日</TableHead>
                  <TableHead>設計書フォルダパス</TableHead>
                  <TableHead>状態</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">
                      {project.name}
                    </TableCell>
                    <TableCell>{formatDate(project.createdAt)}</TableCell>
                    <TableCell
                      className="max-w-64 truncate text-muted-foreground"
                      title={project.designDocFolderPath}
                    >
                      {project.designDocFolderPath}
                    </TableCell>
                    <TableCell>
                      <Badge variant={project.isArchived ? "secondary" : "default"}>
                        {project.isArchived ? "アーカイブ済み" : "稼働中"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <ProjectRowActions
                        project={project}
                        onEdit={() =>
                          setFormDialog({ open: true, target: project })
                        }
                        onArchiveToggle={() => handleArchiveToggle(project)}
                        onDelete={() => handleDelete(project)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <GlobalDeliverableTypeSection initialTypes={initialGlobalTypes} />
        </TabsContent>

        <TabsContent value="trash" className="pt-4">
          <ProjectTrashTab
            items={trashed}
            onRestore={handleRestore}
            onPermanentlyDelete={handlePermanentlyDelete}
          />
        </TabsContent>
      </Tabs>

      <ProjectFormDialog
        open={formDialog.open}
        onOpenChange={(open) => setFormDialog((s) => ({ ...s, open }))}
        target={formDialog.target}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}

function ProjectRowActions({
  project,
  onEdit,
  onArchiveToggle,
  onDelete,
}: {
  project: Project;
  onEdit: () => void;
  onArchiveToggle: () => void;
  onDelete: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  return (
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
          onClick={onArchiveToggle}
          aria-label={project.isArchived ? "アーカイブを解除" : "アーカイブ"}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {project.isArchived ? (
            <ArchiveRestore className="h-4 w-4" />
          ) : (
            <Archive className="h-4 w-4" />
          )}
        </TooltipTrigger>
        <TooltipContent>
          {project.isArchived ? "アーカイブを解除" : "アーカイブ"}
        </TooltipContent>
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

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>削除しますか?</AlertDialogTitle>
            <AlertDialogDescription>
              「{project.name}」を削除しますか?削除しても30日間はゴミ箱から復元できます。
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
    </div>
  );
}
