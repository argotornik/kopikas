import { NextResponse } from "next/server";
import { newId, readDb, writeCollection } from "@/lib/storage";
import { inferCadence } from "@/lib/engine";

export const dynamic = "force-dynamic";

type Action =
  | { type: "rule"; match: string; category: string }
  | { type: "override"; txId: string; category: string }
  | { type: "share"; txId: string }
  | { type: "unshare"; shareId: string }
  | { type: "quickadd"; description: string; amount: number; date: string }
  | { type: "settle"; amount: number; date: string; txId?: string; note?: string }
  | { type: "subscribe"; txId: string }
  | { type: "unsubscribe"; subId: string }
  | { type: "snapshot"; total: number; holdings: { name: string; pct: number }[] };

export async function POST(req: Request) {
  const action = (await req.json()) as Action;
  const db = await readDb();
  const now = new Date().toISOString();

  switch (action.type) {
    case "rule": {
      const match = action.match.trim().toLowerCase();
      if (!match || !action.category) return bad("match and category required");
      if (!db.rules.some((r) => r.match === match && r.category === action.category)) {
        db.rules.push({ id: newId("rule"), match, category: action.category, createdAt: now });
        await writeCollection("rules", db.rules);
      }
      break;
    }
    case "override": {
      db.overrides = db.overrides.filter((o) => o.txId !== action.txId);
      db.overrides.push({ txId: action.txId, category: action.category });
      await writeCollection("overrides", db.overrides);
      break;
    }
    case "share": {
      if (!db.transactions.some((t) => t.id === action.txId)) return bad("unknown tx");
      if (!db.shares.some((s) => s.txId === action.txId)) {
        db.shares.push({ id: newId("share"), paidBy: "argo", txId: action.txId, createdAt: now });
        await writeCollection("shares", db.shares);
      }
      break;
    }
    case "unshare": {
      db.shares = db.shares.filter((s) => s.id !== action.shareId);
      await writeCollection("shares", db.shares);
      break;
    }
    case "quickadd": {
      const amount = Number(action.amount);
      if (!action.description?.trim() || !(amount > 0)) return bad("description and positive amount required");
      db.shares.push({
        id: newId("share"),
        paidBy: "anni",
        manual: { date: action.date, description: action.description.trim(), amount },
        createdAt: now,
      });
      await writeCollection("shares", db.shares);
      break;
    }
    case "settle": {
      // Sign is direction: positive = Anni paid Argo, negative = Argo paid Anni.
      const amount = Number(action.amount);
      if (!Number.isFinite(amount) || amount === 0) return bad("non-zero amount required");
      db.settlements.push({
        id: newId("stl"),
        amount,
        date: action.date,
        txId: action.txId,
        note: action.note,
      });
      await writeCollection("settlements", db.settlements);
      break;
    }
    case "subscribe": {
      const tx = db.transactions.find((t) => t.id === action.txId);
      if (!tx) return bad("unknown tx");
      const match = tx.counterparty.trim().toLowerCase();
      if (!db.subscriptions.some((s) => s.match === match && s.active)) {
        db.subscriptions.push({
          id: newId("sub"),
          name: tx.counterparty,
          match,
          expectedAmount: Math.abs(tx.amount),
          cadence: inferCadence(db.transactions, match),
          active: true,
          createdAt: now,
        });
        await writeCollection("subscriptions", db.subscriptions);
      }
      if (!db.rules.some((r) => r.match === match)) {
        db.rules.push({ id: newId("rule"), match, category: "Subscriptions", createdAt: now });
        await writeCollection("rules", db.rules);
      }
      break;
    }
    case "unsubscribe": {
      const sub = db.subscriptions.find((s) => s.id === action.subId);
      if (sub) {
        sub.active = false;
        await writeCollection("subscriptions", db.subscriptions);
      }
      break;
    }
    case "snapshot": {
      const total = Number(action.total);
      if (!(total >= 0)) return bad("total required");
      const holdings = (action.holdings ?? []).filter((h) => h.name?.trim() && h.pct > 0);
      db.snapshots.push({ id: newId("snap"), total, holdings, at: now });
      await writeCollection("snapshots", db.snapshots);
      break;
    }
    default:
      return bad("unknown action");
  }

  return NextResponse.json({ ok: true });
}

function bad(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}
