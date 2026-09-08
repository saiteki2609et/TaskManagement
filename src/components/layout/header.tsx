import Link from "next/link";
import {
  Bell,
  Calendar,
  CheckSquare,
  FolderKanban,
  LayoutDashboard,
  Search,
  Settings,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PAGE_CONTAINER } from "@/lib/constants";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  active?: boolean;
};

const mainNavItems: NavItem[] = [
  { label: "ダッシュボード", href: "/dashboard", icon: LayoutDashboard, active: true },
  { label: "プロジェクト管理", href: "/projects", icon: FolderKanban, active: true },
  { label: "カレンダー", href: "/calendar", icon: Calendar },
  { label: "Todo", href: "/todo", icon: CheckSquare, active: true },
];

const utilityItems: { label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { label: "検索", icon: Search },
  { label: "通知", icon: Bell },
  { label: "設定", icon: Settings },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className={cn(PAGE_CONTAINER, "flex h-16 items-center gap-5")}>
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <CheckSquare className="h-4 w-4" />
          </div>
          <span className="hidden text-sm font-semibold tracking-tight sm:inline">
            TaskFlow
          </span>
        </Link>

        <Separator orientation="vertical" className="h-6" />

        {/* Main nav */}
        <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
          {mainNavItems.map((item) => (
            <NavLink key={item.label} item={item} />
          ))}
        </nav>

        {/* Utility icons */}
        <div className="flex items-center gap-1 shrink-0">
          {utilityItems.map((item) => (
            <UtilityButton key={item.label} label={item.label} icon={item.icon} />
          ))}

          <ThemeToggle />

          <Separator orientation="vertical" className="mx-1 h-6" />

          <Tooltip>
            <TooltipTrigger
              disabled
              aria-disabled="true"
              className="flex items-center gap-2 rounded-full p-1 pr-2 text-sm text-muted-foreground opacity-50 cursor-not-allowed"
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs">YU</AvatarFallback>
              </Avatar>
              <span className="hidden md:inline">ユーザーメニュー</span>
            </TooltipTrigger>
            <TooltipContent>近日公開予定です</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </header>
  );
}

function NavLink({ item }: { item: NavItem }) {
  const Icon = item.icon;

  if (item.active) {
    return (
      <Link
        href={item.href}
        className={cn(
          "relative flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          "bg-primary/10 text-primary"
        )}
      >
        <Icon className="h-4 w-4" />
        <span>{item.label}</span>
      </Link>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger
        disabled
        aria-disabled="true"
        className="flex cursor-not-allowed items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground/50"
      >
        <Icon className="h-4 w-4" />
        <span>{item.label}</span>
      </TooltipTrigger>
      <TooltipContent>近日公開予定です</TooltipContent>
    </Tooltip>
  );
}

function UtilityButton({
  label,
  icon: Icon,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        disabled
        aria-disabled="true"
        aria-label={label}
        className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground opacity-50 cursor-not-allowed"
      >
        <Icon className="h-[18px] w-[18px]" />
      </TooltipTrigger>
      <TooltipContent>近日公開予定です</TooltipContent>
    </Tooltip>
  );
}

export function ComingSoonBadge() {
  return (
    <Badge variant="secondary" className="font-normal">
      近日公開
    </Badge>
  );
}
