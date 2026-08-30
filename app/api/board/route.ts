import { NextResponse } from "next/server";
import { readDb } from "@/lib/storage";
import { buildBoard } from "@/lib/board";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = await readDb();
  return NextResponse.json(buildBoard(db));
}
