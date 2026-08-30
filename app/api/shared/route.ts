import { NextResponse } from "next/server";
import { readDb } from "@/lib/storage";
import { buildBoard } from "@/lib/board";

export const dynamic = "force-dynamic";

// Anni's endpoint: shared items and the balance ONLY — never the full feed.
// Hosted build: this route is gated to her Clerk identity; /api/board to Argo's.
export async function GET() {
  const db = await readDb();
  const board = buildBoard(db);
  return NextResponse.json({
    balance: board.balance,
    sharedItems: board.sharedItems,
    settlements: board.settlements,
  });
}
