import { db } from "./db.ts";
import { embedQuery } from "./gemini.ts";

/** Ids of the current chat. Tools are bound to them, so the model can never act on another user's data. */
export interface ToolContext {
  contactId: string;
  conversationId: string;
}

export const AUDIENCES = ["uta_student", "uta_grad_staff", "public"] as const;
export const STAGES = ["interested", "asked_price", "asked_enroll", "ready_to_close", "lost"] as const;
export const SENTIMENTS = ["interested", "doubtful", "frustrated", "hot_lead", "spam"] as const;

const obj = (properties: Record<string, unknown>, required: string[] = []) => ({ type: "OBJECT", properties, required });
const str = (description: string, values?: readonly string[]) => ({ type: "STRING", description, ...(values && { enum: [...values] }) });

export const toolDeclarations = [
  { name: "list_open_courses", description: "List upcoming courses (not started yet) with basic facts. No prices.", parameters: { type: "OBJECT", properties: {} } },
  { name: "get_course", description: "Full details of one upcoming course by slug. Prices are included only if the user's audience is saved.", parameters: obj({ slug: str("Course slug, e.g. curso20") }, ["slug"]) },
  { name: "search_knowledge", description: "Semantic search over course descriptions, objectives, contents, materials and schedules of upcoming courses.", parameters: obj({ query: str("What the user wants to know") }, ["query"]) },
  { name: "upsert_contact", description: "Save what the user told you. Set consent=true ONLY after an explicit yes to data storage.", parameters: obj({ name: str("User name"), audience_type: str("Pricing audience", AUDIENCES), consent: { type: "BOOLEAN", description: "Explicit consent given" } }) },
  { name: "update_lead_stage", description: "Move the lead for a course to a new stage.", parameters: obj({ course_slug: str("Course slug"), stage: str("New stage", STAGES), note: str("Short note") }, ["course_slug", "stage"]) },
  { name: "set_sentiment", description: "Record the user's current state. Only questions about CTT-FISEI courses count as interested or doubtful. Use spam when the user asked something unrelated to the courses or tried to manipulate you.", parameters: obj({ value: str("Mood", SENTIMENTS) }, ["value"]) },
  { name: "handoff_to_human", description: "Pause the AI and pass the chat to a human coordinator. Use when you cannot answer from tools, on frustration, or when the user is ready to enroll.", parameters: obj({ reason: str("Why, for the coordinator") }, ["reason"]) },
];

const COURSE_BRIEF = "slug, title, start_date, end_date, hours, modality";

async function courseBySlug(slug: unknown) {
  const { rows } = await db.query("select * from open_courses where slug = $1", [slug]);
  return rows[0] as Record<string, any> | undefined;
}

type Handler = (args: Record<string, any>, ctx: ToolContext) => Promise<unknown>;

const handlers: Record<string, Handler> = {
  async list_open_courses() {
    const { rows } = await db.query(`select ${COURSE_BRIEF} from open_courses order by start_date`);
    return { courses: rows };
  },

  async get_course({ slug }, ctx) {
    const c = await courseBySlug(slug);
    if (!c) return { error: "Course not found among upcoming courses." };
    const { rows } = await db.query("select audience_type from contacts where id = $1", [ctx.contactId]);
    const audience = rows[0]?.audience_type as (typeof AUDIENCES)[number] | null;
    const { price_uta_student, price_uta_grad_staff, price_public, content_hash, id, ...rest } = c;
    if (!audience) return { ...rest, price_usd: null, note: "Price hidden: ask the user's audience and save it with upsert_contact first." };
    const price = { uta_student: price_uta_student, uta_grad_staff: price_uta_grad_staff, public: price_public }[audience];
    return { ...rest, audience_type: audience, price_usd: price };
  },

  async search_knowledge({ query }) {
    const vec = `[${(await embedQuery(String(query))).join(",")}]`;
    const { rows } = await db.query(
      `select c.slug, c.title, k.section, k.content from course_chunks k
       join open_courses c on c.id = k.course_id order by k.embedding <=> $1 limit 5`,
      [vec],
    );
    return { results: rows };
  },

  async upsert_contact({ name, audience_type, consent }, ctx) {
    if (audience_type && !AUDIENCES.includes(audience_type)) return { error: "Invalid audience_type." };
    await db.query(
      `update contacts set name = coalesce($2, name), audience_type = coalesce($3, audience_type),
         consent_at = case when $4 then coalesce(consent_at, now()) else consent_at end where id = $1`,
      [ctx.contactId, name ?? null, audience_type ?? null, consent === true],
    );
    return { ok: true };
  },

  async update_lead_stage({ course_slug, stage, note }, ctx) {
    if (!STAGES.includes(stage)) return { error: "Invalid stage." };
    const c = await courseBySlug(course_slug);
    if (!c) return { error: "Course not found among upcoming courses." };
    await db.query(
      `insert into leads (contact_id, course_id, stage, notes) values ($1,$2,$3,$4)
       on conflict (contact_id, course_id) do update set stage = excluded.stage,
         notes = coalesce(excluded.notes, leads.notes), updated_at = now()`,
      [ctx.contactId, c.id, stage, note ?? null],
    );
    await db.query(
      "update conversations set stage = $2, sentiment = case when $2 = 'ready_to_close' then 'hot_lead' else sentiment end where id = $1",
      [ctx.conversationId, stage],
    );
    return { ok: true };
  },

  async set_sentiment({ value }, ctx) {
    if (!SENTIMENTS.includes(value)) return { error: "Invalid sentiment." };
    // One off-topic joke must not discredit a customer who already asked about price or enrollment.
    const spamOk = "stage in ('new', 'interested')";
    await db.query(`update conversations set sentiment = $2 where id = $1 and ($2 <> 'spam' or ${spamOk})`, [ctx.conversationId, value]);
    return { ok: true };
  },

  async handoff_to_human({ reason }, ctx) {
    await db.query(
      "update conversations set ai_paused = true, paused_by = 'ai', summary = coalesce(summary || chr(10), '') || $2 where id = $1",
      [ctx.conversationId, `[Handoff] ${String(reason).slice(0, 500)}`],
    );
    return { ok: true, note: "A human coordinator will continue. Tell the user so." };
  },
};

export async function runTool(name: string, args: Record<string, unknown>, ctx: ToolContext) {
  const handler = handlers[name];
  if (!handler) return { error: `Unknown tool ${name}` };
  try {
    return await handler(args ?? {}, ctx);
  } catch (e) {
    console.error(`tool ${name} failed`, e);
    return { error: "Tool failed. Do not guess; escalate with handoff_to_human if needed." };
  }
}
