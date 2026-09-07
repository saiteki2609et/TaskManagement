import type { Metadata } from "next";

import { ProjectManagementView } from "@/components/projects/project-management-view";
import {
  listProjectsAction,
  listTrashedProjectsAction,
} from "@/lib/actions/projects";
import { listGlobalDeliverableTypesAction } from "@/lib/actions/deliverable-types";
import { PAGE_CONTAINER } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "プロジェクト | TaskFlow",
  description: "進捗管理プロジェクトの作成・アーカイブ・削除を行います",
};

export default async function ProjectsPage() {
  const [projects, trashed, globalTypes] = await Promise.all([
    listProjectsAction(),
    listTrashedProjectsAction(),
    listGlobalDeliverableTypesAction(),
  ]);

  return (
    <div className={cn(PAGE_CONTAINER, "py-10")}>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">プロジェクト</h1>
        <p className="text-sm text-muted-foreground">
          進捗ダッシュボードで扱うプロジェクトを管理します
        </p>
      </div>
      <ProjectManagementView
        initialProjects={projects}
        initialTrashed={trashed}
        initialGlobalTypes={globalTypes}
      />
    </div>
  );
}
