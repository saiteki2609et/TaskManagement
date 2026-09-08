"use client";

import * as React from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import type { QaHistoryItem, QaSource } from "@/components/dashboard/types";
import {
  listDesignDocumentsAction,
  rescanDesignDocumentsAction,
} from "@/lib/actions/design-documents";
import { askQuestionAction, listQaHistoryAction } from "@/lib/actions/qa";

type QaViewProps = {
  projectId: string;
  designDocFolderPath: string;
};

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function QaView({ projectId, designDocFolderPath }: QaViewProps) {
  const [loading, setLoading] = React.useState(true);
  const [pendingCount, setPendingCount] = React.useState(0);
  const [lastScannedAt, setLastScannedAt] = React.useState<string | null>(null);
  const [history, setHistory] = React.useState<QaHistoryItem[]>([]);
  const [rescanning, setRescanning] = React.useState(false);
  const [question, setQuestion] = React.useState("");
  const [asking, setAsking] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    Promise.all([
      listDesignDocumentsAction(projectId),
      listQaHistoryAction(projectId),
    ])
      .then(([docsResult, historyResult]) => {
        if (cancelled) return;
        setPendingCount(docsResult.pendingCount);
        setLastScannedAt(docsResult.lastScannedAt);
        setHistory(historyResult);
      })
      .catch(() => {
        if (!cancelled) toast.error("設計書QAの情報取得に失敗しました");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  async function handleRescan() {
    setRescanning(true);
    try {
      const result = await rescanDesignDocumentsAction(projectId);
      const summary = `追加${result.added}件・更新${result.updated}件・失敗${result.failed}件`;
      if (result.failed > 0) {
        toast.warning(`取り込みが完了しました(${summary})`);
      } else {
        toast.success(`取り込みが完了しました(${summary})`);
      }
      const docsResult = await listDesignDocumentsAction(projectId);
      setPendingCount(docsResult.pendingCount);
      setLastScannedAt(docsResult.lastScannedAt);
    } catch {
      toast.error("取り込みに失敗しました");
    } finally {
      setRescanning(false);
    }
  }

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || asking) return;
    setAsking(true);
    setQuestion("");
    try {
      const item = await askQuestionAction(projectId, trimmed);
      setHistory((prev) => [item, ...prev]);
    } catch {
      toast.error("回答の生成に失敗しました");
    } finally {
      setAsking(false);
    }
  }

  if (!designDocFolderPath.trim()) {
    return (
      <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
        設計書フォルダが未設定です。プロジェクト管理画面から設定してください
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          最終取り込み: {lastScannedAt ? formatDateTime(lastScannedAt) : "未実行"}
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleRescan}
          disabled={rescanning}
        >
          {rescanning ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          再取り込み
        </Button>
      </div>

      {pendingCount > 0 && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-700 dark:text-amber-400">
          未取り込み/インデックス未反映の設計書が{pendingCount}件あります
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <div className="space-y-3 rounded-lg border border-border p-4">
          <div className="max-h-[50vh] space-y-4 overflow-y-auto">
            {loading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                読み込み中...
              </p>
            ) : history.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                まだ質問がありません。設計書について質問してみましょう
              </p>
            ) : (
              [...history].reverse().map((item) => (
                <QaMessage key={item.id} item={item} />
              ))
            )}
            {asking && (
              <p className="text-sm text-muted-foreground">
                回答を生成しています…
              </p>
            )}
          </div>

          <form
            onSubmit={handleAsk}
            className="flex items-end gap-2 border-t border-border pt-3"
          >
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="設計書について質問を入力…"
              className="min-h-16 flex-1"
            />
            <Button type="submit" disabled={!question.trim() || asking}>
              送信
            </Button>
          </form>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">質問履歴</h3>
          {history.length === 0 ? (
            <p className="text-xs text-muted-foreground">履歴はありません</p>
          ) : (
            <ul className="space-y-1">
              {history.map((item) => (
                <li
                  key={item.id}
                  className="truncate rounded-md border border-border px-2 py-1.5 text-xs text-muted-foreground"
                  title={item.question}
                >
                  {item.question}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function QaMessage({ item }: { item: QaHistoryItem }) {
  return (
    <div className="space-y-2">
      <p className="rounded-lg bg-muted px-3 py-2 text-sm">{item.question}</p>
      <div className="space-y-2 rounded-lg border border-border px-3 py-2">
        <p className="text-sm whitespace-pre-wrap">{item.answer}</p>
        {item.sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {item.sources.map((source, i) => (
              <SourceChip key={i} source={source} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SourceChip({ source }: { source: QaSource }) {
  return (
    <Popover>
      <PopoverTrigger className="rounded-full border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted">
        {source.documentTitle} &gt; {source.sectionLabel}
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <p className="text-xs font-medium">
          {source.documentTitle} - {source.sectionLabel}
        </p>
        <p className="mt-1 truncate text-xs text-muted-foreground" title={source.filePath}>
          {source.filePath}
        </p>
        <p className="mt-2 max-h-40 overflow-y-auto text-xs whitespace-pre-wrap text-muted-foreground">
          {source.snippet}
        </p>
      </PopoverContent>
    </Popover>
  );
}
