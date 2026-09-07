import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DashboardView } from "@/components/dashboard/dashboard-view";
import type {
  Deliverable,
  DeliverableType,
  Feature,
  Phase,
} from "@/components/dashboard/types";
import { listDeliverableTypesAction } from "@/lib/actions/deliverable-types";
import { listDeliverablesAction } from "@/lib/actions/deliverables";
import { listFeaturesAction } from "@/lib/actions/features";
import { listPhasesAction } from "@/lib/actions/phases";
import { listSwitchableProjectsAction } from "@/lib/actions/projects";
import { PAGE_CONTAINER } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "進捗ダッシュボード | TaskFlow",
  description: "工程・成果物単位でプロジェクトの進み具合を可視化します",
};

const VALID_TABS = ["matrix", "gantt", "qa"] as const;
type DashboardTab = (typeof VALID_TABS)[number];

function resolveTab(value: string | undefined): DashboardTab {
  return (VALID_TABS as readonly string[]).includes(value ?? "")
    ? (value as DashboardTab)
    : "matrix";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const projects = await listSwitchableProjectsAction();
  const tab = resolveTab(params.tab);

  const projectExists =
    !!params.project && projects.some((p) => p.id === params.project);

  if (!projectExists) {
    const fallback = projects[0];
    if (fallback) {
      redirect(`/dashboard?project=${fallback.id}&tab=${tab}`);
    }
  }

  const currentProjectId = projectExists ? params.project! : null;

  let features: Feature[] = [];
  let phases: Phase[] = [];
  let deliverableTypes: DeliverableType[] = [];
  let deliverables: Deliverable[] = [];

  if (currentProjectId) {
    [features, phases, deliverableTypes, deliverables] = await Promise.all([
      listFeaturesAction(currentProjectId),
      listPhasesAction(currentProjectId),
      listDeliverableTypesAction(currentProjectId),
      listDeliverablesAction(currentProjectId),
    ]);
  }

  return (
    <div className={cn(PAGE_CONTAINER, "py-10")}>
      <DashboardView
        switchableProjects={projects}
        currentProjectId={currentProjectId}
        initialTab={tab}
        features={features}
        phases={phases}
        deliverableTypes={deliverableTypes}
        deliverables={deliverables}
      />
    </div>
  );
}
