const need = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env var ${k}`);
  return v;
};

const API = "https://generativelanguage.googleapis.com/v1beta/models";

async function post(model: string, method: string, body: unknown) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${API}/${model}:${method}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": need("GEMINI_API_KEY") },
      body: JSON.stringify(body),
    });
    if (res.ok) return res.json();
    if ((res.status === 429 || res.status >= 500) && attempt < 4) {
      await new Promise((r) => setTimeout(r, 1500 * 2 ** attempt));
      continue;
    }
    throw new Error(`Gemini ${method} failed: ${res.status} ${await res.text()}`);
  }
}

export interface Part {
  text?: string;
  functionCall?: { name: string; args: Record<string, unknown> };
  functionResponse?: { name: string; response: unknown };
  [k: string]: unknown;
}
export interface Content {
  role: "user" | "model";
  parts: Part[];
}

export async function generate(opts: { system: string; contents: Content[]; tools?: unknown[] }): Promise<Content> {
  const json = await post(need("GEMINI_CHAT_MODEL"), "generateContent", {
    systemInstruction: { parts: [{ text: opts.system }] },
    contents: opts.contents,
    tools: opts.tools ? [{ functionDeclarations: opts.tools }] : undefined,
    generationConfig: { temperature: 0.6 },
  });
  const content = json.candidates?.[0]?.content as Content | undefined;
  if (!content) throw new Error(`Gemini returned no content: ${JSON.stringify(json.promptFeedback ?? json)}`);
  return { role: "model", parts: content.parts ?? [] };
}

export async function embedQuery(text: string): Promise<number[]> {
  const model = need("GEMINI_EMBEDDING_MODEL");
  const json = await post(model, "embedContent", {
    model: `models/${model}`,
    content: { parts: [{ text }] },
    taskType: "RETRIEVAL_QUERY",
    outputDimensionality: Number(need("EMBEDDING_DIMENSIONS")),
  });
  const v: number[] = json.embedding.values;
  const n = Math.hypot(...v) || 1;
  return v.map((x) => x / n);
}
