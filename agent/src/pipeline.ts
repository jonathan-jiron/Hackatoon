import { readFileSync } from "node:fs";
import { db } from "./db.ts";
import { generate, type Content } from "./gemini.ts";
import { route, type Button } from "./router.ts";
import { runTool, toolDeclarations, type ToolContext } from "./tools.ts";

const SYSTEM = readFileSync(new URL("../prompts/system.md", import.meta.url), "utf8");
const HISTORY_LIMIT = 10;
const SUMMARY_EVERY = 10;
const MAX_TOOL_ROUNDS = 6;
const FALLBACK = "Disculpa, tengo un inconveniente técnico momentáneo. ¿Puedes escribirme de nuevo en unos minutos? Si es urgente, escribe a talleresfisei@uta.edu.ec.";

/** Telegram gets plain text; the model sometimes ignores the prompt and emits Markdown. */
export const plainText = (s: string) =>
  s.replace(/\*\*(.+?)\*\*/gs, "$1").replace(/__(.+?)__/gs, "$1").replace(/^#{1,6}\s+/gm, "").replace(/`([^`]+)`/g, "$1").trim();

export interface Incoming {
  channel: "telegram" | "whatsapp";
  channelUserId: string;
  name?: string;
  /** Free text typed by the user. */
  text?: string;
  /** Callback data of a pressed button (e.g. "menu:courses", "course:curso20"). */
  action?: string;
  mediaType?: "text" | "audio";
}
export interface Outgoing {
  reply: string | null;
  buttons?: Button[][];
  paused: boolean;
  conversationId: string;
}

async function loadConversation(msg: Incoming) {
  const contact = (
    await db.query(
      `insert into contacts (channel, channel_user_id, name) values ($1,$2,$3)
       on conflict (channel, channel_user_id) do update set channel_user_id = excluded.channel_user_id
       returning *`,
      [msg.channel, msg.channelUserId, msg.name ?? null],
    )
  ).rows[0];
  let conv = (await db.query("select * from conversations where contact_id = $1 and status = 'open' order by last_message_at desc limit 1", [contact.id])).rows[0];
  conv ??= (await db.query("insert into conversations (contact_id) values ($1) returning *", [contact.id])).rows[0];
  return { contact, conv };
}

const save = (conversationId: string, role: string, content: string, mediaType = "text", toolCalls?: unknown) =>
  db.query("insert into messages (conversation_id, role, content, media_type, tool_calls) values ($1,$2,$3,$4,$5)", [
    conversationId, role, content, mediaType, toolCalls ? JSON.stringify(toolCalls) : null,
  ]);

async function history(conversationId: string): Promise<Content[]> {
  const { rows } = await db.query(
    "select role, content from (select * from messages where conversation_id = $1 order by created_at desc limit $2) m order by created_at",
    [conversationId, HISTORY_LIMIT],
  );
  const out: Content[] = [];
  for (const r of rows) {
    const role = r.role === "user" ? "user" : "model";
    // Gemini wants alternating turns: merge consecutive same-role messages.
    if (out.at(-1)?.role === role) out.at(-1)!.parts.push({ text: r.content });
    else out.push({ role, parts: [{ text: r.content }] });
  }
  return out;
}

function stateBlock(contact: any, conv: any) {
  return [
    `Today: ${new Date().toISOString().slice(0, 10)}`,
    `Contact: name=${contact.name ?? "unknown"}, audience=${contact.audience_type ?? "unknown"}, consent=${contact.consent_at ? "given" : "NOT given yet"}`,
    `Conversation stage: ${conv.stage}`,
    conv.summary ? `Summary so far:\n${conv.summary}` : "",
  ].filter(Boolean).join("\n");
}

async function focusBlock(conv: any) {
  if (!conv.focus_course_id) return "";
  const { rows } = await db.query("select slug, title, start_date, hours, modality from open_courses where id = $1", [conv.focus_course_id]);
  const c = rows[0];
  return c ? `Focus course (the user picked it; answer about it by default, use get_course for price and details): slug=${c.slug}, title=${c.title}` : "";
}

async function refreshSummary(conv: any) {
  const { rows } = await db.query("select count(*)::int n from messages where conversation_id = $1", [conv.id]);
  if (rows[0].n % SUMMARY_EVERY !== 0) return;
  const recent = await history(conv.id);
  const transcript = recent.map((c) => `${c.role}: ${c.parts.map((p) => p.text).join(" ")}`).join("\n");
  const out = await generate({
    system: "Summarize this sales chat for a human operator in Spanish, max 6 lines: interests, audience, objections, stage, next step. Keep any line starting with [Handoff].",
    contents: [{ role: "user", parts: [{ text: `Previous summary:\n${conv.summary ?? "(none)"}\n\nRecent messages:\n${transcript}` }] }],
  });
  await db.query("update conversations set summary = $2 where id = $1", [conv.id, out.parts.map((p) => p.text ?? "").join("").trim()]);
}

export async function handleMessage(msg: Incoming): Promise<Outgoing> {
  const { contact, conv } = await loadConversation(msg);
  await save(conv.id, "user", msg.text ?? `[botón] ${msg.action}`, msg.mediaType);
  await db.query("update conversations set last_message_at = now() where id = $1", [conv.id]);

  // Handover: while an operator (or the AI itself) paused the chat, nothing runs.
  if (conv.ai_paused) return { reply: null, paused: true, conversationId: conv.id };

  // Menu, consent and course picking are answered without the model.
  const routed = await route({ contact, conv, text: msg.text, action: msg.action });
  if (routed) {
    await save(conv.id, "assistant", routed.text);
    await db.query("update conversations set last_message_at = now() where id = $1", [conv.id]);
    const paused = (await db.query("select ai_paused from conversations where id = $1", [conv.id])).rows[0].ai_paused;
    return { reply: routed.text, buttons: routed.buttons, paused, conversationId: conv.id };
  }
  // The router may have just set the focus course.
  conv.focus_course_id = (await db.query("select focus_course_id from conversations where id = $1", [conv.id])).rows[0].focus_course_id;

  const ctx: ToolContext = { contactId: contact.id, conversationId: conv.id };
  const toolLog: unknown[] = [];
  let reply = FALLBACK;
  try {
    const contents = await history(conv.id);
    const system = `${SYSTEM}\n\n# Current state\n${stateBlock(contact, conv)}\n${await focusBlock(conv)}`;
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const turn = await generate({ system, contents, tools: toolDeclarations });
      const calls = turn.parts.filter((p) => p.functionCall);
      if (!calls.length) {
        reply = plainText(turn.parts.map((p) => p.text ?? "").join("")) || FALLBACK;
        break;
      }
      contents.push(turn);
      const responses = [];
      for (const { functionCall } of calls) {
        const result = await runTool(functionCall!.name, functionCall!.args, ctx);
        toolLog.push({ name: functionCall!.name, args: functionCall!.args, result });
        responses.push({ functionResponse: { name: functionCall!.name, response: { result } } });
      }
      contents.push({ role: "user", parts: responses });
    }
  } catch (e) {
    // Do not pause the chat: an LLM outage is not a reason to lock the user out of the bot.
    console.error("pipeline failed", e);
  }

  // The model registers the interest; the contact button is added here so it never depends on the model's wording.
  const readyToClose = toolLog.some((t: any) => t.name === "update_lead_stage" && t.args?.stage === "ready_to_close" && t.result?.ok);
  const buttons: Button[][] | undefined = readyToClose ? [[{ label: "👩‍🏫 Contactar con el docente", data: "contact:human" }]] : undefined;

  await save(conv.id, "assistant", reply, "text", toolLog.length ? toolLog : undefined);
  await db.query("update conversations set last_message_at = now() where id = $1", [conv.id]);
  const paused = (await db.query("select ai_paused from conversations where id = $1", [conv.id])).rows[0].ai_paused;
  refreshSummary(conv).catch((e) => console.error("summary failed", e));
  return { reply, buttons, paused, conversationId: conv.id };
}
