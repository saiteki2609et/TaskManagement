"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GanttView } from "@/components/dashboard/gantt-view";
import { ProjectSwitcher } from "@/components/dashboard/project-switcher";
import { QaView } from "@/components/dashboard/qa-view";
import type {
  Deliverable,
  DeliverableType,
  Feature,
  Phase,
  Project,
} from "@/components/dashboard/types";

// dnd-kit assigns internal ids from a module-level counter that isn't
// stable between server and client renders, which trips React's
// hydration check. Rendering it client-only avoids the mismatch.
const ProgressMatrixView = dynamic(
  () =>
    import("@/components/dashboard/progress-matrix-view").then(
      (mod) => mod.ProgressMatrixView
    ),
  {
    ssr: false,
    loading: () => (
      <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
        読み込み中...
      </p>
    ),
  }
);

type DashboardTab = "matrix" | "gantt" | "qa";

type DashboardViewProps = {
  switchableProjects: Pick<Project, "id" | "name">[];
  currentProjectId: string | null;
  designDocFolderPath: string;
  initialTab: DashboardTab;
  features: Feature[];
  phases: Phase[];
  deliverableTypes: DeliverableType[];
  deliverables: Deliverable[];
};

export function DashboardView({
  switchableProjects,
  currentProjectId,
  designDocFolderPath,
  initialTab,
  features,
  phases,
  deliverableTypes,
  deliverables,
}: DashboardViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleTabChange(tab: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            進捗ダッシュボード
          </h1>
          <p className="text-sm text-muted-foreground">
            工程・成果物単位でプロジェクトの進み具合を可視化します
          </p>
        </div>
        <ProjectSwitcher
          projects={switchableProjects}
          currentProjectId={currentProjectId}
        />
      </div>

      {currentProjectId ? (
        <Tabs value={initialTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="matrix">全体進捗ビュー</TabsTrigger>
            <TabsTrigger value="gantt">スケジュール(ガント)</TabsTrigger>
            <TabsTrigger value="qa">設計書QA</TabsTrigger>
          </TabsList>

          <TabsContent value="matrix" className="pt-4">
            <ProgressMatrixView
              key={currentProjectId}
              projectId={currentProjectId}
              initialFeatures={features}
              initialPhases={phases}
              initialTypes={deliverableTypes}
              initialDeliverables={deliverables}
            />
          </TabsContent>

          <TabsContent value="gantt" className="pt-4">
            <GanttView
              key={currentProjectId}
              features={features}
              phases={phases}
              initialDeliverables={deliverables}
            />
          </TabsContent>

          <TabsContent value="qa" className="pt-4">
            <QaView
              key={currentProjectId}
              projectId={currentProjectId}
              designDocFolderPath={designDocFolderPath}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          表示できるプロジェクトがありません
        </p>
      )}
    </div>
  );
}
