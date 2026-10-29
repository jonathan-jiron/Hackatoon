import { createServer } from "node:http";
import { handleMessage, type Incoming } from "./pipeline.ts";

const KEY = process.env.AGENT_API_KEY;
if (!KEY) throw new Error("Missing env var AGENT_API_KEY");

createServer(async (req, res) => {
  const send = (status: number, body: unknown) => {
    res.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(body));
  };
  if (req.method === "GET" && req.url === "/health") return send(200, { ok: true });
  if (req.method !== "POST" || req.url !== "/message") return send(404, { error: "not found" });
  if (req.headers["x-agent-key"] !== KEY) return send(401, { error: "unauthorized" });
  try {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const msg = JSON.parse(raw) as Incoming;
    if (!msg.channel || !msg.channelUserId || typeof msg.text !== "string") return send(400, { error: "invalid body" });
    send(200, await handleMessage(msg));
  } catch (e) {
    console.error(e);
    send(500, { error: "internal error" });
  }
}).listen(Number(process.env.AGENT_PORT ?? 3001), () => console.log("agent listening"));
