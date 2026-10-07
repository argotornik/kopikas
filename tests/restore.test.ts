import { test } from "node:test";
import assert from "node:assert/strict";
import { restoreRecord } from "../lib/restore.ts";
import { categoryOf } from "../lib/engine.ts";
import { db, rule, share, tx } from "./helpers.ts";

test("a forgotten rule goes back where it was, so newer rules still outrank it", () => {
  const coffee = tx("2026-09-01", -3, "BOLT FOOD");
  const older = rule("bolt", "Transport", "2026-01-01");
  const newer = rule("bolt food", "Eating out", "2026-03-01");
  const d = db({ transactions: [coffee], rules: [newer] });
  assert.equal(restoreRecord(d, "rules", older), null);
  assert.deepEqual(d.rules.map((r) => r.id), [older.id, newer.id]);
  assert.equal(categoryOf(coffee, d.rules, d.overrides), "Eating out");
});

test("restoring twice is harmless", () => {
  const r = rule("rimi", "Groceries");
  const d = db({ rules: [] });
  restoreRecord(d, "rules", r);
  assert.equal(restoreRecord(d, "rules", r), null);
  assert.equal(d.rules.length, 1);
});

test("a rule for a category that has since gone is refused", () => {
  const d = db();
  assert.match(restoreRecord(d, "rules", rule("x", "Holidays")) ?? "", /no longer exists/);
  assert.equal(d.rules.length, 0);
});

test("shares come back with their split; a share for a vanished transaction does not", () => {
  const t = tx("2026-09-02", -40, "RIMI");
  const s = share({ txId: t.id, partnerShare: 1 / 3 });
  const d = db({ transactions: [t] });
  assert.equal(restoreRecord(d, "shares", s), null);
  assert.equal(d.shares[0].partnerShare, 1 / 3);
  assert.match(restoreRecord(db(), "shares", s) ?? "", /gone/);
});

test("manual shares and repayments are checked field by field", () => {
  const d = db();
  const manual = share({ paidBy: "partner", manual: { date: "2026-09-03", description: "Dinner", amount: 54 } });
  assert.equal(restoreRecord(d, "shares", manual), null);
  assert.equal(restoreRecord(d, "shares", { ...manual, id: "s-bad", manual: { date: "yesterday", description: "x", amount: 5 } }), "not a shared expense");
  assert.equal(restoreRecord(d, "settlements", { id: "stl-1", amount: 40.4, date: "2026-09-04", recordedBy: "partner" }), null);
  assert.equal(d.settlements[0].recordedBy, "partner");
  assert.equal(restoreRecord(d, "settlements", { id: "stl-2", amount: 0, date: "2026-09-04" }), "not a repayment");
  assert.equal(restoreRecord(d, "settlements", { id: "stl-3", amount: 5, date: "2026-09-04", recordedBy: "someone" }), "not a repayment");
  assert.equal(restoreRecord(d, "settlements", null), "nothing to restore");
});
