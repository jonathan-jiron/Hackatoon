import { hasDatabase } from "@/lib/db";
import { getSignature, getSnapshot } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const POLL_MS = 1500;

/**
 * Server-Sent Events: the server pushes a full snapshot only when the database changed.
 * The browser sends actions back through POST /api/conversation, so the channel is bidirectional.
 */
export async function GET(req: Request) {
  if (!hasDatabase) return new Response("no_db", { status: 503 });

  const enc = new TextEncoder();
  let closed = false;
  let timer: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (!closed) controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      let last = "";
      let busy = false;

      const tick = async () => {
        if (busy || closed) return;
        busy = true;
        try {
          const sig = await getSignature();
          if (sig !== last) {
            last = sig;
            send("snapshot", await getSnapshot());
          } else if (!closed) {
            controller.enqueue(enc.encode(": ping\n\n"));
          }
        } catch (e) {
          send("problem", { message: (e as Error).message });
        } finally {
          busy = false;
        }
      };

      const close = () => {
        if (closed) return;
        closed = true;
        if (timer) clearInterval(timer);
        try {
          controller.close();
        } catch {}
      };
      req.signal.addEventListener("abort", close);

      await tick();
      timer = setInterval(tick, POLL_MS);
    },
    cancel() {
      closed = true;
      if (timer) clearInterval(timer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
