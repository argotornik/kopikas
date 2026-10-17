import { NextResponse } from "next/server";
import { readDb } from "@/lib/storage";
import { sharedView } from "@/lib/shared-view";
import { currentRole, refusalStatus } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Pooleks data for both of them: the balance, every shared item, every
// settlement — never the full feed.
export async function GET() {
  const role = await currentRole();
  if (!role) return NextResponse.json({ error: "forbidden" }, { status: await refusalStatus() });
  return NextResponse.json(sharedView(await readDb(), role));
}
