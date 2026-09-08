import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { chunkText } from "@/lib/design-docs/chunk";
import { extractSections, SUPPORTED_EXTENSIONS } from "@/lib/design-docs/extract-text";
import { embed } from "@/lib/llm/ollama-client";
import { prisma } from "@/lib/prisma";
import { encodeEmbedding } from "@/lib/qa/embedding-codec";

export type RescanResult = {
  added: number;
  updated: number;
  skipped: number;
  failed: number;
  failures: { filePath: string; reason: string }[];
};

async function walkDir(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkDir(fullPath)));
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
    failures: [],
  };

  let allFiles: string[];
  try {
    allFiles = await walkDir(folderPath);
  } catch {
    result.failed++;
    result.failures.push({
      filePath: folderPath,
      reason: "フォルダを読み込めませんでした。パスを確認してください",
    });
    return result;
  }

  const targetFiles = allFiles.filter((f) =>
    SUPPORTED_EXTENSIONS.includes(path.extname(f).toLowerCase())
  );

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
    }
  }

  return result;
}
