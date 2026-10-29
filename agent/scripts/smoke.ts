import { db } from "../src/db.ts";
import { handleMessage } from "../src/pipeline.ts";

// Manual end-to-end smoke test against the real model and DB; seed of the phase 7 eval set.
// Arguments are the messages to send; prefix with "@" to simulate a button press (e.g. "@menu:courses").
const user = `smoke-${Date.now()}`;
const script = process.argv.slice(2);

for (const text of script) {
  const input = text.startsWith("@") ? { action: text.slice(1) } : { text };
  const out = await handleMessage({ channel: "telegram", channelUserId: user, name: "Smoke", ...input });
  const buttons = out.buttons ? `\n     [${out.buttons.flat().map((b) => b.label).join(" | ")}]` : "";
  console.log(`\ntú> ${text}\nbot> ${out.reply ?? "[sin respuesta: IA en pausa]"}${buttons}${out.paused ? "  (IA pausada)" : ""}`);
}
const { rows } = await db.query(
  `select c.stage, c.sentiment, c.ai_paused, ct.audience_type, ct.consent_at is not null as consent, c.focus_course_id is not null as focus
   from conversations c join contacts ct on ct.id = c.contact_id where ct.channel_user_id = $1`, [user]);
console.log("\nstate:", rows[0]);
await db.end();
