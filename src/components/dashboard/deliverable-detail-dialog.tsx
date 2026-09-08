"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DeliverableCard,
  type DeliverableUpdate,
} from "@/components/dashboard/cell-detail-panel";
import type { Deliverable } from "@/components/dashboard/types";

type DeliverableDetailDialogProps = {
  deliverable: Deliverable | null;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, data: DeliverableUpdate) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export function DeliverableDetailDialog({
  deliverable,
  onOpenChange,
  onUpdate,
  onDelete,
}: DeliverableDetailDialogProps) {
  return (
    <Dialog open={deliverable !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>成果物の詳細</DialogTitle>
          <DialogDescription>
            成果物の詳細を編集します。
          </DialogDescription>
        </DialogHeader>
        {deliverable && (
          <div className="max-h-[60vh] overflow-y-auto py-1">
            <DeliverableCard
              deliverable={deliverable}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
