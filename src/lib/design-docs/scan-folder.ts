import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { chunkText } from "@/lib/design-docs/chunk";
import { extractSections, SUPPORTED_EXTENSIONS } from "@/lib/design-docs/extract-text";
import { publishDesignDocProgress } from "@/lib/design-docs/progress-bus";
import { embed } from "@/lib/llm/ollama-client";
import { prisma } from "@/lib/prisma";
import { encodeEmbedding } from "@/lib/qa/embedding-codec";

export type RescanResult = {
  added: number;
  updated: number;
  skipped: number;
  failed: number;
  removed: number;
  failures: { filePath: string; reason: string }[];
};

// サブディレクトリの読み取りに個別に失敗しても(権限エラー等)、その配下だけを
// スキップして他のサブディレクトリの走査は継続する。1箇所の失敗で
// フォルダ全体の取り込みが失敗扱いになる(result.failedが0件のまま処理が
// 中断される)のを避けるための対応。
async function walkDir(
  dir: string,
  failures: { filePath: string; reason: string }[]
): Promise<string[]> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    failures.push({
      filePath: dir,
      reason: "フォルダを読み込めませんでした。パスやアクセス権限を確認してください",
    });
    return [];
  }

  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkDir(fullPath, failures)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

function sha256(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export async function scanAndIndex(
  projectId: string,
  folderPath: string
): Promise<RescanResult> {
  const result: RescanResult = {
    added: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    removed: 0,
    failures: [],
  };

  const dirFailures: { filePath: string; reason: string }[] = [];
  const allFiles = await walkDir(folderPath, dirFailures);

  if (dirFailures.length > 0) {
    result.failed += dirFailures.length;
    result.failures.push(...dirFailures);
  }

  const targetFiles = allFiles.filter((f) =>
    SUPPORTED_EXTENSIONS.includes(path.extname(f).toLowerCase())
  );

  // フォルダ移動・リネーム等で実ファイルが無くなった設計書のレコードを削除する。
  // targetFilesとの単純な差分ではなく実際にfs.accessで存在確認するのは、
  // サブディレクトリの読み取りに一時的に失敗した場合(dirFailures)に、
  // 実在するファイルのレコードを誤って削除してしまわないようにするため。
  const existingDocs = await prisma.designDocument.findMany({
    where: { projectId },
    select: { id: true, filePath: true },
  });
  const staleDocIds: string[] = [];
  for (const doc of existingDocs) {
    try {
      await fs.access(doc.filePath);
    } catch {
      staleDocIds.push(doc.id);
    }
  }
  if (staleDocIds.length > 0) {
    await prisma.designDocument.deleteMany({ where: { id: { in: staleDocIds } } });
    result.removed = staleDocIds.length;
    publishDesignDocProgress(projectId);
  }

  // ファイル単位で逐次処理する(メモリ使用量を抑えるため並列化しない)
  for (const filePath of targetFiles) {
    try {
      const buffer = await fs.readFile(filePath);
      const fileHash = sha256(buffer);
      const existing = await prisma.designDocument.findUnique({
        where: { projectId_filePath: { projectId, filePath } },
      });

      if (existing && existing.fileHash === fileHash) {
        result.skipped++;
        continue;
      }

      // 抽出・埋め込み処理の前に「処理中」を記録し、クライアントがポーリングで
      // ファイル単位の進捗(処理中/取込済み)を確認できるようにする。
      await prisma.designDocument.upsert({
        where: { projectId_filePath: { projectId, filePath } },
        update: { indexStatus: "processing" },
        create: {
          projectId,
          title: path.basename(filePath),
          filePath,
          fileHash: "",
          indexStatus: "processing",
        },
      });
      publishDesignDocProgress(projectId);

      const sections = await extractSections(filePath, buffer);
      const chunks = chunkText(sections);
      const embeddings = chunks.length > 0 ? await embed(chunks.map((c) => c.content)) : [];
      const title = path.basename(filePath);

      await prisma.$transaction(async (tx) => {
        const document = await tx.designDocument.upsert({
          where: { projectId_filePath: { projectId, filePath } },
          update: {
            title,
            fileHash,
            indexStatus: "indexed",
            indexedAt: new Date(),
          },
          create: {
            projectId,
            title,
            filePath,
            fileHash,
            indexStatus: "indexed",
            indexedAt: new Date(),
          },
        });

        await tx.documentChunk.deleteMany({ where: { documentId: document.id } });
        if (chunks.length > 0) {
          await tx.documentChunk.createMany({
            data: chunks.map((chunk, i) => ({
              documentId: document.id,
              chunkIndex: chunk.chunkIndex,
              content: chunk.content,
              sectionLabel: chunk.sectionLabel,
              embedding: encodeEmbedding(embeddings[i]),
            })),
          });
        }
      });

      if (existing) result.updated++;
      else result.added++;
      publishDesignDocProgress(projectId);
    } catch (error) {
      result.failed++;
      result.failures.push({
        filePath,
        reason: error instanceof Error ? error.message : "不明なエラーが発生しました",
      });
      await prisma.designDocument
        .upsert({
          where: { projectId_filePath: { projectId, filePath } },
          update: { indexStatus: "failed" },
          create: {
            projectId,
            title: path.basename(filePath),
            filePath,
            fileHash: "",
            indexStatus: "failed",
          },
        })
        .catch(() => {});
      publishDesignDocProgress(projectId);
    }
  }

  return result;
}
