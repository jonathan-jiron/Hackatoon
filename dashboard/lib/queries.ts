import { db } from "./db";
import { Conversation, Course, Lead, Message } from "./types";

export interface Snapshot {
  conversations: Conversation[];
  leads: Lead[];
  courses: Course[];
}

/** Cheap fingerprint of everything the dashboard shows. The stream only sends data when it changes. */
export async function getSignature(): Promise<string> {
  const { rows } = await db().query(`
    select
      (select coalesce(max(created_at)::text, '') || count(*)::text from messages) as m,
      (select coalesce(md5(string_agg(
          c.id::text || coalesce(c.sentiment, '') || c.ai_paused::text || c.stage || c.status ||
          coalesce(c.summary, '') || coalesce(c.paused_by, '') || c.last_message_at::text, ',' order by c.id)), '') from conversations c) as c,
      (select coalesce(md5(string_agg(ct.id::text || coalesce(ct.name, ''), ',' order by ct.id)), '') from contacts ct) as ct,
      (select coalesce(md5(string_agg(l.id::text || l.stage || l.score::text || l.updated_at::text, ',' order by l.id)), '') from leads l) as l,
      (select coalesce(max(scraped_at)::text, '') || count(*)::text from courses) as k
  `);
  return Object.values(rows[0]).join("|");
}

export async function getSnapshot(): Promise<Snapshot> {
  const pool = db();
  const [conv, leads, courses] = await Promise.all([
    pool.query(`
      select c.id, c.contact_id, c.status, c.stage,
             coalesce(c.sentiment, 'interested') as sentiment,
             c.ai_paused, c.paused_by, c.summary, c.last_message_at,
             (select min(m.created_at) from messages m where m.conversation_id = c.id) as first_message_at,
             json_build_object('id', ct.id, 'channel', ct.channel, 'channel_user_id', ct.channel_user_id,
                               'name', ct.name, 'audience_type', ct.audience_type) as contact,
             lm.content as lm_content, lm.role as lm_role
      from conversations c
      join contacts ct on ct.id = c.contact_id
      left join lateral (
        select content, role from messages m where m.conversation_id = c.id order by m.created_at desc limit 1
      ) lm on true
      order by c.last_message_at desc
    `),
    pool.query(`
      select l.id, l.contact_id, l.course_id, l.stage, l.score, l.notes, l.updated_at,
             ct.name as contact_name, co.title as course_title,
             (select c.id from conversations c where c.contact_id = l.contact_id
               order by c.last_message_at desc limit 1) as conversation_id
      from leads l
      join contacts ct on ct.id = l.contact_id
      join courses co on co.id = l.course_id
      order by l.updated_at desc
    `),
    pool.query(`
      select id, slug, title, start_date, modality, scraped_at,
             price_uta_student::float8 as price_uta_student,
             price_uta_grad_staff::float8 as price_uta_grad_staff,
             price_public::float8 as price_public
      from courses
      order by start_date nulls last, title
    `),
  ]);

  return {
    conversations: conv.rows.map(({ lm_content, lm_role, ...c }) => ({
      ...c,
      last_message: lm_content ? { content: lm_content, role: lm_role } : null,
    })),
    leads: leads.rows,
    courses: courses.rows,
  };
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  const { rows } = await db().query(
    `select id, conversation_id, role, content, media_type, created_at
     from messages where conversation_id = $1 order by created_at asc`,
    [conversationId]
  );
  return rows;
}
