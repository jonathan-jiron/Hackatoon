import pg from "pg";
import { BASE_URL } from "./config.ts";
import { parseCourseLinks, parseCoursePage, type Course } from "./parse.ts";

const get = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.text();
};

const COLUMNS = [
  "slug", "title", "description", "objectives", "venue", "organizers", "instructors",
  "enrollment_start", "enrollment_end", "start_date", "end_date", "schedule_text",
  "min_seats", "max_seats", "price_uta_student", "price_uta_grad_staff", "price_public",
  "certificate_type", "hours", "audience", "modality", "prerequisites", "materials",
  "contents", "poster_url", "content_hash", "source_url",
] as const;

async function upsert(db: pg.Client, c: Course): Promise<"inserted" | "updated" | "unchanged"> {
  const existing = await db.query("select content_hash from courses where source_url = $1", [c.source_url]);
  if (existing.rows[0]?.content_hash === c.content_hash) return "unchanged";
  const values = COLUMNS.map((k) => c[k]);
  const placeholders = COLUMNS.map((_, i) => `$${i + 1}`).join(",");
  const updates = COLUMNS.filter((k) => k !== "source_url").map((k) => `${k} = excluded.${k}`).join(",");
  await db.query(
    `insert into courses (${COLUMNS.join(",")}) values (${placeholders})
     on conflict (source_url) do update set ${updates}, scraped_at = now()`,
    values,
  );
  // Content changed: drop stale chunks so the next embed run rebuilds them.
  await db.query("delete from course_chunks where course_id = (select id from courses where source_url = $1)", [c.source_url]);
  return existing.rows.length ? "updated" : "inserted";
}

const db = new pg.Client({ connectionString: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:54322/ctt" });
await db.connect();

const links = parseCourseLinks(await get(new URL("course.php", BASE_URL).href), BASE_URL);
const now = Date.now();
const counts = { inserted: 0, updated: 0, unchanged: 0, skipped: 0 };

for (const url of links) {
  const course = parseCoursePage(await get(url), url);
  // Only courses that have not started yet are stored; unknown dates can't be verified, so they are skipped too.
  if (!course.start_date || Date.parse(course.start_date) <= now) {
    counts.skipped++;
    continue;
  }
  const result = await upsert(db, course);
  counts[result]++;
  console.log(`${result.padEnd(9)} ${course.slug}  ${course.start_date.slice(0, 10)}  ${course.title}`);
}

console.log(counts);
await db.end();
