import { NextResponse } from "next/server";
import { newId, readDb, saveLhvTokens, writeCollection } from "@/lib/storage";
import { anniShareOf, inferCadence, subscriptionStatus } from "@/lib/engine";
import { merchantFromDescription } from "@/lib/lhv";
import { currentRole } from "@/lib/auth";
import { stripPeriod } from "@/lib/utils";

// Rules and subscription patterns must never contain a raw card string —
// "( ..3696) 2026-08-18 16:14 GR. TK. VIIMSI\..." has a timestamp in it and
// matches exactly one transaction ever. Extract the merchant part if present.
// Bank fees carry the billing period in the name itself ("Kaardi kuutasu
// 07-2026") — same disease, so trailing month/date stamps come off too.
function cleanPattern(raw: string): string {
  return stripPeriod((merchantFromDescription(raw) ?? raw).trim().toLowerCase());
}

export const dynamic = "force-dynamic";

type Action =
  | { type: "rule"; match: string; category: string }
  | { type: "override"; txId: string; category: string }
  | { type: "unrule"; ruleId: string }
  | { type: "share"; txId: string; anniShare?: number }
  | { type: "unshare"; shareId: string }
  | { type: "quickadd"; description: string; amount: number; date: string; anniShare?: number }
  | { type: "settle"; amount: number; date: string; txId?: string; note?: string }
  | { type: "subscribe"; txId: string }
  | { type: "unsubscribe"; subId: string }
  | { type: "accept-price"; subId: string }
  | { type: "snapshot"; total: number; holdings: { name: string; pct: number }[]; returnPct?: number }
  | { type: "set-lhv-token"; refreshToken: string };

export async function POST(req: Request) {
  const action = (await req.json()) as Action;

  // Argo: everything. Anni: quick-add only. Anyone else: nothing.
  const role = await currentRole();
  if (role !== "argo" && !(role === "anni" && action.type === "quickadd")) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const db = await readDb();
  const now = new Date().toISOString();

  switch (action.type) {
    case "rule": {
      const match = cleanPattern(action.match ?? "");
      if (!match || !action.category) return bad("match and category required");
      if (!db.rules.some((r) => r.match === match && r.category === action.category)) {
        db.rules.push({ id: newId("rule"), match, category: action.category, createdAt: now });
        await writeCollection("rules", db.rules);
      }
      break;
    }
    case "unrule": {
      // Forgetting a rule un-files everything it decided; overrides and
      // other rules still apply.
      if (!db.rules.some((r) => r.id === action.ruleId)) return bad("unknown rule");
      db.rules = db.rules.filter((r) => r.id !== action.ruleId);
      await writeCollection("rules", db.rules);
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
      const fraction = Number(action.anniShare ?? 0.5);
      if (!(fraction > 0 && fraction < 1)) return bad("anniShare must be between 0 and 1");
      const existing = db.shares.find((s) => s.txId === action.txId);
      if (!existing) {
        db.shares.push({
          id: newId("share"),
          paidBy: "argo",
          txId: action.txId,
          anniShare: fraction,
          createdAt: now,
        });
        await writeCollection("shares", db.shares);
      } else if (anniShareOf(existing) !== fraction) {
        // Re-dropping with a different toggle just changes the split.
        existing.anniShare = fraction;
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
      const fraction = Number(action.anniShare ?? 0.5);
      if (!(fraction > 0 && fraction < 1)) return bad("anniShare must be between 0 and 1");
      db.shares.push({
        id: newId("share"),
        // Whoever is adding paid for it — Anni's card, Argo's cash.
        paidBy: role === "anni" ? "anni" : "argo",
        manual: { date: action.date, description: action.description.trim(), amount },
        anniShare: fraction,
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
      const cleanName = stripPeriod(merchantFromDescription(tx.counterparty) ?? tx.counterparty);
      const match = cleanPattern(tx.counterparty);
      // Aggregators bill many subscriptions under one merchant string —
      // amount-match those so each stays a distinct record.
      const isAggregator = ["apple.com/bill", "google play"].some((a) => match.includes(a));
      const txAmount = Math.abs(tx.amount);
      const duplicate = db.subscriptions.some(
        (s) =>
          s.active &&
          s.match === match &&
          (!s.matchAmount || Math.abs(s.expectedAmount - txAmount) <= 0.01)
      );
      if (!duplicate) {
        db.subscriptions.push({
          id: newId("sub"),
          name: cleanName,
          matchAmount: isAggregator,
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
    case "accept-price": {
      // The last matched charge becomes the expected price — the badge's
      // "10,99 € → 8,00 €" stops nagging once the new price is blessed.
      const sub = db.subscriptions.find((s) => s.id === action.subId);
      if (!sub) return bad("unknown subscription");
      const status = subscriptionStatus(sub, db.transactions, new Date());
      if (!status.lastCharge) return bad("no charge to accept");
      sub.expectedAmount = status.lastCharge.amount;
      await writeCollection("subscriptions", db.subscriptions);
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
      const returnPct = Number.isFinite(Number(action.returnPct)) ? Number(action.returnPct) : undefined;
      db.snapshots.push({ id: newId("snap"), total, holdings, returnPct, at: now });
      await writeCollection("snapshots", db.snapshots);
      break;
    }
    case "set-lhv-token": {
      const token = action.refreshToken?.trim();
      if (!token) return bad("refresh token required");
      await saveLhvTokens(token);
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
