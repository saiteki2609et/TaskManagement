"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { countDelayed } from "@/components/dashboard/aggregate-status";
import { GanttBar, GanttRollupBar } from "@/components/dashboard/gantt-bar";
import {
  buildDateScale,
  computeDateRange,
  type GanttUnit,
} from "@/components/dashboard/gantt-date-scale";
import type { Deliverable, Feature, Phase } from "@/components/dashboard/types";
import { cn } from "@/lib/utils";

const ALL_VALUE = "__all__";

const UNIT_LABEL: Record<GanttUnit, string> = {
  week: "週",
  month: "月",
  quarter: "四半期",
};

type GanttViewProps = {
  features: Feature[];
  phases: Phase[];
  deliverables: Deliverable[];
};

export function GanttView({ features, phases, deliverables }: GanttViewProps) {
  const [unit, setUnit] = React.useState<GanttUnit>("month");
  const [expandedFeatureIds, setExpandedFeatureIds] = React.useState<
    Set<string>
  >(new Set());
  const [filterFeatureId, setFilterFeatureId] = React.useState(ALL_VALUE);
  const [filterPhaseId, setFilterPhaseId] = React.useState(ALL_VALUE);

  function toggleExpand(featureId: string) {
    setExpandedFeatureIds((prev) => {
      const next = new Set(prev);
      if (next.has(featureId)) next.delete(featureId);
      else next.add(featureId);
      return next;
    });
  }

  const filteredDeliverables = React.useMemo(
    () =>
      deliverables.filter(
        (d) =>
          (filterFeatureId === ALL_VALUE || d.featureId === filterFeatureId) &&
          (filterPhaseId === ALL_VALUE || d.phaseId === filterPhaseId)
      ),
    [deliverables, filterFeatureId, filterPhaseId]
  );

  const groups = React.useMemo(
    () =>
      features
        .filter((f) => filterFeatureId === ALL_VALUE || f.id === filterFeatureId)
        .map((feature) => ({
          feature,
          deliverables: filteredDeliverables.filter(
            (d) => d.featureId === feature.id
          ),
        }))
        .filter((group) => group.deliverables.length > 0),
    [features, filteredDeliverables, filterFeatureId]
  );

  const scale = React.useMemo(() => {
    const range = computeDateRange(filteredDeliverables);
    return buildDateScale(unit, range.start, range.end);
  }, [filteredDeliverables, unit]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-lg border border-border p-1">
          {(Object.keys(UNIT_LABEL) as GanttUnit[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setUnit(value)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                unit === value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {UNIT_LABEL[value]}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <Select
            items={[
              { label: "機能: 全て", value: ALL_VALUE },
              ...features.map((f) => ({ label: f.name, value: f.id })),
            ]}
            value={filterFeatureId}
            onValueChange={(value) => setFilterFeatureId(String(value))}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>機能: 全て</SelectItem>
              {features.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            items={[
              { label: "工程: 全て", value: ALL_VALUE },
              ...phases.map((p) => ({ label: p.name, value: p.id })),
            ]}
            value={filterPhaseId}
            onValueChange={(value) => setFilterPhaseId(String(value))}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>工程: 全て</SelectItem>
              {phases.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          表示できる成果物がありません
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 w-56 min-w-56 border-b border-border bg-background p-2 text-left align-bottom text-xs font-medium text-muted-foreground">
                  機能 / 成果物
                </th>
                <th className="border-b border-border p-0 align-bottom">
                  <div
                    className="relative h-8"
                    style={{ width: scale.totalWidthPx }}
                  >
                    {scale.columns.map((col) => (
                      <div
                        key={col.offsetPx}
                        className="absolute top-0 bottom-0 border-l border-border/60 pl-1 text-xs whitespace-nowrap text-muted-foreground"
                        style={{ left: col.offsetPx }}
                      >
                        {col.label}
                      </div>
                    ))}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => {
                const expanded = expandedFeatureIds.has(group.feature.id);
                const delayedCount = countDelayed(group.deliverables);
                return (
                  <React.Fragment key={group.feature.id}>
                    <tr
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => toggleExpand(group.feature.id)}
                    >
                      <td className="sticky left-0 z-10 border-b border-border bg-background p-2 font-medium">
                        <div className="flex items-center gap-1.5">
                          <ChevronRight
                            className={cn(
                              "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
                              expanded && "rotate-90"
                            )}
                          />
                          <span className="truncate">{group.feature.name}</span>
                          {delayedCount > 0 && (
                            <span className="shrink-0 text-xs font-medium text-rose-600">
                              (遅延{delayedCount}件)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="border-b border-border p-0">
                        <div
                          className="relative h-10"
                          style={{ width: scale.totalWidthPx }}
                        >
                          <GanttRollupBar
                            deliverables={group.deliverables}
                            scale={scale}
                          />
                        </div>
                      </td>
                    </tr>
                    {expanded &&
                      group.deliverables.map((deliverable) => (
                        <tr key={deliverable.id}>
                          <td className="sticky left-0 z-10 border-b border-border bg-background p-2 pl-8 text-muted-foreground">
                            <span className="truncate">{deliverable.name}</span>
                          </td>
                          <td className="border-b border-border p-0">
                            <div
                              className="relative h-10"
                              style={{ width: scale.totalWidthPx }}
                            >
                              <GanttBar deliverable={deliverable} scale={scale} />
                            </div>
                          </td>
                        </tr>
                      ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
