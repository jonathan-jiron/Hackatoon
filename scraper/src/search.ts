import pg from "pg";
import { embed } from "./gemini.ts";

const query = process.argv.slice(2).join(" ");
const [vec] = await embed([query], "RETRIEVAL_QUERY");
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
// Same query the agent's search_knowledge tool will use: only upcoming courses, cosine distance.
const { rows } = await db.query(
  `select c.slug, k.section, 1 - (k.embedding <=> $1) as score, left(k.content, 90) as preview
   from course_chunks k join open_courses c on c.id = k.course_id
   order by k.embedding <=> $1 limit 5`,
  [`[${vec.join(",")}]`],
);
console.table(rows);
await db.end();
