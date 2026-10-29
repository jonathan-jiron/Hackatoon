import { NextResponse } from "next/server";
import { hasDatabase } from "@/lib/db";
import { getSnapshot } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!hasDatabase) return NextResponse.json({ error: "no_db" }, { status: 503 });
  try {
    return NextResponse.json(await getSnapshot());
  } catch (e) {
    return NextResponse.json({ error: "db_error", message: (e as Error).message }, { status: 500 });
  }
}
