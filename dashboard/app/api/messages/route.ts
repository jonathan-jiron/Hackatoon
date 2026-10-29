import { NextRequest, NextResponse } from "next/server";
import { getMessages } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("conversation_id");
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "bad_id" }, { status: 400 });
  try {
    return NextResponse.json(await getMessages(id));
  } catch (e) {
    return NextResponse.json({ error: "db_error", message: (e as Error).message }, { status: 500 });
  }
}
