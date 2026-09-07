import { DELIVERABLE_STATUS_META } from "@/components/dashboard/status";
import {
  DELIVERABLE_STATUSES,
  type DeliverableStatus,
} from "@/components/dashboard/types";
import { cn } from "@/lib/utils";

type DeliverableStatusPickerProps = {
  value: DeliverableStatus;
  onChange: (value: DeliverableStatus) => void;
};

export function DeliverableStatusPicker({
  value,
  onChange,
}: DeliverableStatusPickerProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {DELIVERABLE_STATUSES.map((status) => (
        <button
          key={status}
          type="button"
          onClick={() => onChange(status)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            value === status
              ? cn(DELIVERABLE_STATUS_META[status].badge, "border-transparent")
              : "border-border text-muted-foreground hover:bg-muted"
          )}
        >
          {DELIVERABLE_STATUS_META[status].label}
        </button>
      ))}
    </div>
  );
}
