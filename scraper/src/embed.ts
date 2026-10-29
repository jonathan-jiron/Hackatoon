import pg from "pg";
import { embed } from "./gemini.ts";

const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();

const toVector = (v: number[]) => `[${v.join(",")}]`;

// Free-form text only: exact facts (price, dates) stay in SQL columns and are never answered from embeddings.
const { rows: courses } = await db.query(
  `select * from courses c where start_date > now()
   and not exists (select 1 from course_chunks k where k.course_id = c.id)`,
);

for (const c of courses) {
  const sections: [string, string | null][] = [
    ["description", c.description],
    ["objectives", c.objectives.length ? c.objectives.map((o: string) => `- ${o}`).join("\n") : null],
    ["contents", c.contents],
    ["materials", c.materials],
    ["certificate", c.certificate_type],
    ["schedule", c.schedule_text],
  ];
  const chunks = sections
    .filter((s): s is [string, string] => !!s[1])
    // Prefix the title so a chunk is meaningful on its own at retrieval time.
    .map(([section, text]) => ({ section, content: `${c.title} — ${section}\n${text}` }));
  const vectors = await embed(chunks.map((k) => k.content), "RETRIEVAL_DOCUMENT");
  for (const [i, k] of chunks.entries()) {
    await db.query("insert into course_chunks (course_id, section, content, embedding) values ($1,$2,$3,$4)", [
      c.id, k.section, k.content, toVector(vectors[i]),
    ]);
  }
  console.log(`embedded ${chunks.length} chunks  ${c.slug}`);
}
console.log(`courses embedded: ${courses.length}`);
await db.end();
