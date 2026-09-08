"use server";

import { spawn } from "node:child_process";

// エクスプローラーでファイルの場所を開く。このアプリはローカル1台のマシンで
// 自ホストする前提のため、サーバープロセスとブラウザが同一マシン上にある
// ことを利用している(pick-folder.tsと同様の前提)。
export async function revealFileAction(filePath: string): Promise<void> {
  if (process.platform !== "win32") {
    throw new Error("この機能はWindows環境でのみ利用できます");
  }
  const trimmed = filePath.trim();
  if (!trimmed) return;

  spawn("explorer.exe", [`/select,${trimmed}`], {
    windowsHide: true,
    detached: true,
  }).unref();
}
