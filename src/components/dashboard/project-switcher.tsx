"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Project } from "@/components/dashboard/types";

type ProjectSwitcherProps = {
  projects: Pick<Project, "id" | "name">[];
  currentProjectId: string | null;
};

export function ProjectSwitcher({
  projects,
  currentProjectId,
}: ProjectSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (projects.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>プロジェクトがありません</span>
        <Link href="/projects" className={buttonVariants({ size: "sm" })}>
          プロジェクトを作成
        </Link>
      </div>
    );
  }

  function handleChange(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("project", id);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <Select
      items={projects.map((project) => ({
        label: project.name,
        value: project.id,
      }))}
      value={currentProjectId ?? undefined}
      onValueChange={(value) => handleChange(String(value))}
    >
      <SelectTrigger className="w-56">
        <SelectValue placeholder="プロジェクトを選択" />
      </SelectTrigger>
      <SelectContent>
        {projects.map((project) => (
          <SelectItem key={project.id} value={project.id}>
            {project.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
