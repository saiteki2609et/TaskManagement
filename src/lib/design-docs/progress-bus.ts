import { EventEmitter } from "node:events";

// 再取り込み中のファイル単位の状態変化(処理中/取込済み等)をSSEで配信するための
// プロセス内イベントバス。Ollamaの埋め込み応答は初回(モデルのロード)が遅く
// 以降は速いため、一定間隔のポーリングでは短時間で終わる遷移を取りこぼす。
// 状態が変わった瞬間にscanAndIndex側からpublishすることで取りこぼしをなくす。
//
// Next.jsの開発サーバーはRoute HandlerとServer Action/RSCを別のモジュール
// グラフとしてロードすることがあり、モジュール直下の変数だとそれぞれが別の
// EventEmitterインスタンスを持ってしまいpublish/subscribeが繋がらない。
// globalThisにぶら下げてプロセス全体で単一インスタンスを共有する(prisma.tsと同じ対応)。
const globalForProgressBus = globalThis as unknown as {
  designDocProgressEmitter: EventEmitter | undefined;
};

const emitter = globalForProgressBus.designDocProgressEmitter ?? new EventEmitter();
emitter.setMaxListeners(100);

if (process.env.NODE_ENV !== "production") {
  globalForProgressBus.designDocProgressEmitter = emitter;
}

export function publishDesignDocProgress(projectId: string): void {
  emitter.emit(projectId);
}

export function subscribeDesignDocProgress(
  projectId: string,
  listener: () => void
): () => void {
  emitter.on(projectId, listener);
  return () => emitter.off(projectId, listener);
}
