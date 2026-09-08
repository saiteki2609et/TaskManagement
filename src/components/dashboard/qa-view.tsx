"use client";

import * as React from "react";
import { Folder, FolderOpen, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import type {
  DesignDocument,
  QaHistoryItem,
  QaSource,
} from "@/components/dashboard/types";
import {
  getDesignDocumentChunksAction,
  listDesignDocumentsAction,
  rescanDesignDocumentsAction,
} from "@/lib/actions/design-documents";
import {
  askQuestionAction,
  clearQaHistoryAction,
  listQaHistoryAction,
} from "@/lib/actions/qa";
import { revealFileAction } from "@/lib/actions/reveal-file";
import { cn } from "@/lib/utils";

const INDEX_STATUS_META: Record<
  DesignDocument["indexStatus"],
  { label: string; badge: string }
> = {
  pending: {
    label: "未取込",
    badge: "bg-muted text-muted-foreground ring-1 ring-inset ring-border",
  },
  processing: {
    label: "更新中",
    badge:
      "bg-sky-500/10 text-sky-600 dark:text-sky-400 ring-1 ring-inset ring-sky-500/20",
  },
  indexed: {
    label: "取込済",
    badge:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-inset ring-emerald-500/20",
  },
  failed: {
    label: "失敗",
    badge:
      "bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-1 ring-inset ring-rose-500/20",
  },
};

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

type DocTreeNode = {
  name: string;
  children: Map<string, DocTreeNode>;
  doc?: DesignDocument;
};

// 設計書フォルダからの相対パスをもとにフォルダ階層のツリーを組み立てる。
// filePathはOSのパス区切り(Windowsは\)で保存されているため、まず/に統一する。
function buildDocumentTree(
  documents: DesignDocument[],
  folderPath: string
): DocTreeNode {
  const normalize = (p: string) => p.replace(/\\/g, "/");
  const rootPrefix = normalize(folderPath).replace(/\/+$/, "");
  const root: DocTreeNode = { name: "", children: new Map() };

  for (const doc of documents) {
    const normalized = normalize(doc.filePath);
    const relative = normalized.startsWith(rootPrefix)
      ? normalized.slice(rootPrefix.length)
      : normalized;
    const parts = relative.split("/").filter(Boolean);

    let node = root;
    parts.forEach((part, i) => {
      let child = node.children.get(part);
      if (!child) {
        child = { name: part, children: new Map() };
        node.children.set(part, child);
      }
      if (i === parts.length - 1) child.doc = doc;
      node = child;
    });
  }

  return root;
}

function sortTreeEntries(node: DocTreeNode): DocTreeNode[] {
  return [...node.children.values()].sort((a, b) => {
    const aIsFolder = !a.doc;
    const bIsFolder = !b.doc;
    if (aIsFolder !== bIsFolder) return aIsFolder ? -1 : 1;
    return a.name.localeCompare(b.name, "ja");
  });
}

export function QaView({ projectId, designDocFolderPath }: QaViewProps) {
  const [loading, setLoading] = React.useState(true);
  const [documents, setDocuments] = React.useState<DesignDocument[]>([]);
  const [pendingCount, setPendingCount] = React.useState(0);
  const [lastScannedAt, setLastScannedAt] = React.useState<string | null>(null);
  const [history, setHistory] = React.useState<QaHistoryItem[]>([]);
  const [rescanning, setRescanning] = React.useState(false);
  const [question, setQuestion] = React.useState("");
  const [asking, setAsking] = React.useState(false);
  const [previewDoc, setPreviewDoc] = React.useState<DesignDocument | null>(
    null
  );
  const [previewChunks, setPreviewChunks] = React.useState<
    { sectionLabel: string; content: string }[]
  >([]);
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = React.useState(false);
  const [clearingHistory, setClearingHistory] = React.useState(false);

  const documentTree = React.useMemo(
    () => buildDocumentTree(documents, designDocFolderPath),
    [documents, designDocFolderPath]
  );

  async function handlePreview(doc: DesignDocument) {
    setPreviewDoc(doc);
    setPreviewChunks([]);
    setPreviewLoading(true);
    try {
      const result = await getDesignDocumentChunksAction(doc.id);
      setPreviewChunks(result.chunks);
    } catch {
      toast.error("設計書の内容取得に失敗しました");
    } finally {
      setPreviewLoading(false);
    }
  }

  React.useEffect(() => {
    let cancelled = false;
    Promise.all([
      listDesignDocumentsAction(projectId),
      listQaHistoryAction(projectId),
    ])
      .then(([docsResult, historyResult]) => {
        if (cancelled) return;
        setDocuments(docsResult.documents);
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
    // 取り込み中はファイル単位の状態(処理中/取込済み)をSSEで反映する。
    // Server Actionは同一クライアントからの多重呼び出しが直列化され、
    // 実行中の再取り込みアクションの完了まで通信が送信されないため、
    // 直列化の対象外である通常のRoute Handler経由のSSEで取得する。
    // 一定間隔のポーリングだと、Ollamaの埋め込みが2件目以降は短時間で
    // 完了するため状態遷移を取りこぼしてしまう。サーバー側で状態が
    // 変化した瞬間にpushされるSSEなら取りこぼさない。
    const eventSource = new EventSource(`/api/design-documents/${projectId}`);
    eventSource.onmessage = (e) => {
      const docsResult = JSON.parse(e.data);
      setDocuments(docsResult.documents);
    };

    try {
      const result = await rescanDesignDocumentsAction(projectId);
      const summary = `追加${result.added}件・更新${result.updated}件・失敗${result.failed}件`;
      if (result.failed > 0) {
        toast.warning(`取り込みが完了しました(${summary})`);
      } else {
        toast.success(`取り込みが完了しました(${summary})`);
      }
    } catch {
      toast.error("取り込みに失敗しました");
    } finally {
      eventSource.close();
      setRescanning(false);
      const docsResult = await listDesignDocumentsAction(projectId);
      setDocuments(docsResult.documents);
      setPendingCount(docsResult.pendingCount);
      setLastScannedAt(docsResult.lastScannedAt);
    }
  }

  async function handleReveal(filePath: string) {
    try {
      await revealFileAction(filePath);
    } catch {
      toast.error("エクスプローラーの起動に失敗しました");
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

  async function handleClearHistory() {
    setClearingHistory(true);
    try {
      await clearQaHistoryAction(projectId);
      setHistory([]);
      setConfirmClearOpen(false);
    } catch {
      toast.error("質問履歴のクリアに失敗しました");
    } finally {
      setClearingHistory(false);
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

        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">
              参照している設計書({documents.length})
            </h3>
            {documents.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                設計書はまだ取り込まれていません
              </p>
            ) : (
              <ul className="max-h-64 space-y-1 overflow-y-auto">
                <DocTreeList
                  node={documentTree}
                  depth={0}
                  onPreview={handlePreview}
                  onReveal={(filePath) => handleReveal(filePath)}
                />
              </ul>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">質問履歴</h3>
              {history.length > 0 && (
                <Tooltip>
                  <TooltipTrigger
                    onClick={() => setConfirmClearOpen(true)}
                    aria-label="質問履歴をクリア"
                    className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </TooltipTrigger>
                  <TooltipContent>質問履歴をクリア</TooltipContent>
                </Tooltip>
              )}
            </div>
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

      <AlertDialog open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>質問履歴をクリアしますか？</AlertDialogTitle>
            <AlertDialogDescription>
              このプロジェクトの質問履歴をすべて削除します。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearingHistory}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              disabled={clearingHistory}
              onClick={handleClearHistory}
            >
              クリアする
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DesignDocumentPreviewDialog
        doc={previewDoc}
        chunks={previewChunks}
        loading={previewLoading}
        onOpenChange={(open) => !open && setPreviewDoc(null)}
      />
    </div>
  );
}

function DocTreeList({
  node,
  depth,
  onPreview,
  onReveal,
}: {
  node: DocTreeNode;
  depth: number;
  onPreview: (doc: DesignDocument) => void;
  onReveal: (filePath: string) => void;
}) {
  const entries = sortTreeEntries(node);

  return (
    <>
      {entries.map((entry) =>
        entry.doc ? (
          <DesignDocumentRow
            key={entry.doc.id}
            doc={entry.doc}
            depth={depth}
            onPreview={() => onPreview(entry.doc!)}
            onReveal={() => onReveal(entry.doc!.filePath)}
          />
        ) : (
          <React.Fragment key={entry.name}>
            <li
              className="flex items-center gap-1 px-1 py-1 text-xs font-medium text-muted-foreground"
              style={{ paddingLeft: depth * 14 }}
            >
              <Folder className="h-3 w-3 shrink-0" />
              <span className="truncate">{entry.name}</span>
            </li>
            <DocTreeList
              node={entry}
              depth={depth + 1}
              onPreview={onPreview}
              onReveal={onReveal}
            />
          </React.Fragment>
        )
      )}
    </>
  );
}

function DesignDocumentRow({
  doc,
  depth,
  onPreview,
  onReveal,
}: {
  doc: DesignDocument;
  depth: number;
  onPreview: () => void;
  onReveal: () => void;
}) {
  const meta = INDEX_STATUS_META[doc.indexStatus];

  return (
    <li
      className="flex items-center gap-1 rounded-md border border-border px-2 py-1.5"
      style={{ marginLeft: depth * 14 }}
    >
      <button
        type="button"
        onClick={onPreview}
        disabled={doc.indexStatus !== "indexed"}
        className="flex min-w-0 flex-1 items-center gap-1.5 text-left disabled:cursor-not-allowed"
        title={doc.filePath}
      >
        <span className="truncate text-xs">{doc.title}</span>
      </button>
      <span
        className={cn(
          "inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
          meta.badge
        )}
      >
        {doc.indexStatus === "processing" && (
          <Loader2 className="h-2.5 w-2.5 animate-spin" />
        )}
        {meta.label}
      </span>
      <Tooltip>
        <TooltipTrigger
          onClick={onReveal}
          aria-label="エクスプローラーで開く"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground"
        >
          <FolderOpen className="h-3.5 w-3.5" />
        </TooltipTrigger>
        <TooltipContent>エクスプローラーで開く</TooltipContent>
      </Tooltip>
    </li>
  );
}

function DesignDocumentPreviewDialog({
  doc,
  chunks,
  loading,
  onOpenChange,
}: {
  doc: DesignDocument | null;
  chunks: { sectionLabel: string; content: string }[];
  loading: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={doc !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{doc?.title}</DialogTitle>
          <DialogDescription className="truncate" title={doc?.filePath}>
            {doc?.filePath}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-3 overflow-y-auto">
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              読み込み中...
            </p>
          ) : chunks.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              抽出された内容がありません
            </p>
          ) : (
            chunks.map((chunk, i) => (
              <div key={i} className="rounded-lg border border-border p-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  {chunk.sectionLabel || `セクション${i + 1}`}
                </p>
                <p className="text-sm whitespace-pre-wrap">{chunk.content}</p>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
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
