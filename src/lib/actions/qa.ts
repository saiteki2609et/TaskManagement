"use server";

import type { QaHistory as QaHistoryRow } from "@prisma/client";

import type { QaHistoryItem, QaSource } from "@/components/dashboard/types";
import { embed } from "@/lib/llm/ollama-client";
import { prisma } from "@/lib/prisma";
import { generateAnswer } from "@/lib/qa/generate-answer";
import { retrieveRelevantChunks } from "@/lib/qa/retrieve";

function toQaHistoryItem(row: QaHistoryRow): QaHistoryItem {
  return {
    id: row.id,
    question: row.question,
    answer: row.answer,
    sources: JSON.parse(row.sources) as QaSource[],
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listQaHistoryAction(projectId: string): Promise<QaHistoryItem[]> {
  const rows = await prisma.qaHistory.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toQaHistoryItem);
}

export async function clearQaHistoryAction(projectId: string): Promise<void> {
  await prisma.qaHistory.deleteMany({ where: { projectId } });
}

export async function askQuestionAction(
  projectId: string,
  question: string
): Promise<QaHistoryItem> {
  const trimmed = question.trim();
  if (!trimmed) {
    throw new Error("質問を入力してください");
  }

  const [questionEmbedding] = await embed([trimmed]);
  const chunks = await retrieveRelevantChunks(projectId, questionEmbedding);
  const { answer, sources } = await generateAnswer(trimmed, chunks);

  const created = await prisma.qaHistory.create({
    data: {
      projectId,
      question: trimmed,
      answer,
      sources: JSON.stringify(sources),
    },
  });

  return toQaHistoryItem(created);
}
