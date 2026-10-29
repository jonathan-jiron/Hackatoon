// Simulates live traffic: a customer writes, and the bot answers unless the chat is paused.
// Use it to show real-time updates before the Telegram bot exists. Stop with Ctrl+C.
import pg from "pg";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const userLines = ["y el certificado es oficial?", "hay descuento para graduados?", "cuando empieza exactamente", "puedo pagar por transferencia?", "es presencial o virtual"];
const botLines = ["Sí, el certificado lo emite el CTT FISEI. Te cuento los detalles.", "El precio depende de tu perfil. ¿Eres graduado de la UTA?", "Esa fecha se confirma con coordinación, ya les aviso.", "Te explico los pasos para inscribirte, son muy cortos."];
const sentiments = ["interested", "doubtful", "frustrated", "hot_lead"];

const add = (id, role, content) =>
  client.query("insert into messages (conversation_id, role, content) values ($1, $2, $3)", [id, role, content]).then(() =>
    client.query("update conversations set last_message_at = now() where id = $1", [id])
  );

let n = 0;
console.log("Simulating traffic every 6 seconds. Ctrl+C to stop.");
setInterval(async () => {
  const { rows } = await client.query(
    `select c.id, c.ai_paused from conversations c join contacts ct on ct.id = c.contact_id
     where ct.channel_user_id like 'demo-%'`
  );
  if (!rows.length) return console.log("No demo chats. Run `npm run seed` first.");
  const c = rows[Math.floor(Math.random() * rows.length)];
  n += 1;
  await add(c.id, "user", userLines[n % userLines.length]);
  if (!c.ai_paused) setTimeout(() => add(c.id, "assistant", botLines[n % botLines.length]), 2000);
  if (n % 4 === 0) {
    await client.query("update conversations set sentiment = $2 where id = $1", [c.id, sentiments[n % sentiments.length]]);
  }
}, 6000);
