import { listDesignDocumentsAction } from "@/lib/actions/design-documents";
import { subscribeDesignDocProgress } from "@/lib/design-docs/progress-bus";

// 設計書一覧の変化をSSEで配信するRoute Handler。
// Server Action(listDesignDocumentsAction)をクライアントから直接ポーリングすると、
// Next.jsのServer Action呼び出しは同一クライアントからの多重呼び出しが
// 直列化されるため、実行中の再取り込みアクションの完了までポーリングが
// 一切送信されない。Route Handler経由の通常のfetchはこの制約を受けない。
//
// また、一定間隔のポーリングでは短時間で終わる状態遷移(Ollamaの埋め込みは
// 初回のモデルロードのみ遅く、以降のファイルは短時間で処理が終わる)を
// 取りこぼすため、scanAndIndex側の状態変化のたびにpublishされるイベントを
// 購読し、変化が起きた瞬間に最新状態をpushする方式にしている。
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let closed = false;

      const send = async () => {
        if (closed) return;
        const result = await listDesignDocumentsAction(projectId);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(result)}\n\n`));
      };

      const unsubscribe = subscribeDesignDocProgress(projectId, () => {
        send().catch(() => {});
      });

      _request.signal.addEventListener("abort", () => {
        closed = true;
        unsubscribe();
        controller.close();
      });

      await send();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
