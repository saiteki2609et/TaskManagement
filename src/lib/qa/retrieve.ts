import { prisma } from "@/lib/prisma";
import { cosineSimilarity, decodeEmbedding } from "@/lib/qa/embedding-codec";

export type RetrievedChunk = {
  documentId: string;
  documentTitle: string;
  filePath: string;
  sectionLabel: string;
  content: string;
  score: number;
};

export async function retrieveRelevantChunks(
  projectId: string,
  questionEmbedding: number[],
  topK: number = 5
): Promise<RetrievedChunk[]> {
  const chunks = await prisma.documentChunk.findMany({
    where: { document: { projectId } },
    include: { document: true },
  });

  const scored = chunks.map((chunk) => ({
    documentId: chunk.documentId,
    documentTitle: chunk.document.title,
    filePath: chunk.document.filePath,
    sectionLabel: chunk.sectionLabel,
    content: chunk.content,
    score: cosineSimilarity(questionEmbedding, decodeEmbedding(chunk.embedding)),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}
