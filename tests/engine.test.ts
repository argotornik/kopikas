import { test } from "node:test";
import assert from "node:assert/strict";
import {
  balance,
  categoryOf,
  categoryTotals,
  inferCadence,
  matches,
  monthlyBurn,
  monthlySpend,
  recheckCadences,
  recordInvestments,
  renameCategory,
  savedInMonth,
  subscriptionCharges,
  subscriptionStatus,
} from "../lib/engine.ts";
import { db, rule, share, sub, tx } from "./helpers.ts";

test("matches is a case-insensitive substring over counterparty and description", () => {
  const t = tx("2026-09-01", -10, "BOLT.EU/O/2607", "Ride");
  assert.equal(matches(t, "bolt.eu"), true);
  assert.equal(matches(t, "ride"), true);
  assert.equal(matches(t, "wolt"), false);
});

test("categoryOf: override beats rules, newest rule beats older, nothing gives null", () => {
  const t = tx("2026-09-01", -10, "Rimi Eesti Food AS");
  const rules = [rule("rimi", "Groceries", "2026-01-01"), rule("rimi", "Shopping", "2026-02-01")];
  assert.equal(categoryOf(t, rules, []), "Shopping");
  assert.equal(categoryOf(t, rules, [{ txId: t.id, category: "Home" }]), "Home");
  assert.equal(categoryOf(t, [], []), null);
});

test("balance: who paid decides the direction, settlements pay it down", () => {
  const dinner = tx("2026-09-01", -60, "Vapiano");
  const txs = [dinner];
  const halfOwnerPaid = share({ paidBy: "owner", txId: dinner.id });
  assert.equal(balance([halfOwnerPaid], [], txs), 30);
  const thirdPartnerPaid = share({ paidBy: "partner", manual: { date: "2026-09-02", description: "Taxi", amount: 30 }, partnerShare: 1 / 3 });
  // The partner paid 30 and only owes a third of it, so the owner owes 20.
  assert.equal(balance([thirdPartnerPaid], [], txs), -20);
  assert.equal(balance([halfOwnerPaid, thirdPartnerPaid], [{ amount: 10 }], txs), 0);
});

test("monthlySpend is the owner's consumption: savings out, shared at their share, partner-paid at their share", () => {
  const d = db({
    transactions: [
      tx("2026-09-01", -100, "Rimi"),
      tx("2026-09-02", -300, "Lightyear Europe AS"),
      tx("2026-09-03", -40, "Vapiano"),
      tx("2026-09-05", 2000, "Employer"),
      tx("2026-08-30", -50, "Rimi"),
    ],
    rules: [rule("lightyear", "Savings")],
  });
  d.shares.push(share({ paidBy: "owner", txId: d.transactions[2].id, partnerShare: 0.5 }));
  d.shares.push(share({ paidBy: "partner", manual: { date: "2026-09-06", description: "Cinema", amount: 30 }, partnerShare: 0.5 }));
  // 100 + 40 * 0.5 + 30 * 0.5 = 135; Lightyear, income and August stay out.
  assert.equal(monthlySpend(d, "2026-09"), 135);
  assert.equal(savedInMonth(d, "2026-09"), 300);
});

test("categoryTotals buckets the month's outgoings, the unfiled under Uncategorized", () => {
  const d = db({
    transactions: [tx("2026-09-01", -10, "Rimi"), tx("2026-09-02", -5, "Rimi"), tx("2026-09-03", -7, "Mystery"), tx("2026-08-03", -9, "Rimi")],
    rules: [rule("rimi", "Groceries")],
  });
  assert.deepEqual(categoryTotals(d, "2026-09"), { Groceries: 15, Uncategorized: 7 });
});

test("subscriptionCharges: outgoing, matching, amount-matched for aggregators, oldest first", () => {
  const txs = [
    tx("2026-08-05", -9.99, "APPLE.COM/BILL"),
    tx("2026-07-05", -49, "APPLE.COM/BILL"),
    tx("2026-07-06", 9.99, "APPLE.COM/BILL"),
    tx("2026-07-07", -9.99, "Spotify"),
  ];
  const all = subscriptionCharges(sub({ match: "apple.com/bill", expectedAmount: 9.99 }), txs);
  assert.deepEqual(all.map((t) => t.amount), [-49, -9.99]);
  const only = subscriptionCharges(sub({ match: "apple.com/bill", expectedAmount: 9.99, matchAmount: true }), txs);
  assert.deepEqual(only.map((t) => t.amount), [-9.99]);
});

test("inferCadence: median gap decides, the statement text breaks a one-charge tie", () => {
  const monthly = [tx("2026-06-01", -5, "X"), tx("2026-07-01", -5, "X"), tx("2026-08-01", -5, "X")];
  const yearly = [tx("2025-08-01", -50, "X"), tx("2026-08-01", -50, "X")];
  assert.equal(inferCadence(monthly), "monthly");
  assert.equal(inferCadence(yearly), "yearly");
  assert.equal(inferCadence([tx("2026-08-01", -50, "Zone Media", "Domain, aastamaks")]), "yearly");
  assert.equal(inferCadence([tx("2026-08-01", -50, "Zone Media", "Domain")]), "monthly");
  assert.equal(inferCadence([]), "monthly");
});

test("recheckCadences re-measures guesses with two charges and leaves hand-set rows alone", () => {
  const d = db({
    transactions: [tx("2025-09-01", -89, "ZONE MEDIA"), tx("2026-09-01", -89, "ZONE MEDIA"), tx("2026-08-10", -12.99, "NETFLIX")],
    subscriptions: [
      sub({ match: "zone media", expectedAmount: 89, cadence: "monthly" }),
      sub({ id: "byhand", match: "zone media", expectedAmount: 89, cadence: "monthly", cadenceByHand: true }),
      sub({ match: "netflix", expectedAmount: 12.99, cadence: "monthly" }),
    ],
  });
  assert.equal(recheckCadences(d), 1);
  assert.deepEqual(d.subscriptions.map((s) => s.cadence), ["yearly", "monthly", "monthly"]);
});

test("subscriptionStatus: due a cadence after the last charge, quiet half a cadence later, badge on a price move", () => {
  const s = sub({ match: "netflix", expectedAmount: 12.99 });
  const txs = [tx("2026-09-01", -13.99, "NETFLIX.COM")];
  const fresh = subscriptionStatus(s, txs, new Date("2026-09-10"));
  assert.equal(fresh.nextDue, "2026-10-01");
  assert.equal(fresh.priceChanged, true);
  assert.equal(fresh.overdue, false);
  assert.equal(subscriptionStatus(s, txs, new Date("2026-10-17")).overdue, true);
  assert.equal(subscriptionStatus({ ...s, active: false }, txs, new Date("2026-10-17")).overdue, false);
  assert.equal(subscriptionStatus(s, [], new Date("2026-09-10")).nextDue, undefined);
});

test("monthlyBurn: monthly in full, yearly by twelfths, inactive skipped, last charge over expected", () => {
  const txs = [tx("2026-09-01", -13.99, "NETFLIX.COM")];
  const statuses = [
    subscriptionStatus(sub({ match: "netflix", expectedAmount: 12.99 }), txs, new Date("2026-09-10")),
    subscriptionStatus(sub({ match: "zone", expectedAmount: 120, cadence: "yearly" }), txs, new Date("2026-09-10")),
    subscriptionStatus(sub({ match: "old", expectedAmount: 99, active: false }), txs, new Date("2026-09-10")),
  ];
  assert.equal(monthlyBurn(statuses), 23.99);
});

test("recordInvestments keeps one automatic LHV snapshot per day and refreshes it in place", () => {
  const d = db({ snapshots: [{ id: "ly", source: "lightyear", total: 9000, holdings: [], at: "2026-09-20T18:00:00Z" }] });
  let n = 0;
  const id = () => `snap-${++n}`;
  const reading = { total: 1020, returnPct: 5.7, holdings: [{ name: "VWCE", pct: 100 }] };
  assert.equal(recordInvestments(d, reading, "2026-09-21T05:00:00Z", id), true);
  assert.equal(recordInvestments(d, reading, "2026-09-21T06:00:00Z", id), false);
  assert.equal(recordInvestments(d, { ...reading, total: 1030 }, "2026-09-21T07:00:00Z", id), true);
  assert.equal(recordInvestments(d, reading, "2026-09-22T05:00:00Z", id), true);
  const lhv = d.snapshots.filter((s) => s.source === "lhv");
  assert.equal(lhv.length, 2);
  assert.equal(lhv[0].total, 1030);
  assert.equal(lhv[0].at, "2026-09-21T07:00:00Z");
  assert.equal(lhv[0].auto, true);
  assert.equal(d.snapshots[0].id, "ly");
});

test("renameCategory carries rules, hand-filed tiles and quick-added shares along", () => {
  const d = db({
    rules: [rule("rimi", "Groceries"), rule("bolt", "Transport")],
    overrides: [{ txId: "t1", category: "Groceries" }],
    shares: [share({ manual: { date: "2026-09-01", description: "Bread", amount: 5, category: "Groceries" } })],
  });
  renameCategory(d, "Groceries", "Food");
  assert.equal(d.categories.some((c) => c.name === "Food"), true);
  assert.equal(d.categories.some((c) => c.name === "Groceries"), false);
  assert.deepEqual(d.rules.map((r) => r.category), ["Food", "Transport"]);
  assert.equal(d.overrides[0].category, "Food");
  assert.equal(d.shares[0].manual?.category, "Food");
});
