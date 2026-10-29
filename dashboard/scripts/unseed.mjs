// Removes only the rows created by seed.mjs (contacts tagged demo-*; cascades to chats and leads).
import pg from "pg";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const r = await client.query("delete from contacts where channel_user_id like 'demo-%'");
console.log(`Removed ${r.rowCount} demo contacts and their chats.`);
await client.end();
