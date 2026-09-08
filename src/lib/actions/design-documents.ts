"use server";

import { revalidatePath } from "next/cache";

import type { DesignDocument as DesignDocumentRow } from "@prisma/client";

import type { DesignDocument } from "@/components/dashboard/types";
import { scanAndIndex, type RescanResult } from "@/lib/design-docs/scan-folder";
import { prisma } from "@/lib/prisma";

export type { RescanResult };

function toDesignDocument(row: DesignDocumentRow): DesignDocument {
  return {
    id: row.id,
    projectId: row.projectId,
    title: row.title,
    filePath: row.filePath,
    indexStatus: row.indexStatus as DesignDocument["indexStatus"],
    indexedAt: row.indexedAt ? row.indexedAt.toISOString() : null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listDesignDocumentsAction(projectId: string): Promise<{
  documents: DesignDocument[];
  pendingCount: number;
  lastScannedAt: string | null;
}> {
  const rows = await prisma.designDocument.findMany({
    where: { projectId },
    orderBy: { updatedAt: "desc" },
  });
  const documents = rows.map(toDesignDocument);
  const pendingCount = documents.filter((d) => d.indexStatus !== "indexed").length;
  const lastScannedAt =
    rows.length > 0
      ? rows
          .reduce((latest, r) => (r.updatedAt > latest ? r.updatedAt : latest), rows[0].updatedAt)
          .toISOString()
      : null;
  return { documents, pendingCount, lastScannedAt };
}

export async function getDesignDocumentChunksAction(documentId: string): Promise<{
  title: string;
  filePath: string;
  indexStatus: DesignDocument["indexStatus"];
  chunks: { sectionLabel: string; content: string }[];
}> {
  const doc = await prisma.designDocument.findUniqueOrThrow({
    where: { id: documentId },
    include: { chunks: { orderBy: { chunkIndex: "asc" } } },
  });
  return {
    title: doc.title,
    filePath: doc.filePath,
    indexStatus: doc.indexStatus as DesignDocument["indexStatus"],
    chunks: doc.chunks.map((c) => ({
      sectionLabel: c.sectionLabel,
      content: c.content,
    })),
  };
}

export async function rescanDesignDocumentsAction(
  projectId: string
): Promise<RescanResult> {
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
  });
  if (!project.designDocFolderPath.trim()) {
    return {
      added: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      failures: [{ filePath: "", reason: "設計書フォルダが設定されていません" }],
    };
  }

  const result = await scanAndIndex(projectId, project.designDocFolderPath);
  revalidatePath("/dashboard");
  return result;
}
