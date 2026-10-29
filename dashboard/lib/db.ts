import { Pool } from "pg";

// One pool per server process. The global cache survives Next.js hot reloads in dev.
const g = globalThis as unknown as { __pool?: Pool };

export const hasDatabase = Boolean(process.env.DATABASE_URL);

export function db(): Pool {
  if (!process.env.DATABASE_URL) throw new Error("no_db");
  if (!g.__pool) g.__pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
  return g.__pool;
}
