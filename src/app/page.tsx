import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Calendar,
  CheckSquare,
  FolderKanban,
  LayoutDashboard,
  Search,
  Settings,
  UserRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PAGE_CONTAINER } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Feature = {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  available: boolean;
};

const features: Feature[] = [
  {
    title: "ダッシュボード",
    description:
      "タスクの進捗やプロジェクトの状況を一目で把握できるサマリー画面。今日やるべきことや期限が近いタスクをまとめて確認できます。",
    icon: LayoutDashboard,
    available: false,
  },
  {
    title: "Todo",
    description:
      "日々のタスクを登録・管理する基本機能。優先度や期限を設定し、完了したタスクにチェックを入れるだけのシンプルな操作で作業を整理できます。",
    icon: CheckSquare,
    available: true,
  },
  {
    title: "プロジェクト",
    description:
      "複数のタスクをプロジェクト単位でグループ化し、チームでの進行状況を管理します。担当者やステータスを整理して全体の見通しを立てられます。",
    icon: FolderKanban,
    available: false,
  },
  {
    title: "カレンダー",
    description:
      "タスクや予定を月・週単位のカレンダー表示で確認できます。締め切りやマイルストーンを視覚的に把握し、スケジュール調整に役立ちます。",
    icon: Calendar,
    available: false,
  },
  {
    title: "検索",
    description:
      "タスク名やプロジェクト、タグなどを横断してすばやく検索できます。溜まった情報の中から必要な項目を瞬時に見つけ出せます。",
    icon: Search,
    available: false,
  },
  {
    title: "通知",
    description:
      "期限が近いタスクやメンバーからのコメントなど、見逃せない更新をリアルタイムで通知します。重要な変更を逃しません。",
    icon: Bell,
    available: false,
  },
  {
    title: "設定",
    description:
      "表示テーマや通知設定、アカウント情報などを管理できます。自分の使い方に合わせてアプリケーションをカスタマイズできます。",
    icon: Settings,
    available: false,
  },
  {
    title: "ユーザーメニュー",
    description:
      "プロフィールの確認やアカウント切り替え、ログアウトなどをまとめたメニューです。チームメンバーとの連携情報もここから確認できます。",
    icon: UserRound,
    available: false,
  },
];

export default function Home() {
  return (
    <div className={cn(PAGE_CONTAINER, "py-14")}>
      {/* Hero */}
      <section className="mb-14 flex flex-col items-start gap-4">
        <Badge variant="secondary" className="font-normal">
          Todo 機能 提供中
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          タスク管理を、もっとシンプルに。
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
          TaskFlow は、日々のタスクからプロジェクト全体までを一元管理できるタスク管理アプリケーションです。
          まずは Todo 機能からご利用いただけます。その他の機能は順次公開予定です。
        </p>
        <Link
          href="/todo"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Todo をはじめる
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      {/* Feature grid */}
      <section>
        <h2 className="mb-6 text-lg font-semibold tracking-tight">機能一覧</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ feature }: { feature: Feature }) {
  const Icon = feature.icon;

  return (
    <Card
      className={cn(
        "gap-3 border-border shadow-none transition-colors",
        feature.available ? "bg-card" : "bg-muted/30"
      )}
    >
      <CardHeader>
        <div className="mb-2 flex items-center justify-between">
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg",
              feature.available
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
          </div>
          <Badge
            variant={feature.available ? "default" : "secondary"}
            className="font-normal"
          >
            {feature.available ? "利用可能" : "近日公開"}
          </Badge>
        </div>
        <CardTitle className="text-base">{feature.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-sm leading-relaxed">
          {feature.description}
        </CardDescription>
      </CardContent>
    </Card>
  );
}
