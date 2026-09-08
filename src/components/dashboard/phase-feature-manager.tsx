"use client";

import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AddFromMasterPopover } from "@/components/dashboard/add-from-master-popover";
import { SimpleMasterList } from "@/components/dashboard/simple-master-list";
import type { Feature, Phase } from "@/components/dashboard/types";
import {
  createFeatureAction,
  deleteFeatureAction,
  updateFeatureAction,
} from "@/lib/actions/features";
import {
  addGlobalPhasesToProjectAction,
  createPhaseAction,
  deletePhaseAction,
  listGlobalPhasesAction,
  updatePhaseAction,
} from "@/lib/actions/phases";

type PhaseFeatureManagerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  phases: Phase[];
  features: Feature[];
  onPhasesChange: (phases: Phase[]) => void;
  onFeaturesChange: (features: Feature[]) => void;
};

export function PhaseFeatureManager({
  open,
  onOpenChange,
  projectId,
  phases,
  features,
  onPhasesChange,
  onFeaturesChange,
}: PhaseFeatureManagerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>工程・機能を管理</DialogTitle>
          <DialogDescription>
            全体進捗ビューの列(工程)・行(機能)を編集します。削除するとこの工程/機能に紐づく成果物も削除されます。
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-2 sm:grid-cols-2">
          <SimpleMasterList
            title="工程"
            items={phases}
            deleteWarning="この工程に紐づく成果物もすべて削除されます。"
            headerAction={
              <AddFromMasterPopover
                label="マスタから追加"
                loadOptions={listGlobalPhasesAction}
                existingNames={phases.map((p) => p.name)}
                onAdd={async (ids) => {
                  try {
                    const fresh = await addGlobalPhasesToProjectAction(
                      projectId,
                      ids
                    );
                    onPhasesChange(fresh);
                    toast.success("工程を追加しました");
                  } catch {
                    toast.error("追加に失敗しました");
                  }
                }}
              />
            }
            onCreate={async (name) => {
              try {
                onPhasesChange(await createPhaseAction(projectId, name));
                toast.success(`「${name}」を追加しました`);
              } catch {
                toast.error("追加に失敗しました");
              }
            }}
            onUpdate={async (id, name) => {
              try {
                onPhasesChange(await updatePhaseAction(id, { name }));
                toast.success("更新しました");
              } catch {
                toast.error("更新に失敗しました");
              }
            }}
            onDelete={async (id) => {
              const target = phases.find((p) => p.id === id);
              try {
                onPhasesChange(await deletePhaseAction(id));
                toast.success(`「${target?.name ?? ""}」を削除しました`);
              } catch {
                toast.error("削除に失敗しました");
              }
            }}
          />

          <SimpleMasterList
            title="機能"
            items={features}
            deleteWarning="この機能に紐づく成果物もすべて削除されます。"
            onCreate={async (name) => {
              try {
                onFeaturesChange(await createFeatureAction(projectId, name));
                toast.success(`「${name}」を追加しました`);
              } catch {
                toast.error("追加に失敗しました");
              }
            }}
            onUpdate={async (id, name) => {
              try {
                onFeaturesChange(await updateFeatureAction(id, { name }));
                toast.success("更新しました");
              } catch {
                toast.error("更新に失敗しました");
              }
            }}
            onDelete={async (id) => {
              const target = features.find((f) => f.id === id);
              try {
                onFeaturesChange(await deleteFeatureAction(id));
                toast.success(`「${target?.name ?? ""}」を削除しました`);
              } catch {
                toast.error("削除に失敗しました");
              }
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
