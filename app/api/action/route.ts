import { NextResponse } from "next/server";
import { getAccounts, readDb, saveLhvTokens, writeCollection } from "@/lib/storage";
import { buildBoard, packBoard } from "@/lib/board";
import { sharedView } from "@/lib/shared-view";
import { currentRole, refusalStatus } from "@/lib/auth";
import { checkRefreshToken } from "@/lib/lhv";
import { applyAction, type Action } from "@/lib/apply";
import { DEMO } from "@/lib/demo-flag";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // The demo makes its changes in each visitor's browser; its server keeps nothing.
  if (DEMO) return NextResponse.json({ ok: false, error: "The demo keeps its changes in your browser." }, { status: 403 });
  const action = (await req.json()) as Action;

  // The owner: everything. The partner: adding what they paid and recording,
  // removing or putting back a repayment — the moves on the shared tab that
  // are theirs. Anyone else: nothing.
  const role = await currentRole();
  const partnerMove =
    action.type === "quickadd" ||
    action.type === "settle" ||
    action.type === "unsettle" ||
    (action.type === "restore" && action.collection === "settlements");
  if (role !== "owner" && !(role === "partner" && partnerMove)) {
    return NextResponse.json(
      { ok: false, error: "This account can't make that change." },
      { status: await refusalStatus() }
    );
  }

  // A removal answers with the action that reverses it, so the client's Undo
  // needs no knowledge of how each thing is put back.
  let undo: Action | undefined;

  if (action.type === "set-lhv-token") {
    // Tried against LHV before it replaces anything: a token LHV refuses
    // never overwrites one that works. The grant rotates the token, so
    // what gets stored is the one LHV handed back.
    const token = action.refreshToken?.trim();
    if (!token) return bad("Paste the refresh token first.");
    const check = await checkRefreshToken(token);
    if (!check.ok) {
      return NextResponse.json(
        { ok: false, error: check.message, reason: check.reason, detail: check.detail },
        { status: check.reason === "refused" ? 400 : 502 }
      );
    }
    await saveLhvTokens(check.refreshToken);
  } else {
    // The change is made in memory (lib/apply.ts, which the demo runs too), then what it changed is written.
    const db = await readDb();
    const result = applyAction(db, action, role === "partner" ? "partner" : "owner", new Date().toISOString());
    if (!result.ok) return bad(result.error);
    for (const collection of result.changed) await writeCollection(db, collection);
    undo = result.undo;
  }

  // The page that sent the change can ask for its view back in the same
  // reply (?view=board or ?view=shared), so a change costs one round trip
  // from the browser instead of two. Read fresh: the store normalises on read.
  const view = new URL(req.url).searchParams.get("view");
  let fresh: { board?: unknown; shared?: unknown } = {};
  if (view === "board" && role === "owner") {
    const [after, { accounts }] = await Promise.all([readDb(), getAccounts()]);
    fresh = { board: packBoard(buildBoard(after, new Date(), accounts)) };
  } else if (view === "shared" && role) {
    fresh = { shared: sharedView(await readDb(), role) };
  }
  return NextResponse.json({ ok: true, ...(undo ? { undo } : {}), ...fresh });
}

function bad(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}
