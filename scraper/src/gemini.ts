const need = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env var ${k}`);
  return v;
};

type TaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

const normalize = (v: number[]) => {
  const n = Math.hypot(...v) || 1;
  return v.map((x) => x / n);
};

/** Batch-embeds texts with retry/backoff on rate limits (free tier). Output is L2-normalized. */
export async function embed(texts: string[], taskType: TaskType): Promise<number[][]> {
  const model = need("GEMINI_EMBEDDING_MODEL");
  const dims = Number(need("EMBEDDING_DIMENSIONS"));
  const body = JSON.stringify({
    requests: texts.map((text) => ({
      model: `models/${model}`,
      content: { parts: [{ text }] },
      taskType,
      outputDimensionality: dims,
    })),
  });
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:batchEmbedContents`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": need("GEMINI_API_KEY") },
      body,
    });
    if (res.ok) {
      const json = (await res.json()) as { embeddings: { values: number[] }[] };
      return json.embeddings.map((e) => normalize(e.values));
    }
    if ((res.status === 429 || res.status >= 500) && attempt < 5) {
      await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
      continue;
    }
    throw new Error(`Gemini embed failed: ${res.status} ${await res.text()}`);
  }
}
