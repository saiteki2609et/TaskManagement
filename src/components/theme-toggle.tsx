"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Tooltip>
      <TooltipTrigger
        aria-label="テーマ切り替え"
        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        className="relative flex h-9 w-9 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted"
      >
        <Sun className="h-[18px] w-[18px] scale-100 rotate-0 transition-transform duration-200 dark:scale-0 dark:-rotate-90" />
        <Moon className="absolute h-[18px] w-[18px] scale-0 rotate-90 transition-transform duration-200 dark:scale-100 dark:rotate-0" />
      </TooltipTrigger>
      <TooltipContent>テーマを切り替え</TooltipContent>
    </Tooltip>
  );
}
