import { NextResponse } from "next/server";
import { getAccounts, readDb } from "@/lib/storage";
import { buildBoard, packBoard } from "@/lib/board";
import { currentRole, refusalStatus } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  if ((await currentRole()) !== "owner") {
    return NextResponse.json({ error: "forbidden" }, { status: await refusalStatus() });
  }
  const [db, { accounts }] = await Promise.all([readDb(), getAccounts()]);
  return NextResponse.json(packBoard(buildBoard(db, new Date(), accounts)));
}
