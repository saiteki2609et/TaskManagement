"use server";

import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

function escapePowerShellSingleQuoted(value: string): string {
  return value.replace(/'/g, "''");
}

// フォルダ選択のためのネイティブダイアログをサーバー側で開く。
// このアプリはローカル1台のマシンで自ホストする前提のため、
// サーバープロセスとブラウザが同一マシン上にあることを利用している。
// ブラウザの標準API(File System Access API等)はセキュリティ上
// 絶対パスを返せないため、この方式でのみ「エクスプローラーで指定」が実現できる。
//
// initialPath: ダイアログを開いた時点の初期表示フォルダ。存在しない/未指定の
// 場合はOSの「ドキュメント」フォルダにフォールバックする(編集時は現在の
// 設定値、新規作成時は未指定でドキュメントフォルダから開始する想定)。
export async function pickFolderAction(
  initialPath?: string | null
): Promise<string | null> {
  if (process.platform !== "win32") {
    throw new Error("フォルダ選択ダイアログはWindows環境でのみ利用できます");
  }

  const id = randomUUID();
  const scriptPath = path.join(os.tmpdir(), `taskflow-pick-folder-${id}.ps1`);
  const outputPath = path.join(os.tmpdir(), `taskflow-pick-folder-${id}.txt`);
  const escapedInitialPath = escapePowerShellSingleQuoted(initialPath?.trim() ?? "");

  const script = `
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.Application]::EnableVisualStyles()
$owner = New-Object System.Windows.Forms.Form
$owner.TopMost = $true
$owner.ShowInTaskbar = $false
$owner.WindowState = 'Minimized'
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = '設計書フォルダを選択してください'
$dialog.ShowNewFolderButton = $true
$initial = '${escapedInitialPath}'
if ([string]::IsNullOrWhiteSpace($initial) -or -not (Test-Path -LiteralPath $initial)) {
    $initial = [Environment]::GetFolderPath('MyDocuments')
}
$dialog.SelectedPath = $initial
$result = $dialog.ShowDialog($owner)
$owner.Dispose()
if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
    [System.IO.File]::WriteAllText('${outputPath}', $dialog.SelectedPath, [System.Text.Encoding]::UTF8)
}
`;

  // UTF-8 BOM付きで書き出す(Windows PowerShell 5.1が日本語を含む
  // スクリプトを正しく解釈するために必要)
  const BOM = "﻿";
  await fs.writeFile(scriptPath, BOM + script, "utf-8");

  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        "powershell.exe",
        ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath],
        { windowsHide: true }
      );
      let stderr = "";
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
      child.on("error", reject);
      child.on("close", (code) => {
        if (code !== 0 && stderr.trim()) {
          reject(new Error(stderr.trim()));
          return;
        }
        resolve();
      });
    });

    const content = await fs.readFile(outputPath, "utf-8").catch(() => null);
    return content && content.trim().length > 0 ? content.trim() : null;
  } finally {
    await fs.unlink(scriptPath).catch(() => {});
    await fs.unlink(outputPath).catch(() => {});
  }
}
