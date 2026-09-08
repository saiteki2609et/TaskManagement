const OLLAMA_HOST = process.env.OLLAMA_HOST ?? "http://localhost:11434";
const CHAT_MODEL = process.env.OLLAMA_CHAT_MODEL ?? "gemma3:4b";
const EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL ?? "nomic-embed-text";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export async function embed(texts: string[]): Promise<number[][]> {
  const res = await fetch(`${OLLAMA_HOST}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBED_MODEL, input: texts }),
  });
  if (!res.ok) {
    throw new Error(`ローカルLLM(embedding)の呼び出しに失敗しました (status: ${res.status})`);
  }
  const data = (await res.json()) as { embeddings: number[][] };
  return data.embeddings;
}

export async function chat(messages: ChatMessage[]): Promise<string> {
  const res = await fetch(`${OLLAMA_HOST}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: CHAT_MODEL, messages, stream: false }),
  });
  if (!res.ok) {
    throw new Error(`ローカルLLM(chat)の呼び出しに失敗しました (status: ${res.status})`);
  }
  const data = (await res.json()) as { message: { content: string } };
  return data.message.content;
}
