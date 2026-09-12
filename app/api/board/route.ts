import { NextResponse } from "next/server";
import { getAccounts, readDb } from "@/lib/storage";
import { buildBoard } from "@/lib/board";
import { currentRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  if ((await currentRole()) !== "owner") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const [db, { accounts }] = await Promise.all([readDb(), getAccounts()]);
  return NextResponse.json(buildBoard(db, new Date(), accounts));
}
