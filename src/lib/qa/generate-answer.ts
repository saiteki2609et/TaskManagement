import type { QaSource } from "@/components/dashboard/types";
import { chat } from "@/lib/llm/ollama-client";
import type { RetrievedChunk } from "@/lib/qa/retrieve";

const SYSTEM_PROMPT =
  "あなたはプロジェクトの設計書に基づいて質問に答えるアシスタントです。" +
  "提供された参照情報のみを根拠に回答し、根拠が無い場合は「設計書からは判断できません」と答えてください。" +
  "日本語で簡潔に回答してください。";

export async function generateAnswer(
  question: string,
  chunks: RetrievedChunk[]
): Promise<{ answer: string; sources: QaSource[] }> {
  if (chunks.length === 0) {
    return {
      answer:
        "参照できる設計書がまだありません。プロジェクト管理画面で設計書フォルダを設定し、「再取り込み」を実行してください。",
      sources: [],
    };
  }

  const context = chunks
    .map((c) => `## ${c.documentTitle} - ${c.sectionLabel}\n${c.content}`)
    .join("\n\n");

  const answer = await chat([
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `# 参照情報\n${context}\n\n# 質問\n${question}` },
  ]);

  const seen = new Set<string>();
  const sources: QaSource[] = [];
  for (const c of chunks) {
    const key = `${c.documentId}:${c.sectionLabel}`;
    if (seen.has(key)) continue;
    seen.add(key);
    sources.push({
      documentId: c.documentId,
      documentTitle: c.documentTitle,
      sectionLabel: c.sectionLabel,
      filePath: c.filePath,
      snippet: c.content,
    });
  }

  return { answer, sources };
}
