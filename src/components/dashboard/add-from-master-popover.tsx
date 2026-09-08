"use client";

import * as React from "react";
import { Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";

type MasterOption = { id: string; name: string };

type AddFromMasterPopoverProps = {
  label: string;
  loadOptions: () => Promise<MasterOption[]>;
  existingNames: string[];
  onAdd: (ids: string[]) => Promise<void>;
};

export function AddFromMasterPopover({
  label,
  loadOptions,
  existingNames,
  onAdd,
}: AddFromMasterPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [options, setOptions] = React.useState<MasterOption[] | null>(null);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setSelected(new Set());
      setLoading(true);
      loadOptions()
        .then(setOptions)
        .finally(() => setLoading(false));
    }
  }

  const existingNameSet = new Set(existingNames);
  const candidates = (options ?? []).filter(
    (o) => !existingNameSet.has(o.name)
  );

  function toggle(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  const allSelected =
    candidates.length > 0 && candidates.every((o) => selected.has(o.id));
  const someSelected = candidates.some((o) => selected.has(o.id));

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(candidates.map((o) => o.id)) : new Set());
  }

  async function handleAdd() {
    if (selected.size === 0) return;
    setSubmitting(true);
    try {
      await onAdd(Array.from(selected));
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button type="button" variant="outline" size="sm">
            <Plus className="h-3.5 w-3.5" />
            {label}
          </Button>
        }
      />
      <PopoverContent>
        <PopoverTitle>共通マスタから追加</PopoverTitle>
        {loading ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : candidates.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            追加できる項目がありません
          </p>
        ) : (
          <ul className="max-h-64 space-y-1 overflow-y-auto">
            <li className="border-b border-border pb-1">
              <label className="flex items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-muted">
                <Checkbox
                  checked={allSelected}
                  indeterminate={!allSelected && someSelected}
                  onCheckedChange={(checked) => toggleAll(checked === true)}
                />
                全選択
              </label>
            </li>
            {candidates.map((option) => (
              <li key={option.id}>
                <label className="flex items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-muted">
                  <Checkbox
                    checked={selected.has(option.id)}
                    onCheckedChange={(checked) =>
                      toggle(option.id, checked === true)
                    }
                  />
                  {option.name}
                </label>
              </li>
            ))}
          </ul>
        )}
        <Button
          type="button"
          size="sm"
          disabled={selected.size === 0 || submitting}
          onClick={handleAdd}
        >
          {submitting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            `選択した項目を追加(${selected.size})`
          )}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
