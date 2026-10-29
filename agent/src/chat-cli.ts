import { createInterface } from "node:readline/promises";
import { db } from "./db.ts";
import { handleMessage } from "./pipeline.ts";

// Local console chat: same pipeline Telegram uses, no channel needed.
const rl = createInterface({ input: process.stdin, output: process.stdout });
for (;;) {
  const text = await rl.question("tú> ");
  if (!text) break;
  const out = await handleMessage({ channel: "telegram", channelUserId: "cli-user", name: "CLI", text });
  console.log(out.paused ? "[IA en pausa]" : `bot> ${out.reply}`);
}
rl.close();
await db.end();
