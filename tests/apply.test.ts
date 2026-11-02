import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction } from "../lib/apply.ts";
import { categoryOf } from "../lib/engine.ts";
import { db, tx } from "./helpers.ts";

const NOW = "2026-11-02T10:00:00.000Z";

test("filing with Always teaches the rule and pins the charge, and its Undo takes back both", () => {
  const first = tx("2026-10-03", -12, "Pesumaja Puhas OÜ");
  const second = tx("2026-10-17", -15, "Pesumaja Puhas OÜ");
  const d = db({ transactions: [first, second] });
  const filed = applyAction(d, { type: "override", txId: first.id, category: "Home", always: true }, "owner", NOW);
  assert.ok(filed.ok);
  assert.deepEqual([...filed.changed], ["rules", "overrides"]);
  assert.equal(categoryOf(second, d.rules, d.overrides), "Home");
  assert.ok(filed.undo);
  const undone = applyAction(d, filed.undo, "owner", NOW);
  assert.ok(undone.ok);
  assert.equal(d.rules.length, 0);
  assert.equal(d.overrides.length, 0);
  assert.equal(categoryOf(second, d.rules, d.overrides), null);
});

test("a refused change says why and changes nothing", () => {
  const d = db();
  const result = applyAction(d, { type: "category-add", name: "  " }, "owner", NOW);
  assert.deepEqual(result, { ok: false, error: "a short name is required" });
  assert.equal(d.categories.length, db().categories.length);
});

test("a repayment says who recorded it", () => {
  const d = db();
  const result = applyAction(d, { type: "settle", amount: 20, date: "2026-11-01" }, "partner", NOW);
  assert.ok(result.ok);
  assert.deepEqual([...result.changed], ["settlements"]);
  assert.equal(d.settlements[0].recordedBy, "partner");
});

test("connecting LHV is not a change made in memory", () => {
  const result = applyAction(db(), { type: "set-lhv-token", refreshToken: "x" }, "owner", NOW);
  assert.deepEqual(result, { ok: false, error: "unknown action" });
});
