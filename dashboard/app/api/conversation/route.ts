import { NextRequest, NextResponse } from "next/server";
import { db, hasDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Body =
  | { action: "takeover" | "resume"; conversation_id: string }
  | { action: "send"; conversation_id: string; text: string };

const UUID = /^[0-9a-f-]{36}$/i;

export async function POST(req: NextRequest) {
  if (!hasDatabase) return new NextResponse("Database is not configured", { status: 503 });

  const body = (await req.json()) as Body;
  const id = body.conversation_id;
  if (!id || !UUID.test(id)) return new NextResponse("Bad conversation_id", { status: 400 });

  const pool = db();

  if (body.action === "takeover") {
    await pool.query("update conversations set ai_paused = true, paused_by = 'operator' where id = $1", [id]);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "resume") {
    await pool.query("update conversations set ai_paused = false, paused_by = null where id = $1", [id]);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "send") {
    const text = body.text?.trim();
    if (!text) return new NextResponse("Empty message", { status: 400 });

    // Pause first so the AI stays silent even if delivery is slow.
    await pool.query("update conversations set ai_paused = true, paused_by = 'operator' where id = $1", [id]);

    const { rows } = await pool.query(
      `select ct.channel, ct.channel_user_id
       from conversations c join contacts ct on ct.id = c.contact_id where c.id = $1`,
      [id]
    );
    if (!rows[0]) return new NextResponse("Conversation not found", { status: 404 });

    // n8n only delivers the text through the channel adapter (Telegram Bot API).
    // The dashboard is the one that stores the operator message.
    const hook = process.env.N8N_SEND_WEBHOOK_URL;
    if (hook) {
      try {
        const r = await fetch(hook, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-operator-key": process.env.N8N_SEND_WEBHOOK_KEY ?? "" },
          body: JSON.stringify({
            conversation_id: id,
            channel: rows[0].channel,
            channel_user_id: rows[0].channel_user_id,
            text,
          }),
        });
        if (!r.ok) return new NextResponse("n8n webhook failed", { status: 502 });
      } catch {
        return new NextResponse("n8n webhook unreachable", { status: 502 });
      }
    }

    await pool.query("insert into messages (conversation_id, role, content) values ($1, 'operator', $2)", [id, text]);
    await pool.query("update conversations set last_message_at = now() where id = $1", [id]);
    return NextResponse.json({ ok: true, delivered: Boolean(hook) });
  }

  return new NextResponse("Unknown action", { status: 400 });
}
