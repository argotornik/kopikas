import { NextResponse } from "next/server";
import { readDb } from "@/lib/storage";
import { buildBoard } from "@/lib/board";
import { currentRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  if ((await currentRole()) !== "argo") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const db = await readDb();
  return NextResponse.json(buildBoard(db));
}
