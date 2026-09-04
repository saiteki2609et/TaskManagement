"use client";

import * as React from "react";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  csvToTasks,
  jsonToTasks,
  tasksToCsv,
  tasksToJson,
} from "@/components/todo/import-export";
import type { ImportTaskInput, TodoTask } from "@/components/todo/types";

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function timestamp() {
  return new Intl.DateTimeFormat("sv-SE").format(new Date());
}

type ExportImportMenuProps = {
  tasks: TodoTask[];
  onImport: (nodes: ImportTaskInput[]) => void;
};

export function ExportImportMenu({ tasks, onImport }: ExportImportMenuProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  function handleExportJson() {
    downloadFile(
      `tasks-${timestamp()}.json`,
      tasksToJson(tasks),
      "application/json"
    );
  }

  function handleExportCsv() {
    downloadFile(`tasks-${timestamp()}.csv`, tasksToCsv(tasks), "text/csv");
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      const text = await file.text();
      const nodes = file.name.toLowerCase().endsWith(".csv")
        ? csvToTasks(text)
        : jsonToTasks(text);
      if (nodes.length === 0) {
        toast.error("インポートできるタスクが見つかりませんでした");
        return;
      }
      onImport(nodes);
    } catch {
      toast.error("ファイルの読み込みに失敗しました");
    }
  }

  return (
    <>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger
            render={
              <DropdownMenuTrigger
                aria-label="エクスポート"
                className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-popup-open:bg-muted data-popup-open:text-foreground"
              />
            }
          >
            <Upload className="h-3.5 w-3.5" />
          </TooltipTrigger>
          <TooltipContent>エクスポート</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleExportJson}>
            JSONでエクスポート
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportCsv}>
            CSVでエクスポート
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Tooltip>
        <TooltipTrigger
          onClick={() => fileInputRef.current?.click()}
          aria-label="インポート"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Download className="h-3.5 w-3.5" />
        </TooltipTrigger>
        <TooltipContent>JSON/CSVからインポート</TooltipContent>
      </Tooltip>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.csv,application/json,text/csv"
        className="hidden"
        onChange={handleFileChange}
      />
    </>
  );
}
