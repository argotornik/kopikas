import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Vercel Cron target (vercel.json: daily 05:00 UTC) and the "sync now" button's
// endpoint. The LHV sync lands here on the personal machine: refresh token ->
// access token -> GET /accounts + statements since last sync -> dedupe ->
// storage. Until then it reports itself honestly.
//
// Hosted hardening (checklist): require the CRON_SECRET bearer header Vercel
// sends when the env var is set, so strangers can't trigger syncs.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse(null, { status: 401 });
  }
  return NextResponse.json(
    { ok: false, error: "LHV sync not configured yet — see expense-board-plan.md build order" },
    { status: 501 }
  );
}
