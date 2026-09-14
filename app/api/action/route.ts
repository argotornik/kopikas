import { NextResponse } from "next/server";
import type { Db, Merchant } from "@/lib/types";
import { newId, readDb, saveLhvTokens, writeCollection } from "@/lib/storage";
import {
  FIXED_CATEGORIES,
  SUBSCRIPTIONS,
  matches,
  partnerShareOf,
  inferCadence,
  subscriptionCharges,
  subscriptionStatus,
} from "@/lib/engine";
import { currentRole } from "@/lib/auth";
import { merchantOf, rulePattern } from "@/lib/icons";

export const dynamic = "force-dynamic";

type Action =
  | { type: "rule"; txId: string; category: string }
  | { type: "override"; txId: string; category: string }
  | { type: "unrule"; ruleId: string }
  | { type: "share"; txId: string; partnerShare?: number }
  | { type: "unshare"; shareId: string }
  | { type: "quickadd"; description: string; amount: number; date: string; partnerShare?: number; category?: string }
  | { type: "settle"; amount: number; date: string; txId?: string; note?: string }
  | { type: "subscribe"; txId: string }
  | { type: "unsubscribe"; subId: string }
  | { type: "accept-price"; subId: string }
  | { type: "cadence"; subId: string; cadence: "monthly" | "yearly" }
  | { type: "snapshot"; total: number; holdings: { name: string; pct: number }[]; returnPct?: number; source?: string }
  | { type: "category-add"; name: string }
  | { type: "category-rename"; from: string; to: string }
  | { type: "category-order"; order: string[] }
  | { type: "merchant"; txId?: string; subId?: string; name: string; domain?: string; emoji?: string }
  | { type: "merchant-reset"; txId?: string; subId?: string }
  | { type: "set-lhv-token"; refreshToken: string };

export async function POST(req: Request) {
  const action = (await req.json()) as Action;

  // The owner: everything. The partner: adding what they paid and recording a
  // repayment — the two moves on the shared tab that are theirs. Anyone else: nothing.
  const role = await currentRole();
  if (role !== "owner" && !(role === "partner" && (action.type === "quickadd" || action.type === "settle"))) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const db = await readDb();
  const now = new Date().toISOString();

  switch (action.type) {
    case "rule": {
      // The pattern comes from the transaction, never from the client: the
      // merchant token for known merchants, the counterparty minus per-charge
      // noise otherwise (see rulePattern).
      const tx = db.transactions.find((t) => t.id === action.txId);
      if (!tx || !action.category) return bad("txId and category required");
      const match = rulePattern(tx);
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
      const fraction = Number(action.partnerShare ?? 0.5);
      if (!(fraction > 0 && fraction < 1)) return bad("partnerShare must be between 0 and 1");
      const existing = db.shares.find((s) => s.txId === action.txId);
      if (!existing) {
        db.shares.push({
          id: newId("share"),
          paidBy: "owner",
          txId: action.txId,
          partnerShare: fraction,
          createdAt: now,
        });
        await writeCollection("shares", db.shares);
      } else if (partnerShareOf(existing) !== fraction) {
        // Re-dropping with a different toggle just changes the split.
        existing.partnerShare = fraction;
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
      const fraction = Number(action.partnerShare ?? 0.5);
      if (!(fraction > 0 && fraction < 1)) return bad("partnerShare must be between 0 and 1");
      const category = action.category && db.categories.includes(action.category) ? action.category : undefined;
      db.shares.push({
        id: newId("share"),
        // Whoever is adding paid for it — the partner's card, the owner's cash.
        paidBy: role === "partner" ? "partner" : "owner",
        manual: { date: action.date, description: action.description.trim(), amount, category },
        partnerShare: fraction,
        createdAt: now,
      });
      await writeCollection("shares", db.shares);
      break;
    }
    case "settle": {
      // Sign is direction: positive = the partner paid the owner, negative = the owner paid the partner.
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
      const cleanName = merchantOf(tx, db.merchants).name;
      const match = rulePattern(tx);
      // Aggregators bill many subscriptions under one merchant string —
      // amount-match those so each stays a distinct record.
      const raw = tx.counterparty.toLowerCase();
      const isAggregator = ["apple.com/bill", "google play"].some((a) => raw.includes(a));
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
          expectedAmount: txAmount,
          cadence: inferCadence(
            subscriptionCharges({ match, expectedAmount: txAmount, matchAmount: isAggregator }, db.transactions)
          ),
          active: true,
          createdAt: now,
        });
        await writeCollection("subscriptions", db.subscriptions);
      }
      if (!db.rules.some((r) => r.match === match)) {
        db.rules.push({ id: newId("rule"), match, category: SUBSCRIPTIONS, createdAt: now });
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
    case "cadence": {
      // The guess from one charge can be wrong; the owner says which it is.
      const sub = db.subscriptions.find((s) => s.id === action.subId);
      if (!sub) return bad("unknown subscription");
      if (action.cadence !== "monthly" && action.cadence !== "yearly") return bad("cadence must be monthly or yearly");
      sub.cadence = action.cadence;
      sub.cadenceByHand = true;
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
      const source = action.source === "lhv" ? "lhv" : "lightyear";
      db.snapshots.push({ id: newId("snap"), source, total, holdings, returnPct, at: now });
      await writeCollection("snapshots", db.snapshots);
      break;
    }
    case "category-add": {
      const name = categoryName(action.name);
      if (!name) return bad("a short name is required");
      if (db.categories.some((c) => c.toLowerCase() === name.toLowerCase())) return bad("that category already exists");
      db.categories.push(name);
      await writeCollection("categories", db.categories);
      break;
    }
    case "category-rename": {
      // Everything filed under the old name follows it: rules, hand-filed
      // tiles, quick-added shared expenses.
      const i = db.categories.indexOf(action.from);
      if (i < 0) return bad("unknown category");
      if (FIXED_CATEGORIES.includes(action.from)) return bad(`${action.from} keeps its name`);
      const to = categoryName(action.to);
      if (!to) return bad("a short name is required");
      if (to === action.from) break;
      if (db.categories.some((c, j) => j !== i && c.toLowerCase() === to.toLowerCase())) {
        return bad("that category already exists");
      }
      db.categories[i] = to;
      for (const r of db.rules) if (r.category === action.from) r.category = to;
      for (const o of db.overrides) if (o.category === action.from) o.category = to;
      for (const s of db.shares) if (s.manual?.category === action.from) s.manual.category = to;
      await writeCollection("categories", db.categories);
      await writeCollection("rules", db.rules);
      await writeCollection("overrides", db.overrides);
      await writeCollection("shares", db.shares);
      break;
    }
    case "category-order": {
      // The same names as now, in the order the dialog shows them after a drag.
      const order = Array.isArray(action.order) ? action.order : [];
      const complete =
        order.length === db.categories.length &&
        new Set(order).size === order.length &&
        order.every((c) => db.categories.includes(c));
      if (!complete) return bad("order must list every category once");
      db.categories = order;
      await writeCollection("categories", db.categories);
      break;
    }
    case "merchant": {
      // The owner's identity for a merchant. Applies to every charge the
      // pattern matches, like a rule, and wins over the built-in table. An
      // identity already covering the tile or subscription is edited in place.
      const scope = merchantScope(db, action);
      if (!scope) return bad("unknown tx or subscription");
      const name = String(action.name ?? "").replace(/\s+/g, " ").trim();
      if (!name || name.length > 40) return bad("a short name is required");
      const domain = hostname(action.domain);
      if (domain === null) return bad("the website should look like delice.ee");
      const emoji = String(action.emoji ?? "").trim();
      if (emoji.length > 16) return bad("one emoji is enough");
      const fields = { name, domain: domain || undefined, emoji: emoji || undefined };
      const existing = db.merchants.findLast(scope.covers);
      if (existing) Object.assign(existing, fields);
      else db.merchants.push({ id: newId("mer"), match: scope.pattern, ...fields, createdAt: now });
      await writeCollection("merchants", db.merchants);
      break;
    }
    case "merchant-reset": {
      // Back to the built-in table for this merchant.
      const scope = merchantScope(db, action);
      if (!scope) return bad("unknown tx or subscription");
      db.merchants = db.merchants.filter((m) => !scope.covers(m));
      await writeCollection("merchants", db.merchants);
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

// What an identity edit is about. From a tile: the pattern a rule would use,
// covering any identity that matches the charge. From a subscription row: its
// own pattern, covering identities whose pattern sits inside it (so they apply
// to every charge the subscription matches).
function merchantScope(
  db: Db,
  target: { txId?: string; subId?: string }
): { pattern: string; covers: (m: Merchant) => boolean } | undefined {
  if (target.txId) {
    const tx = db.transactions.find((t) => t.id === target.txId);
    return tx && { pattern: rulePattern(tx), covers: (m) => matches(tx, m.match) };
  }
  if (target.subId) {
    const sub = db.subscriptions.find((s) => s.id === target.subId);
    return sub && { pattern: sub.match, covers: (m) => sub.match.includes(m.match) };
  }
}

// "https://www.delice.ee/menu" → "delice.ee". Empty stays empty; anything
// that does not look like a hostname is null.
function hostname(raw: unknown): string | null {
  const s = String(raw ?? "").trim().toLowerCase();
  if (!s) return "";
  const host = s.replace(/^[a-z]+:\/\//, "").replace(/^www\./, "").split(/[/?#:]/)[0];
  return /^[a-z0-9][a-z0-9.-]{1,60}$/.test(host) && host.includes(".") ? host : null;
}

// A category name as typed on the board: one line, trimmed, short, and not
// one of the two words the feed filter reserves.
function categoryName(raw: unknown): string | null {
  const name = String(raw ?? "").replace(/\s+/g, " ").trim();
  if (!name || name.length > 32) return null;
  if (["uncategorized", "incoming"].includes(name.toLowerCase())) return null;
  return name;
}

function bad(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}
